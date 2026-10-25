// /about/ page: the game banner and the tool inventory filter. Without this file the page still shows every image and slot.
// The banner's auto-advance clock runs inside window.motionLoop (motion-loop.js), which also stops it off-screen, in a hidden tab and under reduced motion.
(() => {
  const banner = document.querySelector('[data-banner]');
  if (banner) {
    const view = banner.querySelector('[data-view]');
    const track = banner.querySelector('[data-track]');
    const slides = [...banner.querySelectorAll('[data-slide]')];
    const every = 3.5;
    let index = 0;
    let clock = 0;
    let hover = false;
    let inside = false;
    let loop;

    const show = to => {
      index = (to + slides.length) % slides.length;
      clock = 0;
      track.style.setProperty('--i', index);
      slides.forEach((slide, i) => {
        slide.inert = i !== index;
        slide.setAttribute('aria-hidden', i === index ? 'false' : 'true');
      });
    };

    banner.classList.add('is-live');
    show(0);

    banner.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      show(index + (event.key === 'ArrowRight' ? 1 : -1));
    });

    // Swipe: a mostly horizontal move of 40px or more.
    let start = null;
    view.addEventListener('touchstart', event => { start = event.touches[0]; }, { passive: true });
    view.addEventListener('touchend', event => {
      if (!start) return;
      const end = event.changedTouches[0];
      const dx = end.clientX - start.clientX;
      const dy = end.clientY - start.clientY;
      start = null;
      if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1));
    }, { passive: true });

    // Paused while a mouse is over the banner or focus is inside it (a tap on a phone must not pause it for good).
    const sync = () => loop.update();
    banner.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hover = true; sync(); } });
    banner.addEventListener('pointerleave', () => { hover = false; sync(); });
    banner.addEventListener('focusin', () => { inside = true; sync(); });
    banner.addEventListener('focusout', event => { inside = banner.contains(event.relatedTarget); sync(); });

    loop = window.motionLoop({
      target: banner,
      threshold: 0.1,
      canPlay: () => !hover && !inside,
      tick: dt => {
        clock += dt;
        if (clock >= every) show(index + 1);
      },
    });
  }

  // One more downward scroll at the very bottom fades the page out (600ms) and opens the portfolio.
  // The fade is a Web Animation whose `finished` promise starts the navigation, so no timer is needed.
  const ARM_AFTER = 300; // ms at the bottom before a further scroll counts (a long fling must not carry through)
  const atBottom = () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
  let since = null; // performance.now() when the bottom was reached; null while above it
  let pulled = 0; // downward wheel distance gathered since arming
  let touchY = null;
  let fade = null;
  const refresh = () => {
    if (!atBottom()) since = null;
    else if (since === null) since = performance.now();
  };
  const armed = () => {
    refresh();
    return fade === null && since !== null && performance.now() - since >= ARM_AFTER;
  };
  // A local copy opened as a file has no server to turn "../" into the home page, so it names index.html.
  const home = location.protocol === 'file:' ? '../index.html' : '../';
  const leave = () => {
    if (fade) return;
    if (window.motionLoop.reduce.matches) { fade = {}; location.assign(home); return; }
    fade = document.body.animate({ opacity: [1, 0] }, { duration: 600, easing: 'ease', fill: 'forwards' });
    fade.finished.then(() => location.assign(home), () => {});
  };
  window.addEventListener('scroll', refresh, { passive: true });
  // A trackpad fling keeps sending wheel events for about a second, so only a wheel gesture that STARTS after the bottom was
  // reached counts: a new gesture begins after 250ms without wheel events.
  let lastWheel = -Infinity;
  let gestureStart = -Infinity;
  window.addEventListener('wheel', event => {
    const now = performance.now();
    if (now - lastWheel > 250) gestureStart = now;
    lastWheel = now;
    if (!armed() || event.deltaY <= 0 || gestureStart <= since) { pulled = 0; return; }
    pulled += event.deltaY;
    if (pulled >= 40) leave();
  }, { passive: true });
  window.addEventListener('touchstart', event => { touchY = event.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchend', event => {
    const swipe = touchY === null ? 0 : touchY - event.changedTouches[0].clientY;
    touchY = null;
    if (swipe >= 40 && armed()) leave();
  }, { passive: true });
  window.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!['ArrowDown', 'PageDown', ' '].includes(event.key) || event.target.closest?.('input, textarea, select, button, [contenteditable]')) return;
    if (armed()) leave();
  });
  // Coming back from the back/forward cache: show the page again and ask for a fresh "reach the bottom, then scroll".
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    fade?.cancel?.();
    fade = null;
    pulled = 0;
    since = null;
    refresh();
  });
  refresh();

  const inventory = document.querySelector('[data-inventory]');
  if (inventory) {
    const tabs = [...inventory.querySelectorAll('[data-filter]')];
    const slots = [...inventory.querySelectorAll('[data-slot]')];
    const status = inventory.querySelector('[data-filter-status]');
    inventory.classList.add('is-live');
    inventory.querySelector('[data-filters]').hidden = false;
    tabs.forEach(tab => tab.addEventListener('click', () => {
      tabs.forEach(other => other.setAttribute('aria-pressed', String(other === tab)));
      const picked = slots.filter(slot => tab.dataset.filter === '전체' || slot.dataset.group === tab.dataset.filter);
      slots.forEach(slot => slot.classList.toggle('is-dim', !picked.includes(slot)));
      // Dimming is only visual, so the result is also read out: "AI 4개: GPT, Claude, Grok, Gemini".
      status.textContent = `${tab.dataset.filter} ${picked.length}개: ${picked.map(slot => slot.querySelector('.inv-name').textContent).join(', ')}`;
    }));
  }
})();
