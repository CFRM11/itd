// Deslizar izquierda/derecha entre las subpáginas de UNA sección (scroll-snap nativo).
// No cambia de sección: en el primer/último panel se detiene.
(() => {
  const track = document.querySelector('[data-swipe]');
  if (!track) return;

  const panels = [...track.querySelectorAll('.panel')];
  const tabs = [...document.querySelectorAll('.tabs a')];
  const indicator = document.querySelector('.tabs-indicator');
  const site = track.dataset.site;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const last = panels.length - 1;
  let current = -1;

  const clamp = (i) => Math.max(0, Math.min(last, i));

  function goTo(i, smooth = true) {
    track.scrollTo({ left: clamp(i) * track.clientWidth, behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });
  }

  function activate(i) {
    if (i === current) return;
    current = i;
    tabs.forEach((t, j) => (j === i ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current')));
    const p = panels[i];
    if (location.pathname !== p.dataset.url) history.replaceState(null, '', p.dataset.url);
    document.title = `${p.dataset.title} · ${site}`;
  }

  track.addEventListener(
    'scroll',
    () => {
      const x = track.scrollLeft / track.clientWidth;
      if (indicator) indicator.style.transform = `translateX(${x * 100}%)`;
      activate(clamp(Math.round(x)));
    },
    { passive: true },
  );

  tabs.forEach((tab, i) =>
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      goTo(i);
    }),
  );

  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest('input, textarea, select, [contenteditable]')) return;
    if (e.key === 'ArrowRight') goTo(current + 1);
    if (e.key === 'ArrowLeft') goTo(current - 1);
  });

  addEventListener('resize', () => goTo(current, false));

  const start = clamp(Number(track.dataset.start) || 0);
  goTo(start, false);
  activate(start);
})();
