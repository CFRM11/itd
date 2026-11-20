const app = require('./app');

const PORT = Number(process.env.PORT) || 3000;
// Para probar desde el móvil en la LAN: HOST=0.0.0.0 (y añadir el origen a CORS_ORIGINS)
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  const base = `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`;
  console.log(`Sitio (EJS) en ${base}/  ·  API en ${base}/api`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
