const TIPOS = ['producto', 'servicio'];
const texto = (v) => String(v ?? '').trim();

// Validación de un artículo (alta, edición y lote desde foto).
function validarItem(body = {}) {
  const value = {
    nombre: texto(body.nombre),
    descripcion: texto(body.descripcion),
    precio: Number(body.precio),
    tipo: texto(body.tipo),
    cantidad: body.cantidad === undefined || texto(body.cantidad) === '' ? 1 : Number(body.cantidad),
  };
  const errores = [];
  if (!value.nombre || value.nombre.length > 120) errores.push('El nombre es obligatorio (máximo 120 caracteres).');
  if (value.descripcion.length > 1000) errores.push('La descripción no puede pasar de 1000 caracteres.');
  if (!/^\d+(\.\d{1,2})?$/.test(texto(body.precio)) || value.precio > 9999999999) {
    errores.push('El precio debe ser un número mayor o igual a 0, con hasta 2 decimales.');
  }
  if (!TIPOS.includes(value.tipo)) errores.push('Elige un tipo: producto o servicio.');
  if (!Number.isInteger(value.cantidad) || value.cantidad < 0 || value.cantidad > 9999) {
    errores.push('La cantidad debe ser un número entero entre 0 y 9999.');
  }
  return { value, errores };
}

module.exports = { validarItem };
