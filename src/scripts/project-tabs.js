// Projects on the home page (2026-10-14 user choice "썸네일 탭 + 큰 카드"): a row of small title pictures above one large card.
// Every project is visible at a glance as a thumbnail; pressing one (or the arrow keys on the row, or a sideways swipe on the
// card) shows its card. The cards share one place, and the section takes the height of the card shown.
// When there are more thumbnails than fit, the row flows sideways on its own like the game screen's cartridge rows
// (2026-10-14 user request): it can be grabbed, dragged and thrown, and glides back into its flow. With reduced motion it
// stays still and scrolls instead. Without this script the thumbnails stay hidden and the cards simply follow one another.
(() => {
  const motion = motionLoop.reduce;
  for (const root of document.querySelectorAll('[data-project-tabs]')) {
    const list = root.querySelector('[role="tablist"]');
    const tabs = list ? [...list.querySelectorAll('[role="tab"]')] : [];
    const cards = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
    if (tabs.length < 2 || cards.some(card => !card)) continue;

    // The tabs move inside one track, so a flowing row only needs one transform.
    const track = document.createElement('div');
    track.className = 'ptabs-track';
    track.setAttribute('role', 'none');
    tabs.forEach((tab, index) => {
      tab.dataset.index = String(index);
      track.append(tab);
    });
    list.append(track);

    const lane = flowRow({ row: list, track, scrollPull: true });
    let current = 0;
    // A chosen tab half out of a still row slides fully into view (without moving the page); a flowing row moves it to the
    // middle (flow-row.js; focus() on a tab that already has focus fires no focusin, so show() asks too).
    const reveal = tab => {
      if (lane.half) { lane.reveal(tab); return; }
      const left = tab.offsetLeft - list.offsetLeft;
      if (left < list.scrollLeft || left + tab.offsetWidth > list.scrollLeft + list.clientWidth) {
        list.scrollTo({ left: left - (list.clientWidth - tab.offsetWidth) / 2, behavior: motion.matches ? 'auto' : 'smooth' });
      }
    };
    const show = (index, { focus = false } = {}) => {
      const to = (index + tabs.length) % tabs.length;
      current = to;
      tabs.forEach((tab, i) => {
        const on = i === to;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        cards[i].classList.toggle('is-current', on);
        cards[i].inert = !on;
      });
      // The copies of a flowing row only mirror the look of the chosen tab.
      for (const copy of track.querySelectorAll('[data-clone]')) copy.setAttribute('aria-selected', String(Number(copy.dataset.index) === to));
      if (focus) {
        reveal(tabs[to]);
        tabs[to].focus({ preventScroll: true });
      }
      else if (!lane.half) reveal(tabs[to]);
    };

    // A press on a tab, or on one of its copies in a flowing row.
    list.addEventListener('click', event => {
      const tab = event.target.closest('.ptabs-tab');
      if (tab) show(Number(tab.dataset.index));
    });
    // Arrow keys move along the thumbnails (and show that card); Home and End jump to the ends.
    list.addEventListener('keydown', event => {
      const moves = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: tabs.length - 1 };
      if (!(event.key in moves)) return;
      event.preventDefault();
      show(moves[event.key], { focus: true });
    });
    list.addEventListener('focusout', event => {
      if (!list.contains(event.relatedTarget)) lane.focused = false;
    });
    // A sideways swipe on the card (touch only; the page still scrolls up and down) shows the next or previous project.
    let swipe = null;
    root.addEventListener('pointerdown', event => {
      swipe = event.pointerType === 'mouse' || !event.target.closest('.ptabs-cards') ? null : { x: event.clientX, y: event.clientY };
    });
    root.addEventListener('pointerup', event => {
      if (!swipe) return;
      const dx = event.clientX - swipe.x;
      const dy = event.clientY - swipe.y;
      swipe = null;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) show(current + (dx < 0 ? 1 : -1));
    });
    root.addEventListener('pointercancel', () => { swipe = null; });

    // A still row that overflows scrolls with a plain mouse wheel too, and hands the scroll back to the page at its ends. A
    // flowing row has no ends, so it only takes sideways wheel turns and leaves up and down to the page.
    list.addEventListener('wheel', event => {
      if (lane.half) {
        if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
        event.preventDefault();
        lane.x -= event.deltaX;
        return;
      }
      if (Math.abs(event.deltaX) >= Math.abs(event.deltaY) || list.scrollWidth <= list.clientWidth) return;
      const room = event.deltaY > 0 ? list.scrollWidth - list.clientWidth - list.scrollLeft : list.scrollLeft;
      if (room < 1) return;
      event.preventDefault();
      list.scrollLeft += event.deltaY;
    }, { passive: false });
    list.addEventListener('dragstart', event => event.preventDefault());

    // The flowing row is moved frame by frame (transform only; sizes are read on layout), and only while it is on screen.
    let speed = 24;
    const step = dt => {
      lane.step(dt, lane.focused ? 0 : -speed);
    };
    // The row flows only when its tabs do not fit and motion is allowed; then it repeats its tabs until half of it is wider
    // than the row, and doubles that half so it wraps around without a seam.
    const layout = () => {
      lane.clear();
      list.classList.remove('is-looping');
      if (!motion.matches && list.scrollWidth > list.clientWidth + 1) {
        list.classList.add('is-looping');
        list.scrollLeft = 0;
        speed = Number.parseFloat(getComputedStyle(root).getPropertyValue('--tab-speed')) || 24;
        const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
        const setWidth = tabs.reduce((sum, tab) => sum + tab.offsetWidth + gap, 0);
        lane.fill(tabs, setWidth, list.clientWidth, copy => {
          copy.removeAttribute('id');
          copy.removeAttribute('aria-controls');
        });
        if (!lane.v) lane.v = -speed;
        show(current);
      }
      loop.update();
    };
    // Only a flowing row moves, and only while it is on screen and the tab is visible (motion-loop.js).
    const loop = motionLoop({ target: list, tick: step, canPlay: () => Boolean(lane.half), cancelAtOnce: true, onReduce: layout });
    let width = 0;
    motionLoop.onResize(() => {
      if (list.clientWidth === width) return;
      width = list.clientWidth;
      layout();
    });
    cards.forEach(card => card.setAttribute('role', 'tabpanel'));
    root.classList.add('is-ready');
    list.hidden = false;
    show(0);
    width = list.clientWidth;
    layout();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  }
})();
