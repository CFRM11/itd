const { Router } = require('express');

// Router de una sección: todas sus subpáginas se pintan como paneles deslizables
// en una sola vista; la ruta solo decide en qué panel se abre.
module.exports = function crearSeccion(key, seccion) {
  const router = Router();

  const render = (index) => (req, res) => {
    const actual = seccion.paginas[index];
    res.render('seccion', { title: actual.titulo, active: key, key, seccion, index, mainClass: 'main-swipe' });
  };

  router.get('/', render(0));
  seccion.paginas.forEach((pagina, i) => router.get(`/${pagina.slug}`, render(i)));

  return router;
};
