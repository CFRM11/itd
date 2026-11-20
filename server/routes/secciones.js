// Definición de las secciones principales y sus subrutas.
// Cada subpágina es una pantalla propia, enlazada directo desde la barra inferior.
// El orden del arreglo define el orden de los iconos en la barra inferior.
module.exports = {
  vendedor: {
    titulo: 'Vendedor',
    base: '/vendedor',
    tipo: 'vendedor',
    paginas: [
      { slug: 'inventario', corto: 'Catálogo', titulo: 'Inventario', descripcion: 'Productos y existencias.' },
      { slug: 'camara', corto: 'Cámara', titulo: 'Cámara', descripcion: 'Información de la cámara.' },
      { slug: 'actividad-economica', corto: 'Análisis', titulo: 'Mi actividad económica', descripcion: 'Giro y actividades registradas.' },
      { slug: 'perfil', corto: 'Usuario', titulo: 'Mi perfil', descripcion: 'Datos generales del vendedor.' },
    ],
  },
};
