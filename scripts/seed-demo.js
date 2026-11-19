// Crea cuentas demo (vendedor y cliente) en Supabase y un inventario de ejemplo para el vendedor.
// Usa la clave secreta (SUPABASE_SECRET_KEY) del .env: NO la uses en el servidor web.
// Las cuentas se crean con el correo ya confirmado: no se envía ningún correo (sin límite de envíos).
// Uso: npm run seed:demo    (es idempotente: si ya existen, no las duplica)

const URL_PROYECTO = process.env.SUPABASE_URL;
const CLAVE_SECRETA = process.env.SUPABASE_SECRET_KEY;
const PASSWORD_DEMO = process.env.DEMO_PASSWORD || 'SnapDemo2026!';

if (!URL_PROYECTO || !CLAVE_SECRETA) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SECRET_KEY en .env');
  process.exit(1);
}

const CABECERAS = { apikey: CLAVE_SECRETA, Authorization: `Bearer ${CLAVE_SECRETA}`, 'content-type': 'application/json' };

const CUENTAS = [
  {
    email: 'vendedor.demo@example.com',
    metadata: { tipo: 'vendedor', nombre: 'Ferretería Demo', rfc: 'DEMO010101AAA' },
  },
  {
    email: 'cliente.demo@example.com',
    metadata: { tipo: 'cliente', nombre: 'Cliente Demo' },
  },
];

const INVENTARIO_DEMO = [
  { nombre: 'Taladro inalámbrico', descripcion: 'Batería de 18 V con dos baterías y maletín.', precio: 1299.0, tipo: 'producto' },
  { nombre: 'Juego de llaves', descripcion: 'Set de 12 llaves combinadas de acero.', precio: 349.5, tipo: 'producto' },
  { nombre: 'Instalación de llaves de agua', descripcion: 'Servicio a domicilio, incluye material básico.', precio: 450.0, tipo: 'servicio' },
];

async function api(ruta, opciones = {}) {
  const respuesta = await fetch(`${URL_PROYECTO}${ruta}`, { ...opciones, headers: { ...CABECERAS, ...opciones.headers } });
  const texto = await respuesta.text();
  let datos = null;
  try { datos = texto ? JSON.parse(texto) : null; } catch { datos = texto; }
  return { status: respuesta.status, datos };
}

async function buscarUsuarioPorCorreo(email) {
  const { datos } = await api(`/auth/v1/admin/users?per_page=1000`);
  return (datos?.users ?? []).find((u) => u.email === email) ?? null;
}

async function crearCuenta({ email, metadata }) {
  const existente = await buscarUsuarioPorCorreo(email);
  if (existente) {
    console.log(`= ya existe: ${email} (${metadata.tipo})`);
    return existente;
  }
  const { status, datos } = await api('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password: PASSWORD_DEMO, email_confirm: true, user_metadata: metadata }),
  });
  if (status !== 200 && status !== 201) throw new Error(`No se pudo crear ${email}: ${status} ${JSON.stringify(datos)}`);
  console.log(`+ creada: ${email} (${metadata.tipo})`);
  return datos;
}

async function sembrarInventario(vendedorId) {
  const { status, datos } = await api(`/rest/v1/inventario?vendedor_id=eq.${vendedorId}&select=id`);
  if (status === 200 && datos.length > 0) {
    console.log(`= el inventario demo ya tiene ${datos.length} artículos`);
    return;
  }
  const filas = INVENTARIO_DEMO.map((f) => ({ ...f, vendedor_id: vendedorId, imagen_url: null, imagen_descripcion: '' }));
  const alta = await api('/rest/v1/inventario', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(filas) });
  if (alta.status !== 201) throw new Error(`No se pudo sembrar el inventario: ${alta.status} ${JSON.stringify(alta.datos)}`);
  console.log(`+ inventario demo: ${filas.length} artículos`);
}

(async () => {
  let vendedor = null;
  for (const cuenta of CUENTAS) {
    const usuario = await crearCuenta(cuenta);
    if (cuenta.metadata.tipo === 'vendedor') vendedor = usuario;
  }
  if (vendedor) await sembrarInventario(vendedor.id);
  console.log(`\nContraseña demo para ambas cuentas: ${PASSWORD_DEMO}`);
  console.log('Entra en /ingresar/vendedor y /ingresar/cliente.');
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
