// Cámara del vendedor. Dos modos según data-modo en el elemento [data-camara]:
//  - "comparar": pestaña Cámara. La foto se compara con los productos registrados y muestra el conteo.
//  - "describir": alta de producto dentro del inventario. La foto llena nombre, descripción, tipo y precio,
//    y se guarda como imagen del artículo al guardar el formulario.
// La cámara se enciende al mostrar el panel (o la hoja) y se apaga al ocultarlo; también hay botón "Activar cámara".
(() => {
  const MAX_LADO = 1024;

  function montar(raiz) {
    const modo = raiz.dataset.modo || 'comparar';
    const video = raiz.querySelector('[data-video]');
    const canvas = raiz.querySelector('[data-canvas]');
    const estado = raiz.querySelector('[data-estado]');
    const botonTomar = raiz.querySelector('[data-tomar]');
    const botonActivar = raiz.querySelector('[data-activar]');
    const errorBox = raiz.querySelector('[data-error]');
    const resultado = raiz.querySelector('[data-resultado]');
    const formulario = raiz.closest('form');
    let stream = null;
    let ocupado = false;

    const mostrarEstado = (texto) => { estado.textContent = texto; estado.hidden = false; };
    const mostrarError = (texto) => { errorBox.textContent = texto; errorBox.hidden = false; };
    const limpiarMensajes = () => { errorBox.hidden = true; if (resultado) resultado.hidden = true; };

    async function abrir() {
      if (stream) return;
      if (!navigator.mediaDevices?.getUserMedia) {
        mostrarEstado('Este navegador no permite usar la cámara.');
        return;
      }
      mostrarEstado('Abriendo cámara… acepta el permiso si el navegador lo pide.');
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        video.srcObject = stream;
        await video.play().catch(() => {});
        estado.hidden = true;
        botonTomar.disabled = false;
        if (botonActivar) botonActivar.hidden = true;
      } catch (err) {
        stream = null;
        if (botonActivar) botonActivar.hidden = false;
        const motivo = {
          NotAllowedError: 'Permiso de cámara denegado. Permítelo en el candado de la barra de direcciones y pulsa Activar cámara.',
          NotFoundError: 'No se encontró una cámara conectada.',
          NotReadableError: 'La cámara está en uso por otra aplicación.',
        }[err.name] || `No se pudo abrir la cámara (${err.name || err.message}).`;
        mostrarEstado(motivo);
      }
    }

    function cerrar() {
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      video.srcObject = null;
      botonTomar.disabled = true;
    }

    function capturarDataUrl() {
      const escala = Math.min(1, MAX_LADO / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.round(video.videoWidth * escala);
      canvas.height = Math.round(video.videoHeight * escala);
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.85);
    }

    async function enviar(ruta, imagen) {
      const respuesta = await fetch(ruta, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ imagen }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.error || 'No pudimos analizar la foto.');
      return datos;
    }

    // ----- Modo comparar: conteo de productos registrados -----
    function mostrarConteo(datos) {
      const lista = raiz.querySelector('[data-conteo]');
      lista.replaceChildren();
      if (!datos.conteo.length) {
        const li = document.createElement('li');
        li.textContent = 'No se encontró ninguno de tus productos registrados.';
        lista.append(li);
      }
      for (const fila of datos.conteo) {
        const li = document.createElement('li');
        const nombre = document.createElement('span');
        nombre.textContent = fila.nombre;
        const cantidad = document.createElement('strong');
        cantidad.textContent = `× ${fila.cantidad}`;
        li.append(nombre, ' ', cantidad);
        lista.append(li);
      }
      raiz.querySelector('[data-mensaje]').textContent = datos.mensaje || '';
      resultado.hidden = false;
    }

    // ----- Modo describir: llena el formulario de alta con la descripción de la foto -----
    function llenarFormulario(datos, imagen) {
      if (!formulario) return;
      const campo = (nombre) => formulario.querySelector(`[name="${nombre}"]`);
      if (datos.nombre) campo('nombre').value = datos.nombre;
      if (datos.descripcion) campo('descripcion').value = datos.descripcion;
      campo('tipo').value = datos.tipo;
      if (datos.precio != null) campo('precio').value = Number(datos.precio).toFixed(2);
      formulario.querySelector('[name="imagen_data"]').value = imagen;
      raiz.querySelector('[data-foto]').src = imagen;
      raiz.querySelector('[data-foto-wrap]').hidden = false;
      mostrarEstado('');
      estado.hidden = true;
    }

    async function alTomarFoto() {
      if (ocupado || !stream || !video.videoWidth) return;
      ocupado = true;
      limpiarMensajes();
      const imagen = capturarDataUrl();
      botonTomar.disabled = true;
      mostrarEstado('Analizando la foto con Gemini…');
      try {
        if (modo === 'describir') {
          llenarFormulario(await enviar('/vendedor/camara/describir', imagen), imagen);
        } else if (modo === 'inventariar') {
          const datos = await enviar('/vendedor/camara/inventariar', imagen);
          estado.hidden = true;
          hoja?.close(); // apaga la cámara y cierra esta hoja
          document.dispatchEvent(new CustomEvent('inventario:analizado', { detail: { ...datos, imagen } }));
        } else {
          mostrarConteo(await enviar('/vendedor/camara/comparar', imagen));
          estado.hidden = true;
        }
      } catch (err) {
        estado.hidden = true;
        mostrarError(err.message);
      } finally {
        ocupado = false;
        botonTomar.disabled = !stream;
      }
    }

    botonTomar.addEventListener('click', alTomarFoto);
    botonActivar?.addEventListener('click', abrir);

    // Cuándo encender y apagar la cámara
    const hoja = raiz.closest('dialog');
    const deslizador = document.querySelector('[data-swipe]');
    const panel = raiz.closest('.panel');
    if (hoja) {
      hoja.addEventListener('abrir', abrir);
      hoja.addEventListener('close', cerrar);
      if (hoja.open) abrir();
    } else if (deslizador && panel && 'IntersectionObserver' in window) {
      new IntersectionObserver(([entrada]) => {
        if (entrada.isIntersecting) abrir();
        else cerrar();
      }, { root: deslizador, threshold: 0.6 }).observe(panel);
    } else {
      abrir();
    }
  }

  document.querySelectorAll('[data-camara]').forEach(montar);
})();
