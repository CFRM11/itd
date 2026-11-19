// Visión con la API de Gemini: describir un producto y contar productos registrados.
// Clave en .env: GEMINI_API_KEY. Modelo opcional: GEMINI_MODEL.
const MODELO = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const TIEMPO_MAX_MS = 30000;

// Llamada a Gemini con una imagen y un prompt; devuelve el JSON ya parseado.
async function llamarGemini(prompt, base64, mimeType) {
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
          { text: prompt },
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
  try {
    return JSON.parse(texto);
  } catch {
    throw new Error('Gemini devolvió una respuesta que no es JSON.');
  }
}

// Describe el producto de la foto para llenar el formulario de alta.
const PROMPT_DESCRIBIR = `Eres el asistente de un vendedor. Mira la foto e identifica el objeto principal que se podría vender.
Responde SOLO con un objeto JSON con estas claves:
- "nombre": nombre corto del objeto en español (máximo 120 caracteres).
- "descripcion": descripción breve en español (máximo 300 caracteres): qué es, color, material, estado visible.
- "tipo": "producto" si es un objeto físico, "servicio" si la foto muestra un servicio.
- "precio_sugerido": precio aproximado en pesos mexicanos como número, o null si no se puede estimar.
Si no se distingue ningún objeto, usa "nombre": "" y explica en "descripcion" qué se ve.`;

async function describirProducto(base64, mimeType) {
  const obj = await llamarGemini(PROMPT_DESCRIBIR, base64, mimeType);
  const nombre = String(obj.nombre ?? '').trim().slice(0, 120);
  // Sin nombre no hay objeto identificado: no sugerimos precio ni tipo.
  const precio = nombre ? Number(obj.precio_sugerido) : NaN;
  return {
    nombre,
    descripcion: String(obj.descripcion ?? '').trim().slice(0, 1000),
    tipo: String(obj.tipo ?? '').trim().toLowerCase() === 'servicio' ? 'servicio' : 'producto',
    precio: Number.isFinite(precio) && precio >= 0 ? Math.round(precio * 100) / 100 : null,
  };
}

// Compara la foto con los productos registrados del vendedor.
// Devuelve cuántas unidades de cada producto aparecen y un mensaje para el vendedor.
async function contarProductos(base64, mimeType, productos) {
  if (productos.length === 0) {
    return { conteo: [], mensaje: 'Aún no tienes productos registrados. Agrega productos en Inventario para poder contarlos.' };
  }

  const lista = productos
    .map((p) => `- id: ${p.id} | nombre: ${p.nombre} | descripción: ${p.descripcion || 'sin descripción'} | tipo: ${p.tipo}`)
    .join('\n');
  const prompt = `Eres el asistente de inventario de un vendedor. Estos son sus productos registrados:
${lista}

Mira la foto y cuenta cuántas unidades de cada producto registrado aparecen en ella.
Usa solo los ids de la lista. Un producto que no aparece debe tener cantidad 0.
Responde SOLO con un objeto JSON con esta forma:
{"conteo":[{"id":"<id de la lista>","cantidad":<número entero>}],"mensaje":"<texto breve en español: qué se ve, el conteo y, si hay objetos que no están registrados, dilo>"}`;

  const obj = await llamarGemini(prompt, base64, mimeType);
  const porId = new Map(productos.map((p) => [p.id, p]));
  const conteo = (Array.isArray(obj.conteo) ? obj.conteo : [])
    .filter((c) => porId.has(String(c.id)))
    .map((c) => ({
      id: String(c.id),
      nombre: porId.get(String(c.id)).nombre,
      cantidad: Math.min(999, Math.max(0, Math.round(Number(c.cantidad) || 0))),
    }));
  return { conteo, mensaje: String(obj.mensaje ?? '').trim().slice(0, 600) };
}

// Analiza la foto y enumera cada producto distinto con cuántas unidades aparecen.
// Pensado para el alta por foto: el vendedor revisa y corrige la lista antes de guardar.
const PROMPT_INVENTARIO = `Eres el asistente de inventario de un vendedor. Mira la foto y enumera cada tipo de producto distinto que se ve.
Responde SOLO con un objeto JSON con esta forma:
{"items":[{"nombre":"<nombre corto en español>","descripcion":"<descripción breve: color, material, tamaño>","tipo":"producto" o "servicio","cantidad":<unidades que se ven, entero>,"precio_sugerido":<precio aproximado en pesos mexicanos o null>}],"mensaje":"<texto breve en español sobre lo que se ve>"}
Agrupa los objetos iguales en un solo item con su cantidad. Si no ves productos, responde {"items":[],"mensaje":"..."}.`;

async function analizarInventario(base64, mimeType) {
  const obj = await llamarGemini(PROMPT_INVENTARIO, base64, mimeType);
  const items = (Array.isArray(obj.items) ? obj.items : []).slice(0, 40).map((it) => {
    const precio = Number(it.precio_sugerido);
    return {
      nombre: String(it.nombre ?? '').trim().slice(0, 120),
      descripcion: String(it.descripcion ?? '').trim().slice(0, 1000),
      tipo: String(it.tipo ?? '').trim().toLowerCase() === 'servicio' ? 'servicio' : 'producto',
      cantidad: Math.min(9999, Math.max(1, Math.round(Number(it.cantidad) || 1))),
      precio: Number.isFinite(precio) && precio >= 0 ? Math.round(precio * 100) / 100 : 0,
    };
  }).filter((it) => it.nombre);
  return { items, mensaje: String(obj.mensaje ?? '').trim().slice(0, 600) };
}

module.exports = { describirProducto, contarProductos, analizarInventario };
