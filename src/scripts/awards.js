// Home awards: four calm tilt cards (the idea of React Bits "Tilted Card" + "Glare Hover", none of their code). A mouse over a card
// tilts it toward the pointer (soft spring, a little scale, a growing shadow) and sweeps one white glare streak across it. When the
// section first comes on screen and the first-visit intro layer is gone, the cards rise in 0.1 s apart. Touch: intro only.
// Per frame only the card's transform (and the shadow's opacity) is written; card rects are read on pointer enter and resize.
// Reduced motion and no script: plain static cards (the transparent pre-intro state exists only with .is-live).
(() => {
  const list = document.querySelector('.award-list');
  if (!list) return;
  const reduce = window.motionLoop.reduce;
  const cards = [...list.querySelectorAll('.award-card')];
  if (!cards.length || reduce.matches) return;

  const MAX_TILT = 8, // degrees
    SCALE = 1.03,
    PERSPECTIVE = 800, // px
    K = 180, // spring stiffness; with DAMP the settle has a small soft bounce
    DAMP = 14,
    GLARE_MS = 650,
    RISE_PX = 16,
    RISE_MS = 600,
    STAGGER_MS = 100,
    EASE = 'cubic-bezier(.2,.7,.2,1)';
  // Per card: x = [rotateX, rotateY, scale, lift], v = velocities, t = targets, r = rect read on enter.
  const states = cards.map(el => ({ el, x: [0, 0, 1, 0], v: [0, 0, 0, 0], t: [0, 0, 1, 0], r: null, on: false, glare: el.querySelector('.award-glare') }));
  let introGone = !document.querySelector('[data-intro]');
  let seen = false;
  let risen = false;

  const draw = s => {
    s.el.style.transform = `perspective(${PERSPECTIVE}px) rotateX(${s.x[0].toFixed(2)}deg) rotateY(${s.x[1].toFixed(2)}deg) scale(${s.x[2].toFixed(4)})`;
    s.el.style.setProperty('--lift', Math.max(0, Math.min(1, s.x[3])).toFixed(3));
  };
  const loop = window.motionLoop({
    target: list,
    canPlay: () => states.some(s => s.on),
    onSeen: on => {
      seen = on;
      rise();
    },
    onReduce: on => {
      if (!on) return;
      for (const s of states) {
        s.on = false;
        s.el.style.transform = '';
        s.el.style.removeProperty('--lift');
        s.el.classList.add('is-in');
      }
    },
    tick: dt => {
      for (const s of states) {
        if (!s.on) continue;
        let rest = true;
        for (let i = 0; i < 4; i++) {
          s.v[i] += (s.t[i] - s.x[i]) * K * dt;
          s.v[i] *= Math.exp(-DAMP * dt);
          s.x[i] += s.v[i] * dt;
          if (Math.abs(s.t[i] - s.x[i]) > 0.005 || Math.abs(s.v[i]) > 0.05) rest = false;
        }
        if (rest && s.t[3] === 0) {
          s.on = false;
          s.el.style.transform = '';
          s.el.style.removeProperty('--lift');
          s.x = [0, 0, 1, 0];
          s.v = [0, 0, 0, 0];
        } else draw(s);
      }
    },
  });

  function rise() {
    if (risen || !seen || !introGone) return;
    risen = true;
    states.forEach((s, i) => {
      s.el.classList.add('is-in');
      s.el.animate([{ opacity: 0, translate: `0 ${RISE_PX}px` }, { opacity: 1, translate: '0 0' }], { duration: RISE_MS, delay: i * STAGGER_MS, easing: EASE, fill: 'backwards' });
    });
  }

  const aim = (s, e) => {
    const r = s.r;
    const px = (e.clientX - r.left) / r.width - 0.5,
      py = (e.clientY - r.top) / r.height - 0.5;
    s.t = [-py * 2 * MAX_TILT, px * 2 * MAX_TILT, SCALE, 1];
  };
  for (const s of states) {
    s.el.addEventListener('pointerenter', e => {
      if (e.pointerType !== 'mouse' || reduce.matches) return;
      s.r = s.el.getBoundingClientRect();
      aim(s, e);
      s.on = true;
      loop.update();
      s.glare.animate([{ translate: '-70% 0' }, { translate: '70% 0' }], { duration: GLARE_MS, easing: 'ease-in-out', pseudoElement: '::before' });
    });
    s.el.addEventListener('pointermove', e => {
      if (e.pointerType === 'mouse' && s.on && s.r) aim(s, e);
    });
    s.el.addEventListener('pointerleave', e => {
      if (e.pointerType !== 'mouse') return;
      s.t = [0, 0, 1, 0];
      loop.update();
    });
  }

  // The rects shift with the layout, so read them again after a resize (a hovered card re-aims on its next move).
  window.motionLoop.onResize(() => states.forEach(s => (s.r = s.on ? s.el.getBoundingClientRect() : null)));

  list.classList.add('is-live');
  if (!introGone) {
    new MutationObserver((_, observer) => {
      if (document.querySelector('[data-intro]')) return;
      observer.disconnect();
      introGone = true;
      rise();
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
