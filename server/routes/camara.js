const { Router } = require('express');
const { cliente } = require('../supabase');
const { describirProducto, contarProductos, analizarInventario } = require('../gemini');
const { subirFoto } = require('../storage');
const { validarItem } = require('../inventario-validar');

const router = Router();
const IMAGEN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;
const MAX_LOTE = 40;

// Estas rutas responden JSON (no redirigen) porque las llama JavaScript.
function soloVendedor(req, res, next) {
  if (!req.sesion || req.sesion.tipo !== 'vendedor') {
    return res.status(401).json({ error: 'Inicia sesión como vendedor para usar la cámara.' });
  }
  next();
}

function leerFoto(req, res, next) {
  const m = IMAGEN.exec(String(req.body?.imagen ?? ''));
  if (!m) return res.status(422).json({ error: 'La foto no es válida. Intenta de nuevo.' });
  req.foto = { mime: m[1], base64: m[2] };
  next();
}

function responderError(res, err, etiqueta) {
  console.error(`[camara] ${etiqueta}:`, err.message);
  res.status(err.status || 502).json({
    error: err.status ? err.message : 'No pudimos analizar la foto. Intenta de nuevo.',
  });
}

// Alta de producto: la foto describe el artículo (nombre, descripción, tipo y precio sugerido).
router.post('/vendedor/camara/describir', soloVendedor, leerFoto, async (req, res) => {
  try {
    res.json(await describirProducto(req.foto.base64, req.foto.mime));
  } catch (err) {
    responderError(res, err, 'describir');
  }
});

// Pestaña Cámara: cuenta cuántas unidades de cada producto registrado aparecen en la foto.
router.post('/vendedor/camara/comparar', soloVendedor, leerFoto, async (req, res) => {
  try {
    const { data, error } = await cliente(req.sesion.accessToken)
      .from('inventario')
      .select('id, nombre, descripcion, tipo')
      .eq('vendedor_id', req.sesion.id);
    if (error) throw error;
    res.json(await contarProductos(req.foto.base64, req.foto.mime, data));
  } catch (err) {
    responderError(res, err, 'comparar');
  }
});

// Alta por foto: enumera los productos de la foto con su cantidad para que el vendedor los revise.
router.post('/vendedor/camara/inventariar', soloVendedor, leerFoto, async (req, res) => {
  try {
    res.json(await analizarInventario(req.foto.base64, req.foto.mime));
  } catch (err) {
    responderError(res, err, 'inventariar');
  }
});

// Guarda la lista revisada por el vendedor. La foto se sube una sola vez y se usa en todos los artículos.
router.post('/vendedor/inventario/lote', soloVendedor, async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (items.length === 0) return res.status(422).json({ error: 'No hay artículos para guardar.' });
  if (items.length > MAX_LOTE) return res.status(422).json({ error: `Máximo ${MAX_LOTE} artículos por foto.` });

  const filas = [];
  const errores = [];
  items.forEach((it, i) => {
    const { value, errores: e } = validarItem({
      nombre: it.nombre,
      descripcion: it.descripcion,
      precio: String(it.precio ?? ''),
      tipo: it.tipo,
      cantidad: it.cantidad,
    });
    if (e.length) errores.push(`Fila ${i + 1}: ${e.join(' ')}`);
    else filas.push(value);
  });
  if (errores.length) return res.status(422).json({ error: errores.join(' ') });

  try {
    const imagen_url = await subirFoto(req.sesion, req.body.imagen || null);
    const { data, error } = await cliente(req.sesion.accessToken)
      .from('inventario')
      .insert(filas.map((f) => ({
        ...f,
        vendedor_id: req.sesion.id,
        imagen_url,
        imagen_descripcion: imagen_url ? f.nombre : '',
      })))
      .select('id');
    if (error) throw error;
    res.json({ agregados: data.length });
  } catch (err) {
    console.error('[inventario] lote:', err.message);
    res.status(err.status || 500).json({ error: err.message === 'La foto no es válida.' || err.message.startsWith('La foto')
      ? err.message
      : 'No se pudieron guardar los artículos.' });
  }
});

module.exports = router;
