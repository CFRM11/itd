const { Router } = require('express');
const { cliente } = require('../supabase');
const { requireAuth } = require('../auth/sesion');

const TIPOS = ['producto', 'servicio'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const texto = (v) => String(v ?? '').trim();
const router = Router();

function validarItem(body = {}) {
  const value = {
    nombre: texto(body.nombre),
    descripcion: texto(body.descripcion),
    imagen_url: texto(body.imagen_url) || null,
    imagen_descripcion: texto(body.imagen_descripcion),
    precio: Number(body.precio),
    tipo: texto(body.tipo),
  };
  const errores = [];
  if (!value.nombre || value.nombre.length > 120) errores.push('El nombre es obligatorio (máximo 120 caracteres).');
  if (value.descripcion.length > 1000) errores.push('La descripción no puede pasar de 1000 caracteres.');
  if (value.imagen_url && (!/^https?:\/\/\S+$/i.test(value.imagen_url) || value.imagen_url.length > 2048)) {
    errores.push('La URL de la imagen debe empezar con http:// o https://.');
  }
  if (value.imagen_descripcion.length > 200) errores.push('La descripción de la imagen no puede pasar de 200 caracteres.');
  if (!/^\d+(\.\d{1,2})?$/.test(texto(body.precio)) || value.precio > 9999999999) {
    errores.push('El precio debe ser un número mayor o igual a 0, con hasta 2 decimales.');
  }
  if (!TIPOS.includes(value.tipo)) errores.push('Elige un tipo: producto o servicio.');
  return { value, errores };
}

const volver = (res, params) => res.redirect(`/vendedor/inventario?${new URLSearchParams(params)}`);

// Solo cuentas de vendedor llegan aquí (requireAuth). Las consultas van con el token del cliente (RLS).
router.use('/vendedor/inventario', requireAuth('vendedor'));

// Carga los artículos del vendedor y deja que la sección pinte la página.
router.get('/vendedor/inventario', async (req, res, next) => {
  const inv = { items: [], error: '', aviso: '' };
  try {
    const { data, error } = await cliente(req.sesion.accessToken)
      .from('inventario')
      .select('*')
      .eq('vendedor_id', req.sesion.id)
      .order('creado', { ascending: false });
    if (error) throw error;
    inv.items = data;
  } catch (err) {
    console.error('[inventario] carga:', err.message);
    inv.error = 'No pudimos cargar tu inventario. Intenta de nuevo.';
  }
  inv.aviso = texto(req.query.aviso);
  inv.error = texto(req.query.error) || inv.error;
  res.locals.inv = inv;
  next();
});

router.post('/vendedor/inventario', async (req, res) => {
  const { value, errores } = validarItem(req.body);
  if (errores.length) return volver(res, { error: errores.join(' ') });

  const { error } = await cliente(req.sesion.accessToken)
    .from('inventario')
    .insert({ ...value, vendedor_id: req.sesion.id });
  if (error) {
    console.error('[inventario] alta:', error.message);
    return volver(res, { error: 'No se pudo guardar el artículo.' });
  }
  volver(res, { aviso: 'Artículo agregado.' });
});

router.post('/vendedor/inventario/:id', async (req, res) => {
  if (!UUID.test(req.params.id)) return volver(res, { error: 'Artículo no válido.' });
  const { value, errores } = validarItem(req.body);
  if (errores.length) return volver(res, { error: errores.join(' ') });

  const { data, error } = await cliente(req.sesion.accessToken)
    .from('inventario')
    .update({ ...value, actualizado: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('vendedor_id', req.sesion.id)
    .select('id');
  if (error) {
    console.error('[inventario] edición:', error.message);
    return volver(res, { error: 'No se pudo guardar el cambio.' });
  }
  if (!data.length) return volver(res, { error: 'No encontramos ese artículo en tu inventario.' });
  volver(res, { aviso: 'Cambios guardados.' });
});

router.post('/vendedor/inventario/:id/eliminar', async (req, res) => {
  if (!UUID.test(req.params.id)) return volver(res, { error: 'Artículo no válido.' });
  const { data, error } = await cliente(req.sesion.accessToken)
    .from('inventario')
    .delete()
    .eq('id', req.params.id)
    .eq('vendedor_id', req.sesion.id)
    .select('id');
  if (error) {
    console.error('[inventario] baja:', error.message);
    return volver(res, { error: 'No se pudo eliminar el artículo.' });
  }
  if (!data.length) return volver(res, { error: 'No encontramos ese artículo en tu inventario.' });
  volver(res, { aviso: 'Artículo eliminado.' });
});

module.exports = router;
