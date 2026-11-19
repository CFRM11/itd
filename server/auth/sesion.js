const { cliente } = require('../supabase');

// Los tokens de Supabase viajan en cookies HttpOnly (no accesibles desde JavaScript).
const COOKIE_ACCESO = 'snapcart_at';
const COOKIE_REFRESCO = 'snapcart_rt';
const DIAS_REFRESCO = 30;
const SEGURO = process.env.NODE_ENV === 'production' ? '; Secure' : '';

function leerCookie(req, nombre) {
  const cabecera = req.get('Cookie') || '';
  for (const parte of cabecera.split(';')) {
    const i = parte.indexOf('=');
    if (i > -1 && parte.slice(0, i).trim() === nombre) return parte.slice(i + 1).trim();
  }
  return null;
}

const serializar = (nombre, valor, maxAge) =>
  `${nombre}=${valor}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${SEGURO}`;

function guardarTokens(res, session) {
  res.append('Set-Cookie', serializar(COOKIE_ACCESO, session.access_token, session.expires_in || 3600));
  res.append('Set-Cookie', serializar(COOKIE_REFRESCO, session.refresh_token, DIAS_REFRESCO * 24 * 3600));
}

function limpiarTokens(res) {
  res.append('Set-Cookie', serializar(COOKIE_ACCESO, '', 0));
  res.append('Set-Cookie', serializar(COOKIE_REFRESCO, '', 0));
}

// Busca el perfil del cliente: primero vendedor, luego clientes (RLS: solo ve su propia fila).
async function perfilDe(accessToken, id) {
  const db = cliente(accessToken);
  const emp = await db.from('vendedores').select('nombre, email').eq('id', id).maybeSingle();
  if (emp.data) return { tipo: 'vendedor', nombre: emp.data.nombre, email: emp.data.email };
  const usr = await db.from('clientes').select('nombre, email').eq('id', id).maybeSingle();
  if (usr.data) return { tipo: 'cliente', nombre: usr.data.nombre, email: usr.data.email };
  return null;
}

async function resolverSesion(req, res) {
  const acceso = leerCookie(req, COOKIE_ACCESO);
  const refresco = leerCookie(req, COOKIE_REFRESCO);
  if (!acceso && !refresco) return null;

  let token = acceso;
  let cuentaAuth = null;
  if (acceso) {
    const { data, error } = await cliente().auth.getUser(acceso);
    if (!error && data.user) cuentaAuth = data.user;
  }
  if (!cuentaAuth && refresco) {
    const { data, error } = await cliente().auth.refreshSession({ refresh_token: refresco });
    if (error || !data.session) {
      limpiarTokens(res);
      return null;
    }
    guardarTokens(res, data.session);
    token = data.session.access_token;
    cuentaAuth = data.session.user;
  }
  if (!cuentaAuth) return null;

  const perfil = await perfilDe(token, cuentaAuth.id);
  if (!perfil) return null;
  return { ...perfil, id: cuentaAuth.id, accessToken: token };
}

// Middleware: deja la sesión en req.sesion y res.locals.sesion (para las plantillas).
async function cargarSesion(req, res, next) {
  req.sesion = null;
  res.locals.sesion = null;
  try {
    req.sesion = await resolverSesion(req, res);
  } catch (err) {
    console.error('[auth] No se pudo leer la sesión:', err.message);
  }
  res.locals.sesion = req.sesion;
  next();
}

// Exige sesión del tipo indicado ('cliente' | 'vendedor').
function requireAuth(tipo) {
  return (req, res, next) => {
    if (!req.sesion) {
      return res.redirect(`/ingresar/${tipo}?next=${encodeURIComponent(req.originalUrl)}`);
    }
    if (req.sesion.tipo !== tipo) {
      return res.status(403).render('error', {
        title: 'Acceso denegado', active: '', status: 403,
        message: `Esta sección es solo para cuentas de ${tipo === 'vendedor' ? 'vendedor' : 'cliente'}.`,
      });
    }
    next();
  };
}

// Solo rutas relativas internas (evita redirecciones abiertas a otros sitios).
function destinoSeguro(valor) {
  const v = String(valor ?? '');
  return v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/\\') ? v : null;
}

module.exports = {
  cargarSesion,
  requireAuth,
  destinoSeguro,
  guardarTokens,
  limpiarTokens,
  leerCookie,
  COOKIE_ACCESO,
  COOKIE_REFRESCO,
  perfilDe,
};
