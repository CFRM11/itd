const { Router } = require('express');
const db = require('./data');

const pages = Router();

const filtrar = (lista, q, campos) => {
  const t = String(q ?? '').trim().toLowerCase();
  return t ? lista.filter((x) => campos.some((c) => String(x[c]).toLowerCase().includes(t))) : lista;
};

// ---------- Inicio ----------
pages.get('/', (req, res) => {
  const totalVentas = db.vendedores.reduce((s, v) => s + v.ventas, 0);
  res.render('inicio', {
    title: 'Inicio',
    active: 'inicio',
    stats: { alumnos: db.alumnos.length, vendedores: db.vendedores.length, totalVentas },
  });
});

// ---------- Alumnos ----------
pages.get('/alumnos', (req, res) => {
  res.render('alumnos/index', {
    title: 'Alumnos',
    active: 'alumnos',
    q: req.query.q ?? '',
    alumnos: filtrar(db.alumnos, req.query.q, ['nombre', 'matricula', 'carrera']),
    creado: req.query.creado,
  });
});

pages.get('/alumnos/nuevo', (req, res) => {
  res.render('alumnos/form', { title: 'Nuevo alumno', active: 'alumnos', values: {}, errors: {} });
});

pages.post('/alumnos', (req, res) => {
  const { value, errors, ok } = db.validarAlumno(req.body);
  if (!ok) {
    return res.status(422).render('alumnos/form', { title: 'Nuevo alumno', active: 'alumnos', values: req.body, errors });
  }
  const a = db.agregarAlumno(value);
  res.redirect(303, `/alumnos?creado=${encodeURIComponent(a.nombre)}`);
});

// ---------- Vendedor ----------
pages.get('/vendedor', (req, res) => {
  res.render('vendedor/index', {
    title: 'Vendedores',
    active: 'vendedor',
    q: req.query.q ?? '',
    vendedores: filtrar(db.vendedores, req.query.q, ['nombre', 'email', 'zona']),
    creado: req.query.creado,
  });
});

pages.get('/vendedor/nuevo', (req, res) => {
  res.render('vendedor/form', { title: 'Nuevo vendedor', active: 'vendedor', values: {}, errors: {} });
});

pages.get('/vendedor/:id', (req, res, next) => {
  const vendedor = db.vendedores.find((v) => v.id === Number(req.params.id));
  if (!vendedor) return next();
  res.render('vendedor/detalle', { title: vendedor.nombre, active: 'vendedor', vendedor });
});

pages.post('/vendedor', (req, res) => {
  const { value, errors, ok } = db.validarVendedor(req.body);
  if (!ok) {
    return res.status(422).render('vendedor/form', { title: 'Nuevo vendedor', active: 'vendedor', values: req.body, errors });
  }
  const v = db.agregarVendedor(value);
  res.redirect(303, `/vendedor?creado=${encodeURIComponent(v.nombre)}`);
});

module.exports = pages;
