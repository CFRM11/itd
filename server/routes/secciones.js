// Definición de las secciones principales y sus subrutas.
// Cada subpágina es un panel deslizable; su contenido está en views/<seccion>/<slug>.ejs
// `corto` es la etiqueta de la pestaña (debe caber en móvil).
module.exports = {
  vendedor: {
    titulo: 'Vendedor',
    base: '/vendedor',
    tipo: 'vendedor',
    paginas: [
      { slug: 'perfil', corto: 'Perfil', titulo: 'Mi perfil', descripcion: 'Datos generales del vendedor.' },
      { slug: 'actividad-economica', corto: 'Actividad', titulo: 'Mi actividad económica', descripcion: 'Giro y actividades registradas.' },
      { slug: 'camara', corto: 'Cámara', titulo: 'Cámara', descripcion: 'Información de la cámara.' },
      { slug: 'inventario', corto: 'Inventario', titulo: 'Inventario', descripcion: 'Productos y existencias.' },
    ],
  },
  cliente: {
    titulo: 'Cliente',
    base: '/cliente',
    tipo: 'cliente',
    paginas: [
      { slug: 'compras', corto: 'Compras', titulo: 'Mis compras', descripcion: 'Historial de compras.' },
      { slug: 'reembolsos', corto: 'Reembolsos', titulo: 'Mis reembolsos', descripcion: 'Solicitudes y estado de reembolsos.' },
      { slug: 'cuenta', corto: 'Cuenta', titulo: 'Mi cuenta', descripcion: 'Datos de acceso y preferencias.' },
    ],
  },
};
