// Home awards: four memo cards stuck onto the planning note (the feel of React Bits "Sticker Peel", none of its code).
// Start: each cell shows only an empty dashed slot (a real <button> added here); pressing it, or the 3 s auto-stick, drops the card on
// like a sticker. A stuck card peels the corner nearest a mouse pointer (hover 25% of its short side, press 40%) and a mouse can drag
// it inside the list, swinging around the held point. Touch: a tap lifts the nearest corner. Positions are not saved.
// Per frame only the dragged card's translate/rotate are written; rects are read on press, pointer enter and resize.
// Reduced motion and no script: plain stuck cards (the empty state exists only with .is-live).
(() => {
  const list = document.querySelector('.award-list');
  if (!list) return;
  const reduce = window.motionLoop.reduce;
  const cells = [...list.querySelectorAll('.award-card')];
  if (!cells.length || reduce.matches) return;

  const DROP_MS = 320,
    DROP_EASE = 'cubic-bezier(.2,.9,.3,1.15)', // a tiny overshoot
    DROP_SCALE = 1.12,
    DROP_TILT = 4, // degrees on top of the resting angle
    DROP_RISE = 12, // px above the slot
    PEEL_STICK = 0.2, // share of the short side: after sticking, hover, press/drag
    PEEL_HOVER = 0.25,
    PEEL_DRAG = 0.4,
    SMOOTH_MS = 300,
    TAP_MS = 500,
    WAIT_MS = 3000, // quiet time before the rest stick themselves
    GAP_MS = 150,
    SWING_MAX = 8, // degrees
    SWING_PER = 0.01, // degrees per px/s of horizontal drag speed
    K = 120, // swing spring stiffness and damping (a little wobble)
    DAMP = 12;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const corner = (r, x, y) => (y < r.top + r.height / 2 ? 't' : 'b') + (x < r.left + r.width / 2 ? 'l' : 'r');
  const peelKeys = (px, offset) => [{ '--peel': '0px' }, { '--peel': `${px}px`, offset }, { '--peel': '0px' }];

  const states = cells.map(cell => ({ cell, sheet: cell.querySelector('.award-sheet'), btn: null, stuck: false, r: null, short: 0, dx: 0, dy: 0, rest: 0, swing: 0, sv: 0, vx: 0, held: null, settle: false, o: [0, 0], c: [0, 0] }));
  let introGone = !document.querySelector('[data-intro]');
  let seen = false;
  let timer = null; // the pending empty Web Animation (deadline or gap)
  let top = 2; // z-index of the card moved last

  // An empty animation on no element is the deadline (like intro.js): no timers in page scripts.
  const wait = (ms, fn) => {
    const a = new Animation(new KeyframeEffect(null, [], ms));
    timer = a;
    a.play();
    a.finished.then(() => { if (timer === a) { timer = null; fn(); } }, () => {});
  };
  const arm = () => {
    if (timer) timer.cancel();
    timer = null;
    if (seen && introGone && states.some(s => !s.stuck)) wait(WAIT_MS, autoStick);
  };
  function autoStick() {
    const s = states.find(t => !t.stuck);
    if (!s) return;
    stick(s, null);
    if (states.some(t => !t.stuck)) wait(GAP_MS, autoStick);
  }

  // Slide the transform origin (centre <-> held point) without moving the card: o + R(p - o) + t has to stay the same.
  const shift = (s, from, to) => {
    const a = (s.rest * Math.PI) / 180, c = Math.cos(a), n = Math.sin(a), vx = from[0] - to[0], vy = from[1] - to[1];
    s.dx += vx - (c * vx - n * vy);
    s.dy += vy - (n * vx + c * vy);
  };

  // Keep the tilted card's four corners inside the list (a start that already pokes out a few px is allowed, so there is no jump).
  const inside = (s, nx, ny) => {
    const h = s.held, a = ((s.rest + s.swing) * Math.PI) / 180, c = Math.cos(a), n = Math.sin(a);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [qx, qy] of [[0, 0], [s.c[0] * 2, 0], [0, s.c[1] * 2], [s.c[0] * 2, s.c[1] * 2]]) {
      const vx = qx - s.o[0], vy = qy - s.o[1], x = h.lx + s.o[0] + c * vx - n * vy + nx, y = h.ly + s.o[1] + n * vx + c * vy + ny;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    return [nx + (x0 < h.bl ? h.bl - x0 : x1 > h.br ? h.br - x1 : 0), ny + (y0 < h.bt ? h.bt - y0 : y1 > h.bb ? h.bb - y1 : 0)];
  };

  function stick(s, point) {
    if (s.stuck) return;
    s.stuck = true;
    s.cell.classList.add('is-stuck');
    if (s.btn) {
      const had = s.btn === document.activeElement;
      s.btn.remove();
      s.btn = null;
      if (had) {
        const i = states.indexOf(s);
        const next = states.slice(i + 1).concat(states.slice(0, i)).find(t => t.btn);
        (next ? next.btn : list).focus({ preventScroll: true });
      }
    }
    const sh = s.sheet;
    s.rest = parseFloat(getComputedStyle(sh).getPropertyValue('--rest')) || 0;
    s.short = Math.min(sh.offsetWidth, sh.offsetHeight);
    sh.dataset.corner = point ? corner(sh.getBoundingClientRect(), point[0], point[1]) : 'br';
    sh.animate(
      [
        { translate: `0 -${DROP_RISE}px`, scale: DROP_SCALE, rotate: `${s.rest + DROP_TILT}deg`, '--lift': 1 },
        { translate: '0 0', scale: 1, rotate: `${s.rest}deg`, '--lift': 0 },
      ],
      { duration: DROP_MS, easing: DROP_EASE }
    );
    sh.animate(peelKeys(PEEL_STICK * s.short, 0.25), { duration: SMOOTH_MS + 100, delay: DROP_MS, easing: 'ease-out' });
  }

  const loop = window.motionLoop({
    target: list,
    threshold: 0.25,
    canPlay: () => states.some(s => s.held || s.settle),
    onSeen: on => {
      seen = on;
      if (on && !timer) arm();
    },
    onReduce: on => {
      if (!on) return;
      if (timer) timer.cancel();
      timer = null;
      list.classList.remove('is-live');
      for (const s of states) {
        s.held = null;
        s.settle = false;
        s.stuck = true;
        s.cell.classList.add('is-stuck');
        if (s.btn) s.btn.remove();
        s.btn = null;
        s.sheet.getAnimations().forEach(a => a.cancel());
        for (const prop of ['translate', 'rotate', 'transform-origin', '--peel', '--lift']) s.sheet.style.removeProperty(prop);
        s.cell.style.zIndex = '';
      }
    },
    tick: dt => {
      for (const s of states) {
        const h = s.held;
        if (!h && !s.settle) continue;
        if (h) {
          const [nx, ny] = inside(s, h.dx0 + h.px - h.x0, h.dy0 + h.py - h.y0);
          if (dt) s.vx += ((nx - s.dx) / dt - s.vx) * 0.25;
          s.dx = nx;
          s.dy = ny;
        } else s.vx = 0;
        const target = h ? clamp(h.dir * s.vx * SWING_PER, -SWING_MAX, SWING_MAX) : 0;
        s.sv += ((target - s.swing) * K - DAMP * s.sv) * dt;
        s.swing += s.sv * dt;
        if (!h && Math.abs(s.swing) < 0.05 && Math.abs(s.sv) < 0.5) {
          // Settled at the resting angle: the origin goes back to the centre and the card stops being written.
          s.settle = false;
          s.swing = s.sv = 0;
          shift(s, s.o, s.c);
          s.sheet.style.rotate = '';
          s.sheet.style.transformOrigin = '';
        } else s.sheet.style.rotate = `${s.rest + s.swing}deg`;
        s.sheet.style.translate = `${s.dx.toFixed(2)}px ${s.dy.toFixed(2)}px`;
      }
    },
  });

  const begin = (s, e) => {
    const sh = s.sheet, r = sh.getBoundingClientRect(), lr = list.getBoundingClientRect(), cr = s.cell.getBoundingClientRect();
    s.rest = parseFloat(getComputedStyle(sh).getPropertyValue('--rest')) || 0;
    s.short = Math.min(sh.offsetWidth, sh.offsetHeight);
    if (!s.settle) {
      // The held point in the card's own (unrotated) coordinates.
      const a = (s.rest * Math.PI) / 180, px = e.clientX - (r.left + r.width / 2), py = e.clientY - (r.top + r.height / 2);
      s.c = [sh.offsetWidth / 2, sh.offsetHeight / 2];
      s.o = [s.c[0] + px * Math.cos(a) + py * Math.sin(a), s.c[1] - px * Math.sin(a) + py * Math.cos(a)];
      shift(s, s.c, s.o);
      sh.style.transformOrigin = `${s.o[0].toFixed(1)}px ${s.o[1].toFixed(1)}px`;
    }
    s.held = { id: e.pointerId, x0: e.clientX, y0: e.clientY, px: e.clientX, py: e.clientY, dx0: s.dx, dy0: s.dy, dir: s.o[1] < s.c[1] ? -1 : 1, lx: cr.left, ly: cr.top, bl: Math.min(lr.left, r.left), br: Math.max(lr.right, r.right), bt: Math.min(lr.top, r.top), bb: Math.max(lr.bottom, r.bottom) };
    sh.dataset.corner = corner(r, e.clientX, e.clientY);
    sh.style.setProperty('--peel', `${PEEL_DRAG * s.short}px`);
    sh.style.setProperty('--lift', '1');
    s.cell.style.zIndex = String(++top);
    sh.setPointerCapture(e.pointerId);
    loop.update();
  };
  const end = (s, e) => {
    const h = s.held;
    if (!h || e.pointerId !== h.id) return;
    s.held = null;
    s.settle = true;
    s.sheet.animate([{ '--peel': `${PEEL_DRAG * s.short}px` }, { '--peel': '0px' }], { duration: SMOOTH_MS, easing: 'ease-out' });
    s.sheet.style.removeProperty('--peel');
    s.sheet.style.removeProperty('--lift');
    s.r = s.sheet.getBoundingClientRect(); // still under the pointer: hover can go on
    loop.update();
  };
  const hover = (s, e) => {
    const c = corner(s.r, e.clientX, e.clientY);
    if (s.sheet.dataset.corner !== c) s.sheet.dataset.corner = c;
    s.sheet.style.setProperty('--peel', `${PEEL_HOVER * s.short}px`);
  };
  const tap = (s, e) => {
    const sh = s.sheet;
    sh.dataset.corner = corner(sh.getBoundingClientRect(), e.clientX, e.clientY);
    sh.animate(peelKeys(PEEL_HOVER * Math.min(sh.offsetWidth, sh.offsetHeight), 0.3), { duration: TAP_MS, easing: 'ease-out' });
  };

  for (const s of states) {
    const sh = s.sheet;
    s.btn = document.createElement('button');
    s.btn.type = 'button';
    s.btn.className = 'award-slot';
    s.btn.setAttribute('aria-label', `${s.cell.querySelector('.award-name').textContent} 붙이기`);
    // A real click: a mouse or touch press carries its point (the peeled corner), Enter/Space (detail 0) does not.
    s.btn.addEventListener('click', e => {
      stick(s, e.detail ? [e.clientX, e.clientY] : null);
      arm();
    });
    s.cell.append(s.btn);

    sh.addEventListener('pointerenter', e => {
      if (e.pointerType !== 'mouse' || !s.stuck || s.held || reduce.matches) return;
      s.r = sh.getBoundingClientRect();
      s.short = Math.min(sh.offsetWidth, sh.offsetHeight);
      hover(s, e);
    });
    sh.addEventListener('pointermove', e => {
      if (e.pointerType === 'mouse' && s.stuck && s.r && !s.held) hover(s, e);
    });
    sh.addEventListener('pointerleave', e => {
      if (e.pointerType === 'mouse' && !s.held) sh.style.removeProperty('--peel');
    });
    sh.addEventListener('pointerdown', e => {
      if (!s.stuck || e.button || reduce.matches) return;
      if (e.pointerType !== 'mouse') return tap(s, e);
      e.preventDefault();
      begin(s, e);
      arm();
    });
  }
  // A held card follows the pointer even if the capture is lost or the pointer leaves the card.
  window.addEventListener('pointermove', e => {
    for (const s of states) if (s.held && e.pointerId === s.held.id) { s.held.px = e.clientX; s.held.py = e.clientY; }
  });
  for (const type of ['pointerup', 'pointercancel']) window.addEventListener(type, e => states.forEach(s => end(s, e)));

  // The rects shift with the layout: forget them, and put moved cards back in their cells (the list may have changed shape).
  window.motionLoop.onResize(() => {
    for (const s of states) {
      s.r = null;
      if (s.held || s.settle) continue;
      s.dx = s.dy = 0;
      s.sheet.style.translate = '';
    }
  });

  list.tabIndex = -1;
  list.classList.add('is-live');
  if (!introGone) {
    new MutationObserver((_, observer) => {
      if (document.querySelector('[data-intro]')) return;
      observer.disconnect();
      introGone = true;
      arm();
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
