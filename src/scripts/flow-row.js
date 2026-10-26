// Shared "flowing row" for the cartridge rows (games.js) and the project tab row (project-tabs.js) (2026-10-22): the lane maths,
// the wrap-around copies, grab / drag / throw with pointer events, and the keyboard-focus stop
// (a flowing row also moves the focused item to its middle, so Tab never lands on something off screen). Each script keeps its own look
// and feel (tilt, tab selection...) and calls window.flowRow(...) from its own motionLoop tick.
//   row         the element that is grabbed (gets .is-dragging while dragged)
//   track       the element that moves (one translate3d per frame)
//   canGrab()   optional extra condition for starting a grab (the game screen refuses it behind an open record)
//   scrollPull  true: when the row is not flowing but overflows, a mouse can pull its scrollLeft (tab row); the drag is no press
// It returns the lane { x, half, v, grab, focused } (half 0 = not flowing) with:
//   step(dt, flow)  moves the lane: a drag follows the pointer, a caught row brakes, a thrown or free row glides back to the
//                   speed `flow` (px/s); wraps x and writes the transform
//   place()         writes the transform from x (e.g. after the script moves x itself)
//   clear()         removes the copies, resets the transform and sets half to 0
//   reveal(item)    a flowing row moves an item that is not fully on screen to its middle (also done on keyboard focus)
//   fill(items, setWidth, view, decorate)  appends copies of `items` until half the row is wider than `view`, doubles that
//                   half so it wraps without a seam, and sets half; decorate(copy) adds the script's own changes to each copy
// Copies get data-clone, tabIndex -1 and aria-hidden. Only transforms are written per frame; sizes are read by the script's layout.
(() => {
  let keyboard = false;
  window.addEventListener('keydown', () => { keyboard = true; }, true);
  window.addEventListener('pointerdown', () => { keyboard = false; }, true);

  window.flowRow = ({ row, track, canGrab = () => true, scrollPull = false }) => {
    const lane = { x: 0, half: 0, v: 0, grab: null, focused: false };
    const place = () => { track.style.transform = `translate3d(${(lane.x - lane.half).toFixed(1)}px, 0, 0)`; };
    lane.place = place;
    lane.step = (dt, flow) => {
      const { grab } = lane;
      if (grab?.moved) {
        // Following the pointer.
        lane.x = grab.left + grab.dx;
        lane.v = grab.speed;
      } else if (grab) {
        // Caught: brakes within about 0.15s.
        lane.v *= Math.exp(-dt * 22);
        lane.x += lane.v * dt;
      } else {
        // Thrown or let go: glides back into its own flow.
        lane.v = flow + (lane.v - flow) * Math.exp(-dt * 2.6);
        lane.x += lane.v * dt;
      }
      lane.x = ((lane.x % lane.half) + lane.half) % lane.half;
      place();
    };
    lane.clear = () => {
      for (const copy of track.querySelectorAll('[data-clone]')) copy.remove();
      track.style.transform = '';
      lane.half = 0;
    };
    lane.fill = (items, setWidth, view, decorate) => {
      const copies = Math.max(1, Math.ceil(view / setWidth));
      for (let i = 1; i < copies * 2; i += 1) {
        for (const item of items) {
          const copy = item.cloneNode(true);
          copy.dataset.clone = '';
          copy.tabIndex = -1;
          copy.setAttribute('aria-hidden', 'true');
          decorate?.(copy);
          track.append(copy);
        }
      }
      lane.half = setWidth * copies;
      lane.x %= lane.half;
    };

    // A flowing row stops while something in it has keyboard focus.
    // reveal(item): in a flowing row, an item that is not fully on screen is moved to the middle (no jump for one that is).
    // The browser may have scrolled this overflow:hidden row to reach a focused item; the track moves by transform, so undo
    // that first. Items are measured on screen because packs and tabs have different offset parents. x is clamped, not
    // wrapped: only the originals take focus and they sit in the first half of the track.
    lane.reveal = element => {
      if (!lane.half) return;
      row.scrollLeft = 0;
      const item = element.getBoundingClientRect(), box = row.getBoundingClientRect();
      if (item.left >= box.left && item.right <= box.right) return;
      lane.x = Math.max(0, Math.min(lane.half - 0.5, lane.x + (box.left + box.right - item.left - item.right) / 2));
      lane.v = 0;
      place();
    };
    row.addEventListener('focusin', event => {
      lane.focused = keyboard;
      if (keyboard) lane.reveal(event.target);
    });
    row.addEventListener('focusout', event => {
      if (!row.contains(event.relatedTarget)) lane.focused = false;
    });

    // Grab a row and drag or throw it sideways; it wraps around, so it never runs out. A drag is not a press.
    let pull = null;
    let dragged = false;
    row.addEventListener('pointerdown', event => {
      dragged = false;
      pull = null;
      if (event.button !== 0) return;
      if (lane.half) {
        if (canGrab()) lane.grab = { x: event.clientX, last: event.clientX, time: performance.now(), speed: 0, dx: 0, left: lane.x, moved: false };
        return;
      }
      if (scrollPull && event.pointerType === 'mouse' && row.scrollWidth > row.clientWidth) pull = { x: event.clientX, left: row.scrollLeft, moved: false };
    });
    row.addEventListener('pointermove', event => {
      const grab = lane.grab || pull;
      if (!grab) return;
      // The button went up outside the row before the grab was captured: no pointerup ever came here.
      if (!event.buttons) { end(); return; }
      const dx = event.clientX - grab.x;
      if (!grab.moved) {
        if (Math.abs(dx) < 6) return;
        grab.moved = true;
        if (lane.grab) grab.left = lane.x - dx;
        row.setPointerCapture(event.pointerId);
        row.classList.add('is-dragging');
      }
      if (!lane.grab) {
        row.scrollLeft = pull.left - dx;
        return;
      }
      const now = performance.now();
      grab.speed = grab.speed * 0.6 + ((event.clientX - grab.last) / (Math.max(1, now - grab.time) / 1000)) * 0.4;
      grab.last = event.clientX;
      grab.time = now;
      grab.dx = dx;
    });
    const end = () => {
      const grab = lane.grab || pull;
      if (!grab) return;
      dragged = grab.moved;
      row.classList.remove('is-dragging');
      // Thrown at the speed of the drag's last moment; a pause before letting go throws nothing.
      if (lane.grab && grab.moved) lane.v = performance.now() - grab.time < 80 ? Math.max(-1600, Math.min(1600, grab.speed)) : 0;
      lane.grab = null;
      pull = null;
    };
    row.addEventListener('pointerup', end);
    row.addEventListener('pointercancel', end);
    row.addEventListener('click', event => {
      if (!dragged) return;
      dragged = false;
      event.preventDefault();
      event.stopPropagation();
    }, true);
    return lane;
  };
})();
