const crypto = require('node:crypto');
const { URL_PROYECTO, CLAVE_PUBLICA } = require('./supabase');

// Fotos de productos en el bucket "productos" (ver server/supabase/storage.sql).
// La subida usa el token del vendedor, así que las políticas RLS de la carpeta del vendedor aplican.
const BUCKET = 'productos';
const IMAGEN = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;
const MAX_FOTO_BYTES = 3 * 1024 * 1024;

// Devuelve la URL pública de la foto, o null si no llegó ninguna foto.
async function subirFoto(sesion, dataUrl) {
  if (!dataUrl) return null;
  const m = IMAGEN.exec(String(dataUrl));
  if (!m) throw new Error('La foto no es válida.');
  const bytes = Buffer.from(m[2], 'base64');
  if (bytes.length > MAX_FOTO_BYTES) throw new Error('La foto es demasiado grande. Intenta de nuevo.');

  const extension = m[1] === 'jpeg' ? 'jpg' : m[1];
  const ruta = `${sesion.id}/${crypto.randomUUID()}.${extension}`;
  const respuesta = await fetch(`${URL_PROYECTO}/storage/v1/object/${BUCKET}/${ruta}`, {
    method: 'POST',
    headers: {
      apikey: CLAVE_PUBLICA,
      Authorization: `Bearer ${sesion.accessToken}`,
      'content-type': `image/${m[1]}`,
      'x-upsert': 'false',
    },
    body: bytes,
  });
  if (!respuesta.ok) {
    console.error('[storage] subida de foto:', respuesta.status, (await respuesta.text()).slice(0, 200));
    throw new Error('No se pudo guardar la foto.');
  }
  return `${URL_PROYECTO}/storage/v1/object/public/${BUCKET}/${ruta}`;
}

module.exports = { subirFoto };
