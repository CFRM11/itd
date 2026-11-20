const { Router } = require('express');

// Router de una sección: cada subpágina es su propia pantalla, enlazada
// directo desde la barra inferior (ver partials/nav.ejs).
module.exports = function crearSeccion(key, seccion) {
  const router = Router();

  const render = (pagina) => (req, res) => {
    res.render('seccion', { title: pagina.titulo, active: pagina.slug, key, seccion, pagina, mainClass: 'main-page' });
  };

  router.get('/', render(seccion.paginas[0]));
  seccion.paginas.forEach((pagina) => router.get(`/${pagina.slug}`, render(pagina)));

  return router;
};
