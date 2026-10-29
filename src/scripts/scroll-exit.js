(() => {
  // One more scroll past the top or bottom edge covers the page with a plain background-coloured layer (fades in over 600ms) and opens the page named by a
  // link marked data-scroll-exit="top" or "bottom". The cover fade is a Web Animation whose `finished` promise
  // starts the navigation, so no timer is needed.
  const link = edge => document.querySelector(`a[data-scroll-exit="${edge}"]`);
  const top = link('top');
  const bottom = link('bottom');
  if (!top && !bottom) return;

  const ARM_AFTER = 300; // ms at the edge before a further scroll counts (a long fling must not carry through)
  const KEYS = { top: ['ArrowUp', 'PageUp'], bottom: ['ArrowDown', 'PageDown', ' '] };
  const atEdge = {
    top: () => window.scrollY <= 2,
    bottom: () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2,
  };

  const wire = (edge, anchor) => {
    const dir = edge === 'top' ? -1 : 1;
    let since = null; // performance.now() when the edge was reached; null while away from it
    let pulled = 0; // wheel distance toward the edge gathered since arming
    let touchY = null;
    let fade = null;
    let cover = null;
    const refresh = () => {
      if (!atEdge[edge]()) since = null;
      else if (since === null) since = performance.now();
    };
    const armed = () => {
      refresh();
      return fade === null && since !== null && performance.now() - since >= ARM_AFTER;
    };
    // A local copy opened as a file has no server to turn "dir/" into dir/index.html, so it names the file.
    let href = anchor.getAttribute('href');
    if (location.protocol === 'file:' && href.endsWith('/')) href += 'index.html';
    // The arriving page's head gate (intro-gate.js) reads #from-scroll to fade its cover out, then drops the fragment.
    href += '#from-scroll';
    const leave = () => {
      if (fade) return;
      if (window.motionLoop.reduce.matches) { fade = {}; location.assign(href); return; }
      // One fixed layer fades in instead of the whole body (the 3D spiral and SVG ribbons would be re-composited every frame).
      cover = document.createElement('div');
      cover.className = 'exit-cover';
      document.body.append(cover);
      fade = cover.animate({ opacity: [0, 1] }, { duration: 600, easing: 'ease', fill: 'forwards' });
      fade.finished.then(() => location.assign(href), () => {});
    };
    window.addEventListener('scroll', refresh, { passive: true });
    // A trackpad fling keeps sending wheel events for about a second, so only a wheel gesture that STARTS after the edge was
    // reached counts: a new gesture begins after 250ms without wheel events.
    let lastWheel = -Infinity;
    let gestureStart = -Infinity;
    window.addEventListener('wheel', event => {
      const now = performance.now();
      if (now - lastWheel > 250) gestureStart = now;
      lastWheel = now;
      // A trackpad pinch (and Ctrl+wheel) zooms the page; it arrives as a wheel with ctrlKey and must not leave it.
      if (event.ctrlKey) return;
      if (!armed() || event.deltaY * dir <= 0 || gestureStart <= since) { pulled = 0; return; }
      pulled += Math.abs(event.deltaY);
      if (pulled >= 40) leave();
    }, { passive: true });
    // Touch only leaves at the bottom: pulling down at the top of a phone page must stay the browser's pull-to-refresh.
    if (edge === 'bottom') {
      window.addEventListener('touchstart', event => { touchY = event.touches[0].clientY; }, { passive: true });
      window.addEventListener('touchend', event => {
        const swipe = touchY === null ? 0 : touchY - event.changedTouches[0].clientY;
        touchY = null;
        if (swipe >= 40 && armed()) leave();
      }, { passive: true });
    }
    window.addEventListener('keydown', event => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (!KEYS[edge].includes(event.key) || event.target.closest?.('input, textarea, select, button, [contenteditable]')) return;
      if (armed()) leave();
    });
    // Coming back from the back/forward cache: show the page again and ask for a fresh "reach the edge, then scroll".
    window.addEventListener('pageshow', event => {
      if (!event.persisted) return;
      fade?.cancel?.();
      cover?.remove();
      cover = null;
      fade = null;
      pulled = 0;
      since = null;
      refresh();
    });
    refresh();
  };

  if (top) wire('top', top);
  if (bottom) wire('bottom', bottom);
})();
