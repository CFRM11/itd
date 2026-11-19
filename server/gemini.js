// Identificación de objetos con la API de Gemini (visión).
// Clave en .env: GEMINI_API_KEY. Modelo opcional: GEMINI_MODEL.
const MODELO = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const TIEMPO_MAX_MS = 30000;

const PROMPT = `Eres el asistente de un vendedor. Mira la foto e identifica el objeto principal que se podría vender.
Responde SOLO con un objeto JSON con estas claves:
- "nombre": nombre corto del objeto en español (máximo 120 caracteres).
- "descripcion": descripción breve en español (máximo 300 caracteres): qué es, color, material, estado visible.
- "tipo": "producto" si es un objeto físico, "servicio" si la foto muestra un servicio.
- "precio_sugerido": precio aproximado en pesos mexicanos como número, o null si no se puede estimar.
Si no se distingue ningún objeto, usa "nombre": "" y explica en "descripcion" qué se ve.`;

function normalizar(obj) {
  const precio = Number(obj.precio_sugerido);
  return {
    nombre: String(obj.nombre ?? '').trim().slice(0, 120),
    descripcion: String(obj.descripcion ?? '').trim().slice(0, 1000),
    tipo: String(obj.tipo ?? '').trim().toLowerCase() === 'servicio' ? 'servicio' : 'producto',
    precio: Number.isFinite(precio) && precio >= 0 ? Math.round(precio * 100) / 100 : null,
  };
}

async function identificarObjeto(base64, mimeType) {
  const clave = process.env.GEMINI_API_KEY;
  if (!clave) {
    const err = new Error('La cámara no está configurada: falta GEMINI_API_KEY en .env.');
    err.status = 503;
    throw err;
  }

  const respuesta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': clave },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(TIEMPO_MAX_MS),
  });

  if (!respuesta.ok) {
    const detalle = (await respuesta.text()).slice(0, 200);
    throw new Error(`Gemini respondió ${respuesta.status}: ${detalle}`);
  }

  const datos = await respuesta.json();
  const texto = (datos.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
  let obj;
  try {
    obj = JSON.parse(texto);
  } catch {
    throw new Error('Gemini devolvió una respuesta que no es JSON.');
  }
  return normalizar(obj);
}

module.exports = { identificarObjeto };
