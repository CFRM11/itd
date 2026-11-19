const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');

// Carga el .env de la raíz del proyecto, sin importar desde dónde se arranque
// (node, npm, nodemon). No pisa variables que ya existan en el entorno.
const ENV_FILE = path.join(__dirname, '..', '.env');
if (fs.existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

// Cliente de Supabase. Usa solo la clave pública; la seguridad de los datos
// la dan las políticas RLS de server/supabase/schema.sql.
const URL_PROYECTO = process.env.SUPABASE_URL;
// Nombre nuevo (publishable) o el clásico (anon); ambos son la clave pública.
const CLAVE_ANON = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!URL_PROYECTO || !CLAVE_ANON) {
  console.warn('[auth] Faltan SUPABASE_URL o SUPABASE_PUBLISHABLE_KEY en .env: el registro e inicio de sesión no funcionarán.');
}

// Con accessToken, las consultas se hacen como ese cliente (RLS aplica).
function cliente(accessToken) {
  if (!URL_PROYECTO || !CLAVE_ANON) throw new Error('Supabase no está configurado');
  return createClient(URL_PROYECTO, CLAVE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {},
  });
}

module.exports = { cliente };
