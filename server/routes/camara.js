const { Router } = require('express');
const { identificarObjeto } = require('../gemini');

const router = Router();
const IMAGEN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

// Solo vendedores. Responde JSON (no redirige) porque lo llama JavaScript.
router.post('/vendedor/camara/analizar', async (req, res) => {
  if (!req.sesion || req.sesion.tipo !== 'vendedor') {
    return res.status(401).json({ error: 'Inicia sesión como vendedor para usar la cámara.' });
  }

  const m = IMAGEN.exec(String(req.body?.imagen ?? ''));
  if (!m) return res.status(422).json({ error: 'La foto no es válida. Intenta de nuevo.' });

  try {
    const resultado = await identificarObjeto(m[2], m[1]);
    res.json(resultado);
  } catch (err) {
    console.error('[camara] análisis:', err.message);
    res.status(err.status || 502).json({ error: err.status ? err.message : 'No pudimos analizar la foto. Intenta de nuevo.' });
  }
});

module.exports = router;
