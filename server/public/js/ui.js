// Diálogos (hojas modales): abrir con [data-abrir], cerrar con [data-cerrar] o tocando el fondo.
(() => {
  document.addEventListener('click', (e) => {
    const abrir = e.target.closest('[data-abrir]');
    if (abrir) document.getElementById(abrir.dataset.abrir)?.showModal();

    const cerrar = e.target.closest('[data-cerrar]');
    if (cerrar) cerrar.closest('dialog')?.close();

    if (e.target.matches('dialog.hoja')) e.target.close();
  });

  document.querySelectorAll('dialog[data-abrir-auto]').forEach((d) => d.showModal());
})();
