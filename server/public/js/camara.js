// Cámara del vendedor: vista en vivo, botón "Tomar foto" y análisis con Gemini.
// La cámara solo se abre mientras su panel está visible (no pide permiso en otras pestañas).
(() => {
  const raiz = document.querySelector('[data-camara]');
  if (!raiz) return;

  const video = raiz.querySelector('[data-video]');
  const canvas = raiz.querySelector('[data-canvas]');
  const estado = raiz.querySelector('[data-estado]');
  const boton = raiz.querySelector('[data-tomar]');
  const resultado = raiz.querySelector('[data-resultado]');
  const error = raiz.querySelector('[data-error]');
  const MAX_LADO = 1024;
  let stream = null;

  const mostrarEstado = (texto) => { estado.textContent = texto; estado.hidden = false; };

  async function abrirCamara() {
    if (stream) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      mostrarEstado('Este navegador no permite usar la cámara.');
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      video.srcObject = stream;
      await video.play().catch(() => {});
      estado.hidden = true;
      boton.disabled = false;
    } catch (err) {
      stream = null;
      mostrarEstado(err.name === 'NotAllowedError'
        ? 'Permiso de cámara denegado. Permítelo en el navegador y vuelve a esta pestaña.'
        : 'No se encontró una cámara disponible.');
    }
  }

  function cerrarCamara() {
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    video.srcObject = null;
    boton.disabled = true;
  }

  const mostrarError = (texto) => { error.textContent = texto; error.hidden = false; };
  const limpiarMensajes = () => { error.hidden = true; resultado.hidden = true; };

  function mostrarResultado(datos) {
    raiz.querySelector('[data-r-nombre]').textContent = datos.nombre || 'No identificado';
    raiz.querySelector('[data-r-tipo]').textContent = datos.tipo === 'servicio' ? 'Servicio' : 'Producto';
    raiz.querySelector('[data-r-descripcion]').textContent = datos.descripcion || '';
    raiz.querySelector('[data-r-precio]').textContent = datos.precio != null
      ? `Precio sugerido: $${Number(datos.precio).toFixed(2)}`
      : 'Sin precio sugerido';

    const params = new URLSearchParams({ nuevo: '1', nombre: datos.nombre || '', descripcion: datos.descripcion || '', tipo: datos.tipo || 'producto' });
    if (datos.precio != null) params.set('precio', Number(datos.precio).toFixed(2));
    raiz.querySelector('[data-r-agregar]').href = `/vendedor/inventario?${params}`;
    resultado.hidden = false;
  }

  boton.addEventListener('click', async () => {
    if (!stream || !video.videoWidth) return;
    limpiarMensajes();

    const escala = Math.min(1, MAX_LADO / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * escala);
    canvas.height = Math.round(video.videoHeight * escala);
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const imagen = canvas.toDataURL('image/jpeg', 0.85);

    boton.disabled = true;
    mostrarEstado('Analizando la foto…');
    try {
      const respuesta = await fetch('/vendedor/camara/analizar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ imagen }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.error || 'No pudimos analizar la foto.');
      estado.hidden = true;
      mostrarResultado(datos);
    } catch (err) {
      estado.hidden = true;
      mostrarError(err.message);
    } finally {
      boton.disabled = false;
    }
  });

  // Abre la cámara solo cuando el panel es visible en el deslizador.
  const deslizador = document.querySelector('[data-swipe]');
  const panel = raiz.closest('.panel');
  if (deslizador && panel && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entrada]) => {
      if (entrada.isIntersecting) abrirCamara();
      else cerrarCamara();
    }, { root: deslizador, threshold: 0.6 }).observe(panel);
  } else {
    abrirCamara();
  }
})();
