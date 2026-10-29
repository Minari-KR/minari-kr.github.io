// A plain, render-blocking script in <head> (the only one): when the first-visit intro will play, it marks <html> before the first
// paint, so intro.css puts the glass up from the very first frame. Without it the layer only appeared once the deferred scripts ran,
// and a slow load showed the bare page first. Same conditions as intro.js: no reduced motion, no 'intro-seen' in this tab.
(() => {
  let seen = false;
  try { seen = sessionStorage.getItem('intro-seen') !== null; } catch { /* storage blocked: still play once */ }
  if (!seen && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('intro-on');
})();

// Arrival after a scroll exit (scroll-exit.js appends #from-scroll): the browser applies :target only after the first paint, so the
// arrival cover is keyed on a class set here instead, and the hash is dropped so a reload does not replay it.
(() => {
  try {
    if (location.hash !== '#from-scroll') return;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('from-scroll');
    history.replaceState(null, '', location.pathname + location.search);
  } catch { /* blocked: the page still works, just without the cover fade */ }
})();
