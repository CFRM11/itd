const { Router } = require('express');
const { cliente } = require('../supabase');
const { validarRegistro, validarLogin } = require('../auth/validar');
const {
  destinoSeguro, guardarTokens, limpiarTokens, leerCookie, COOKIE_ACCESO, COOKIE_REFRESCO, perfilDe,
} = require('../auth/sesion');

const TIPOS = ['cliente', 'vendedor'];
const INICIO = { cliente: '/cliente/cuenta', vendedor: '/vendedor/perfil' };
const router = Router();

const tipoValido = (req, res, next) => (TIPOS.includes(req.params.tipo) ? next() : next('route'));

function formulario(res, status, { modo, tipo, values = {}, errors = {}, general = '', aviso = '', next = '' }) {
  res.status(status).render('auth/form', {
    title: modo === 'registro' ? 'Crear cuenta' : 'Iniciar sesión',
    active: '', modo, tipo, values, errors, general, aviso, next,
  });
}

// ---------- Registro ----------
router.get('/registro/:tipo', tipoValido, (req, res) => {
  formulario(res, 200, { modo: 'registro', tipo: req.params.tipo, next: destinoSeguro(req.query.next) ?? '' });
});

router.post('/registro/:tipo', tipoValido, async (req, res) => {
  const tipo = req.params.tipo;
  const next = destinoSeguro(req.body.next) ?? '';
  const { value, password, errors, ok } = validarRegistro(tipo, req.body);
  const base = { modo: 'registro', tipo, values: value, next };

  if (ok && tipo === 'vendedor') {
    const { data: libre, error } = await cliente().rpc('rfc_disponible', { rfc_in: value.rfc });
    if (error) return formulario(res, 500, { ...base, general: 'No pudimos verificar el RFC. Intenta de nuevo.' });
    if (!libre) errors.rfc = 'Ese RFC ya está registrado.';
  }
  if (!ok || Object.keys(errors).length) return formulario(res, 422, { ...base, errors });

  const metadata = { tipo, nombre: value.nombre };
  if (tipo === 'vendedor') metadata.rfc = value.rfc;

  const { data, error } = await cliente().auth.signUp({
    email: value.email,
    password,
    options: { data: metadata },
  });

  if (error) {
    if (/already registered/i.test(error.message)) {
      return formulario(res, 422, { ...base, errors: { email: 'Ya existe una cuenta con ese correo.' } });
    }
    return formulario(res, 422, { ...base, general: `No se pudo crear la cuenta: ${error.message}` });
  }

  // Si Supabase exige confirmar el correo, no hay sesión todavía.
  if (!data.session) {
    return formulario(res, 200, {
      modo: 'ingresar', tipo, next,
      aviso: 'Te enviamos un correo para confirmar tu cuenta. Confírmala y luego inicia sesión.',
    });
  }
  guardarTokens(res, data.session);
  res.redirect(next || INICIO[tipo]);
});

// ---------- Inicio de sesión ----------
router.get('/ingresar/:tipo', tipoValido, (req, res) => {
  formulario(res, 200, { modo: 'ingresar', tipo: req.params.tipo, next: destinoSeguro(req.query.next) ?? '' });
});

router.post('/ingresar/:tipo', tipoValido, async (req, res) => {
  const tipo = req.params.tipo;
  const next = destinoSeguro(req.body.next) ?? '';
  const { value, password, errors, ok } = validarLogin(req.body);
  const base = { modo: 'ingresar', tipo, values: value, next };
  if (!ok) return formulario(res, 422, { ...base, errors });

  const { data, error } = await cliente().auth.signInWithPassword({ email: value.email, password });
  if (error) {
    const general = /not confirmed/i.test(error.message)
      ? 'Confirma tu correo antes de iniciar sesión.'
      : 'Correo o contraseña incorrectos.';
    return formulario(res, 422, { ...base, general });
  }

  const perfil = await perfilDe(data.session.access_token, data.user.id);
  if (!perfil || perfil.tipo !== tipo) {
    return formulario(res, 403, {
      ...base,
      general: `Esta cuenta no es de tipo ${tipo === 'vendedor' ? 'vendedor' : 'cliente'}. Entra desde la opción correcta.`,
    });
  }
  guardarTokens(res, data.session);
  res.redirect(next || INICIO[tipo]);
});

// ---------- Cerrar sesión ----------
router.post('/salir', async (req, res) => {
  const acceso = leerCookie(req, COOKIE_ACCESO);
  const refresco = leerCookie(req, COOKIE_REFRESCO);
  if (acceso && refresco) {
    try {
      const db = cliente();
      await db.auth.setSession({ access_token: acceso, refresh_token: refresco });
      await db.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.error('[auth] signOut:', err.message);
    }
  }
  limpiarTokens(res);
  res.redirect('/');
});

module.exports = router;
