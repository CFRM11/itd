// Datos en memoria para las vistas EJS (sustituir por la base de datos real).
let nextAlumnoId = 4;
const alumnos = [
  { id: 1, nombre: 'Ana López', matricula: 'A001', carrera: 'Sistemas', semestre: 3 },
  { id: 2, nombre: 'Carlos Pérez', matricula: 'A002', carrera: 'Industrial', semestre: 5 },
  { id: 3, nombre: 'María Gómez', matricula: 'A003', carrera: 'Gestión', semestre: 1 },
];

let nextVendedorId = 4;
const vendedores = [
  { id: 1, nombre: 'Luis Ramírez', email: 'luis@ejemplo.com', zona: 'Norte', ventas: 15200 },
  { id: 2, nombre: 'Sofía Torres', email: 'sofia@ejemplo.com', zona: 'Centro', ventas: 22850 },
  { id: 3, nombre: 'Jorge Díaz', email: 'jorge@ejemplo.com', zona: 'Sur', ventas: 9400 },
];

const texto = (v) => String(v ?? '').trim();

function validarAlumno(body = {}) {
  const value = {
    nombre: texto(body.nombre),
    matricula: texto(body.matricula).toUpperCase(),
    carrera: texto(body.carrera),
    semestre: Number(body.semestre),
  };
  const errors = {};
  if (!value.nombre) errors.nombre = 'El nombre es obligatorio.';
  if (!value.matricula) errors.matricula = 'La matrícula es obligatoria.';
  else if (alumnos.some((a) => a.matricula === value.matricula)) errors.matricula = 'Esa matrícula ya existe.';
  if (!value.carrera) errors.carrera = 'La carrera es obligatoria.';
  if (!Number.isInteger(value.semestre) || value.semestre < 1 || value.semestre > 12)
    errors.semestre = 'Semestre entre 1 y 12.';
  return { value, errors, ok: Object.keys(errors).length === 0 };
}

function validarVendedor(body = {}) {
  const value = {
    nombre: texto(body.nombre),
    email: texto(body.email).toLowerCase(),
    zona: texto(body.zona),
    ventas: Number(body.ventas || 0),
  };
  const errors = {};
  if (!value.nombre) errors.nombre = 'El nombre es obligatorio.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) errors.email = 'Correo no válido.';
  if (!value.zona) errors.zona = 'La zona es obligatoria.';
  if (!Number.isFinite(value.ventas) || value.ventas < 0) errors.ventas = 'Las ventas deben ser ≥ 0.';
  return { value, errors, ok: Object.keys(errors).length === 0 };
}

module.exports = {
  alumnos,
  vendedores,
  validarAlumno,
  validarVendedor,
  agregarAlumno: (a) => { const n = { id: nextAlumnoId++, ...a }; alumnos.push(n); return n; },
  agregarVendedor: (v) => { const n = { id: nextVendedorId++, ...v }; vendedores.push(n); return n; },
};
