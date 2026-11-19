const texto = (v) => String(v ?? '').trim();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// RFC mexicano: persona moral (3 letras) o física (4 letras), fecha y homoclave.
const RFC = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

function validarPassword(password, errors) {
  if (password.length < 8) errors.password = 'La contraseña debe tener al menos 8 caracteres.';
  else if (password.length > 72) errors.password = 'Máximo 72 caracteres.';
}

function validarRegistro(tipo, body = {}) {
  const value = {
    nombre: texto(body.nombre),
    email: texto(body.email).toLowerCase(),
    rfc: texto(body.rfc).toUpperCase(),
  };
  const password = String(body.password ?? '');
  const errors = {};

  if (!value.nombre) errors.nombre = tipo === 'vendedor' ? 'La razón social es obligatoria.' : 'El nombre es obligatorio.';
  else if (value.nombre.length > 160) errors.nombre = 'Máximo 160 caracteres.';

  if (!EMAIL.test(value.email)) errors.email = 'Correo no válido.';

  if (tipo === 'vendedor') {
    if (!RFC.test(value.rfc)) errors.rfc = 'RFC no válido (12 o 13 caracteres).';
  }

  validarPassword(password, errors);
  return { value, password, errors, ok: Object.keys(errors).length === 0 };
}

function validarLogin(body = {}) {
  const email = texto(body.email).toLowerCase();
  const password = String(body.password ?? '');
  const errors = {};
  if (!EMAIL.test(email)) errors.email = 'Correo no válido.';
  if (!password) errors.password = 'Escribe tu contraseña.';
  return { value: { email }, password, errors, ok: Object.keys(errors).length === 0 };
}

module.exports = { validarRegistro, validarLogin };
