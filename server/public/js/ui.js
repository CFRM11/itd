// Diálogos (hojas modales): abrir con [data-abrir], cerrar con [data-cerrar] o tocando el fondo.
// Al abrir se dispara el evento "abrir" en el diálogo (la cámara de alta lo usa para encenderse).
(() => {
  function abrirHoja(dialogo) {
    if (!dialogo || dialogo.open) return;
    dialogo.showModal();
    dialogo.dispatchEvent(new Event('abrir'));
  }

  document.addEventListener('click', (e) => {
    const abrir = e.target.closest('[data-abrir]');
    if (abrir) abrirHoja(document.getElementById(abrir.dataset.abrir));

    const cerrar = e.target.closest('[data-cerrar]');
    if (cerrar) cerrar.closest('dialog')?.close();

    if (e.target.matches('dialog.hoja')) e.target.close();
  });

  document.querySelectorAll('dialog[data-abrir-auto]').forEach(abrirHoja);
})();
