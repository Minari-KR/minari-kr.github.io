// A plain, render-blocking script in <head> of the PC inner pages. The browser applies :target only after the first paint, so the
// arrival fade is keyed on a class set here instead, and `js` lets the CSS lay the slider out one slide at a time from the first frame.
(() => {
  const root = document.documentElement;
  root.classList.add('js');
  try {
    if (location.hash !== '#from-nav') return;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) root.classList.add('pc-arrive');
    history.replaceState(null, '', location.pathname + location.search); // a reload must not replay the fade
  } catch { /* blocked: the page still works, just without the fade */ }
})();
