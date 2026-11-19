const path = require('node:path');
const express = require('express');

// Orígenes que pueden consumir la API:
//  - http://localhost:5173           -> frontend en el navegador (npm run dev:web)
//  - http://tauri.localhost          -> app Tauri en Windows/Android
//  - tauri://localhost               -> app Tauri en macOS/Linux/iOS
// En producción: CORS_ORIGINS="https://mi-app.com,http://tauri.localhost,tauri://localhost"
const ALLOWED = new Set(
  (process.env.CORS_ORIGINS ||
    'http://localhost:5173,http://127.0.0.1:5173,http://tauri.localhost,https://tauri.localhost,tauri://localhost')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
);

const app = express();
app.disable('x-powered-by');

// ---------- Motor de plantillas EJS ----------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.locals.siteName = 'snapCart';
app.locals.secciones = require('./routes/secciones');

// ---------- Archivos estáticos ----------
// Pico CSS servido directamente desde node_modules
app.use('/vendor/pico', express.static(path.dirname(require.resolve('@picocss/pico/css/pico.min.css'))));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  const origin = req.get('Origin');
  if (origin && ALLOWED.has(origin)) {
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Max-Age': '600',
      Vary: 'Origin',
    });
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

app.use(require('./auth/sesion').cargarSesion);

app.use('/api', require('./api'));
app.use('/', require('./routes'));

const isApi = (req) => req.path.startsWith('/api');

app.use((req, res) => {
  if (isApi(req)) return res.status(404).json({ error: 'Recurso no encontrado' });
  res.status(404).render('error', { title: 'No encontrado', active: '', status: 404, message: 'La página que buscas no existe.' });
});

app.use((err, req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  const message = err.expose ? err.message : 'Error interno';
  if (isApi(req)) return res.status(status).json({ error: message });
  res.status(status).render('error', { title: 'Error', active: '', status, message });
});

module.exports = app;
