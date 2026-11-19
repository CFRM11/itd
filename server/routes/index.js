const { Router } = require('express');
const secciones = require('./secciones');
const crearSeccion = require('./seccion');
const authRoutes = require('./auth');
const { requireAuth } = require('../auth/sesion');

const router = Router();

// "/" (root)
router.get('/', (req, res) => {
  res.render('inicio', { title: 'Inicio', active: 'inicio' });
});

// Registro, inicio y cierre de sesión: /registro/:tipo, /ingresar/:tipo, /salir
router.use(authRoutes);

// Inventario de cada vendedor (CRUD). Va antes de las secciones para cargar sus datos.
router.use(require('./inventario'));

// "/vendedor/*" y "/cliente/*": solo para cuentas de su tipo
for (const [key, seccion] of Object.entries(secciones)) {
  router.use(seccion.base, requireAuth(seccion.tipo), crearSeccion(key, seccion));
}

module.exports = router;
