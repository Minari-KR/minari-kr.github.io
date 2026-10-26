// Home awards: four badges hanging from a band, swung by a tiny hand-written 2D spring pendulum (the idea of React Bits 'Lanyard',
// none of its code, no 3D). Per badge the card's top centre (the clip) is a point on a band that hangs from the cell's top centre:
// gravity pulls it down, the band pulls back like a spring only when stretched, velocity damping settles it, a soft breeze (a few slow
// sines, own phase per badge) keeps it swaying, and the card turns about the clip with its own angular spring toward the band's line.
// Drag (pointer capture, 6px threshold) stretches the band and release throws; a press without a drag, or Enter / Space, flips it.
// Entrance: once the section is on screen and the intro layer is gone, the badges drop in one after another, thrown in from the right.
// Per frame only transforms are written; sizes are read on resize. The list clips the swing (see home.css). Reduced motion: no
// physics, no breeze, no entrance; the badges hang still and the flip is instant. Without this file the cards are plain (no band).
(() => {
  const list = document.querySelector('.award-list');
  if (!list) return;
  const reduce = window.motionLoop.reduce;

  // Tuning (px, seconds). Equilibrium stretch is G / K_BAND, so the band's slack length is shortened by that to hang at exactly --band.
  const G = 1800; // gravity
  const K_BAND = 450; // band stiffness when stretched (elasticity)
  const DAMP = 3; // velocity damping per second: a throw settles in about 1.2 s
  const ANG_K = 60,
    ANG_C = 7; // card angular spring and damping
  const WIND = 105; // breeze strength (px/s2), about +-4 degrees of sway; the three sines are [frequency Hz, weight]
  const SINES = [
    [0.31, 0.55],
    [0.53, 0.3],
    [0.83, 0.15],
  ];
  const MAX_STRETCH = 1.8; // a drag may pull the clip this many band lengths from the anchor
  const MAX_THROW = 1600; // release speed limit
  const DRAG_PX = 6,
    STAGGER = 0.12,
    STEP = 1 / 120;

  const badges = [...list.children].map((li, i) => ({
    li,
    i,
    phase: i * 2.1,
    band: li.querySelector('.award-band'),
    swing: li.querySelector('.award-swing'),
    btn: li.querySelector('.award-flip'),
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    th: 0,
    w: 0,
    on: false,
    drag: null,
    suppress: false,
  }));
  let L = 48,
    slack = 44,
    clock = 0,
    introGone = !document.querySelector('[data-intro]');

  const measure = () => {
    L = badges[0].band.offsetHeight || L;
    slack = L - G / K_BAND;
  };
  const rest = (b) => {
    b.x = 0;
    b.y = L;
    b.vx = b.vy = b.th = b.w = 0;
  };
  const draw = (b) => {
    const d = Math.hypot(b.x, b.y) || 1e-6;
    b.swing.style.transform = `translate(${b.x.toFixed(1)}px, ${(b.y - L).toFixed(1)}px) rotate(${b.th.toFixed(3)}rad)`;
    b.band.style.transform = `rotate(${(-Math.atan2(b.x, b.y)).toFixed(3)}rad) scaleY(${(d / L).toFixed(3)})`;
  };
  // Hang still and straight (reduced motion, or back to it): drop the inline transforms so the CSS rest position shows.
  const settle = () =>
    badges.forEach((b) => {
      rest(b);
      b.on = true;
      b.li.classList.add('is-hung');
      b.swing.style.transform = b.band.style.transform = '';
    });

  const sim = (b, h, t) => {
    if (!b.drag?.moved) {
      let ax = 0,
        ay = G;
      for (const [f, k] of SINES)
        ax += WIND * k * Math.sin(t * f * 6.283 + b.phase * f * 3);
      const d = Math.hypot(b.x, b.y);
      if (d > slack) {
        const s = (K_BAND * (d - slack)) / d;
        ax -= s * b.x;
        ay -= s * b.y;
      }
      const keep = Math.exp(-DAMP * h);
      b.vx = (b.vx + ax * h) * keep;
      b.vy = (b.vy + ay * h) * keep;
      b.x += b.vx * h;
      b.y += b.vy * h;
      const far = Math.hypot(b.x, b.y),
        max = 3 * L;
      if (far > max) {
        b.x *= max / far;
        b.y *= max / far;
      }
    }
    // The card follows the band's direction through a soft spring (clamped so a wild throw can't spin it round).
    b.w += (-ANG_K * (b.th - -Math.atan2(b.x, b.y)) - ANG_C * b.w) * h;
    b.th = Math.max(-1, Math.min(1, b.th + b.w * h));
  };

  const tick = (dt) => {
    clock += dt;
    const n = Math.max(1, Math.ceil(dt / STEP)),
      h = dt / n;
    for (const b of badges) {
      if (!b.on) {
        if (clock < b.i * STAGGER) continue;
        // Enter from above on the right, drifting left, already turning.
        b.on = true;
        b.x = slack * 0.45;
        b.y = -slack * 0.4;
        b.vx = -slack * 3;
        b.vy = 0;
        b.th = 0.25;
        b.w = 3;
        b.li.classList.add('is-hung');
      }
      for (let s = 0; s < n; s++) sim(b, h, clock + s * h);
      draw(b);
    }
  };

  const loop = window.motionLoop({
    target: list,
    tick,
    canPlay: () => introGone,
    onReduce: (matches) => {
      if (matches) {
        for (const b of badges) b.drag = null;
        settle();
      }
    },
  });

  const flip = (b) => b.li.classList.toggle('is-flipped');
  for (const b of badges) {
    const { btn, li } = b;
    btn.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || reduce.matches || b.drag) return;
      b.drag = {
        id: e.pointerId,
        sx: e.clientX,
        sy: e.clientY,
        x0: b.x,
        y0: b.y,
        moved: false,
        vx: 0,
        vy: 0,
        t: e.timeStamp,
      };
      btn.setPointerCapture(e.pointerId);
    });
    btn.addEventListener('pointermove', (e) => {
      const g = b.drag;
      if (!g || e.pointerId !== g.id) return;
      const dx = e.clientX - g.sx,
        dy = e.clientY - g.sy;
      if (!g.moved) {
        if (Math.hypot(dx, dy) < DRAG_PX) return;
        g.moved = true;
        li.classList.add('is-dragging');
      }
      let x = g.x0 + dx,
        y = g.y0 + dy;
      const d = Math.hypot(x, y),
        max = MAX_STRETCH * L;
      if (d > max) {
        x *= max / d;
        y *= max / d;
      }
      const s = (e.timeStamp - g.t) / 1000;
      if (s > 0) {
        g.vx += ((x - b.x) / s - g.vx) * 0.5;
        g.vy += ((y - b.y) / s - g.vy) * 0.5;
      }
      g.t = e.timeStamp;
      b.x = x;
      b.y = y;
    });
    const end = (e) => {
      const g = b.drag;
      if (!g || e.pointerId !== g.id) return;
      b.drag = null;
      li.classList.remove('is-dragging');
      if (!g.moved) return;
      b.suppress = true; // the click that follows this release is no flip
      const held = e.type === 'pointerup' && e.timeStamp - g.t > 80; // stopped before letting go: no throw
      const sp = Math.hypot(g.vx, g.vy),
        k = held || !sp ? 0 : Math.min(1, MAX_THROW / sp);
      b.vx = g.vx * k;
      b.vy = g.vy * k;
    };
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointercancel', end);
    // detail 0 = keyboard (Enter / Space) click, which always flips.
    btn.addEventListener('click', (e) => {
      const skip = b.suppress && e.detail > 0;
      b.suppress = false;
      if (!skip) flip(b);
    });
  }

  list.classList.add('is-live');
  for (const b of badges) b.btn.disabled = false;
  measure();
  badges.forEach(rest);
  if (reduce.matches) settle();
  window.motionLoop.onResize(measure);
  if (!introGone) {
    new MutationObserver((_, observer) => {
      if (document.querySelector('[data-intro]')) return;
      observer.disconnect();
      introGone = true;
      loop.update();
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
