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
