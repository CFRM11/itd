const { Router } = require('express');

const api = Router();

// Datos en memoria (sustituir por la capa de datos real: SQLite, Postgres, etc.)
const STATUSES = ['activo', 'pendiente', 'cerrado'];
let nextId = 4;
const items = [
  { id: 1, name: 'Primer elemento', status: 'activo', note: 'Tarjeta pintada desde un <template>.' },
  { id: 2, name: 'Segundo elemento', status: 'pendiente', note: 'El estado se refleja con data-status.' },
  { id: 3, name: 'Tercer elemento', status: 'cerrado', note: 'Sin clases: solo HTML semántico.' },
];

function validate(body = {}) {
  const value = {
    name: String(body.name ?? '').trim(),
    status: String(body.status ?? ''),
    note: String(body.note ?? '').trim(),
  };
  const errors = {};
  if (!value.name) errors.name = 'El nombre es obligatorio.';
  else if (value.name.length > 120) errors.name = 'Máximo 120 caracteres.';
  if (!STATUSES.includes(value.status)) errors.status = 'Elige un estado.';
  return { value, errors, ok: Object.keys(errors).length === 0 };
}

api.get('/health', (req, res) => res.json({ ok: true }));

api.get('/stats', (req, res) => {
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, items.filter((i) => i.status === s).length]));
  res.json({ total: items.length, byStatus });
});

api.get('/items', (req, res) => {
  const q = String(req.query.q ?? '').trim().toLowerCase();
  res.json(q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items);
});

api.get('/items/:id', (req, res) => {
  const item = items.find((i) => i.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'No existe' });
  res.json(item);
});

api.post('/items', (req, res) => {
  const { value, errors, ok } = validate(req.body);
  if (!ok) return res.status(422).json({ errors });
  const item = { id: nextId++, ...value };
  items.push(item);
  res.status(201).json(item);
});

api.put('/items/:id', (req, res) => {
  const item = items.find((i) => i.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'No existe' });
  const { value, errors, ok } = validate(req.body);
  if (!ok) return res.status(422).json({ errors });
  Object.assign(item, value);
  res.json(item);
});

api.delete('/items/:id', (req, res) => {
  const idx = items.findIndex((i) => i.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'No existe' });
  items.splice(idx, 1);
  res.status(204).end();
});

module.exports = api;
