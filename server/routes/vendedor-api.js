const { Router } = require('express');
const { cliente } = require('../supabase');

// API JSON del vendedor para acciones rápidas (sin recargar la página).
const router = Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function soloVendedor(req, res, next) {
  if (!req.sesion || req.sesion.tipo !== 'vendedor') {
    return res.status(401).json({ error: 'Inicia sesión como vendedor.' });
  }
  next();
}

// Cambia la cantidad de un artículo propio (botones + y − del feed).
router.patch('/vendedor/api/items/:id/cantidad', soloVendedor, async (req, res) => {
  const cantidad = Number(req.body?.cantidad);
  if (!UUID.test(req.params.id)) return res.status(422).json({ error: 'Artículo no válido.' });
  if (!Number.isInteger(cantidad) || cantidad < 0 || cantidad > 9999) {
    return res.status(422).json({ error: 'La cantidad debe ser un entero entre 0 y 9999.' });
  }
  try {
    const { data, error } = await cliente(req.sesion.accessToken)
      .from('inventario')
      .update({ cantidad, actualizado: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('vendedor_id', req.sesion.id)
      .select('id, cantidad');
    if (error) throw error;
    if (!data.length) return res.status(404).json({ error: 'No encontramos ese artículo.' });
    res.json(data[0]);
  } catch (err) {
    console.error('[api] cantidad:', err.message);
    res.status(500).json({ error: 'No se pudo actualizar la cantidad.' });
  }
});

module.exports = router;
