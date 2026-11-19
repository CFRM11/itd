// Revisión editable de los productos encontrados en una foto (alta por foto).
// Escucha "inventario:analizado" (lo dispara camara.js), muestra una fila por producto
// con nombre, cantidad, precio y tipo editables, y guarda todo en una sola petición.
(() => {
  const dlg = document.getElementById('dlg-revision');
  if (!dlg) return;

  const filas = dlg.querySelector('[data-rev-filas]');
  const mensaje = dlg.querySelector('[data-rev-mensaje]');
  const errorBox = dlg.querySelector('[data-rev-error]');
  const botonGuardar = dlg.querySelector('[data-rev-guardar]');
  let imagen = null;

  const mostrarError = (texto) => { errorBox.textContent = texto; errorBox.hidden = false; };

  function campo(etiqueta, elemento) {
    const label = document.createElement('label');
    const span = document.createElement('span');
    span.textContent = etiqueta;
    label.append(span, elemento);
    return label;
  }

  function entrada(tipo, nombre, valor, extra = {}) {
    const input = document.createElement('input');
    input.type = tipo;
    input.dataset.campo = nombre;
    input.value = valor ?? '';
    Object.assign(input, extra);
    return input;
  }

  function crearFila(it = {}) {
    const fila = document.createElement('div');
    fila.className = 'rev-fila';
    fila.dataset.descripcion = it.descripcion || '';

    const tipo = document.createElement('select');
    tipo.dataset.campo = 'tipo';
    for (const t of ['producto', 'servicio']) {
      const op = document.createElement('option');
      op.value = t;
      op.textContent = t === 'producto' ? 'Producto' : 'Servicio';
      op.selected = (it.tipo || 'producto') === t;
      tipo.append(op);
    }

    const quitar = document.createElement('button');
    quitar.type = 'button';
    quitar.className = 'outline secondary rev-quitar';
    quitar.textContent = 'Quitar';
    quitar.dataset.revQuitar = '';

    fila.append(
      campo('Nombre', entrada('text', 'nombre', it.nombre, { maxLength: 120 })),
      campo('Cantidad', entrada('number', 'cantidad', it.cantidad ?? 1, { min: 0, max: 9999, step: 1 })),
      campo('Precio', entrada('number', 'precio', it.precio ?? 0, { min: 0, step: 0.01 })),
      campo('Tipo', tipo),
      quitar,
    );
    filas.append(fila);
  }

  dlg.querySelector('[data-rev-agregar]').addEventListener('click', () => crearFila({ cantidad: 1, precio: 0 }));

  filas.addEventListener('click', (e) => {
    if (e.target.matches('[data-rev-quitar]')) e.target.closest('.rev-fila').remove();
  });

  document.addEventListener('inventario:analizado', (e) => {
    const { items = [], mensaje: texto = '', imagen: foto } = e.detail;
    imagen = foto;
    filas.replaceChildren();
    errorBox.hidden = true;
    mensaje.textContent = items.length
      ? (texto || `Encontré ${items.length} tipo(s) de producto. Revisa y corrige antes de guardar.`)
      : (texto || 'No encontré productos en la foto. Agrega filas a mano.');
    items.forEach(crearFila);
    if (!items.length) crearFila({ cantidad: 1, precio: 0 });
    dlg.showModal();
  });

  botonGuardar.addEventListener('click', async () => {
    errorBox.hidden = true;
    const items = [...filas.querySelectorAll('.rev-fila')].map((f) => ({
      nombre: f.querySelector('[data-campo="nombre"]').value,
      cantidad: f.querySelector('[data-campo="cantidad"]').value,
      precio: f.querySelector('[data-campo="precio"]').value,
      tipo: f.querySelector('[data-campo="tipo"]').value,
      descripcion: f.dataset.descripcion,
    }));
    if (items.length === 0) return mostrarError('Agrega al menos un artículo.');

    botonGuardar.disabled = true;
    try {
      const respuesta = await fetch('/vendedor/inventario/lote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ items, imagen }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.error || 'No se pudieron guardar los artículos.');
      location.href = `/vendedor/inventario?aviso=${encodeURIComponent(`Se agregaron ${datos.agregados} artículo(s).`)}`;
    } catch (err) {
      mostrarError(err.message);
      botonGuardar.disabled = false;
    }
  });
})();
