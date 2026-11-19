// Feed de inventario estilo "vertical": filtros, cantidad con + y − al instante y avisos flotantes.
(() => {
  const feed = document.querySelector('[data-feed]');
  if (!feed) return;

  const toastEl = feed.querySelector('[data-toast]');
  const slides = [...feed.querySelectorAll('.slide')];
  const contadorTodos = feed.querySelector('[data-contador-todos]');
  let temporizador = null;

  function toast(texto, tipo = 'ok') {
    toastEl.textContent = texto;
    toastEl.dataset.tipo = tipo;
    toastEl.hidden = false;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => { toastEl.hidden = true; }, 2200);
  }

  const vibrar = () => navigator.vibrate?.(10);

  // Avisos que llegan tras guardar (redirección con ?aviso= o ?error=)
  if (feed.dataset.error) toast(feed.dataset.error, 'error');
  else if (feed.dataset.aviso) toast(feed.dataset.aviso);

  // Filtros por tipo
  feed.querySelectorAll('[data-filtro]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const tipo = chip.dataset.filtro;
      feed.querySelectorAll('[data-filtro]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      let visibles = 0;
      for (const s of slides) {
        const mostrar = tipo === 'todos' || s.dataset.tipo === tipo;
        s.hidden = !mostrar;
        if (mostrar) visibles += 1;
      }
      if (contadorTodos) contadorTodos.textContent = String(visibles);
      feed.querySelector('.feed-lista')?.scrollTo({ top: 0 });
      vibrar();
    });
  });

  // Cantidad: se muestra al instante y se guarda en segundo plano; si falla, vuelve atrás.
  feed.addEventListener('click', async (e) => {
    const boton = e.target.closest('[data-cant]');
    if (!boton) return;
    const slide = boton.closest('.slide');
    const salida = slide.querySelector('[data-cant-valor]');
    if (slide.dataset.ocupado === '1') return;

    const anterior = Number(salida.textContent);
    const nueva = Math.max(0, anterior + Number(boton.dataset.cant));
    if (nueva === anterior) return;

    salida.textContent = String(nueva);
    salida.classList.remove('rebote');
    void salida.offsetWidth;
    salida.classList.add('rebote');
    vibrar();

    slide.dataset.ocupado = '1';
    try {
      const respuesta = await fetch(`/vendedor/api/items/${slide.dataset.id}/cantidad`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ cantidad: nueva }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.error || 'No se pudo guardar la cantidad.');
      salida.textContent = String(datos.cantidad);
    } catch (err) {
      salida.textContent = String(anterior);
      toast(err.message, 'error');
    } finally {
      delete slide.dataset.ocupado;
    }
  });
})();
