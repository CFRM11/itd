const { Router } = require('express');
const { cliente } = require('../supabase');
const { requireAuth } = require('../auth/sesion');
const { subirFoto } = require('../storage');
const { validarItem } = require('../inventario-validar');

const TIPOS = ['producto', 'servicio'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const texto = (v) => String(v ?? '').trim();
const router = Router();

const volver = (res, params) => res.redirect(`/vendedor/inventario?${new URLSearchParams(params)}`);

// Solo cuentas de vendedor llegan aquí (requireAuth). Las consultas van con el token del cliente (RLS).
router.use('/vendedor', requireAuth('vendedor'));

// Las páginas de vendedor pintan todos sus paneles a la vez, así que el inventario
// se carga en cada GET de /vendedor/* (si no, el panel de inventario falla con 500).
router.use('/vendedor', async (req, res, next) => {
  if (req.method !== 'GET') return next();
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

  // Alta desde la cámara de comparación: ?nuevo=1&nombre=...&descripcion=...&tipo=...&precio=...
  const precio = texto(req.query.precio);
  inv.abrirNuevo = req.query.nuevo === '1';
  inv.prefill = {
    nombre: texto(req.query.nombre).slice(0, 120),
    descripcion: texto(req.query.descripcion).slice(0, 1000),
    tipo: TIPOS.includes(texto(req.query.tipo)) ? texto(req.query.tipo) : 'producto',
    precio: /^\d+(\.\d{1,2})?$/.test(precio) ? precio : '',
    cantidad: 1,
  };
  res.locals.inv = inv;
  next();
});

router.post('/vendedor/inventario', async (req, res) => {
  const { value, errores } = validarItem(req.body);
  if (errores.length) return volver(res, { error: errores.join(' ') });

  let imagen_url = null;
  try {
    imagen_url = await subirFoto(req.sesion, req.body.imagen_data);
  } catch (err) {
    return volver(res, { error: err.message });
  }

  const { error } = await cliente(req.sesion.accessToken)
    .from('inventario')
    .insert({
      ...value,
      vendedor_id: req.sesion.id,
      imagen_url,
      imagen_descripcion: imagen_url ? value.nombre : '',
    });
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

  // Sin foto nueva se conserva la imagen que ya tenía el artículo.
  let fotos = {};
  try {
    const imagen_url = await subirFoto(req.sesion, req.body.imagen_data);
    if (imagen_url) fotos = { imagen_url, imagen_descripcion: value.nombre };
  } catch (err) {
    return volver(res, { error: err.message });
  }

  const { data, error } = await cliente(req.sesion.accessToken)
    .from('inventario')
    .update({ ...value, ...fotos, actualizado: new Date().toISOString() })
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
