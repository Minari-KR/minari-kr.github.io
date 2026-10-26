// /about/ side ribbons ("Text Loop"): text running along wavy bands in the empty page margins. Values follow the React Bits Text Loop
// idea (text on an SVG path that scrolls forever); the code is our own. The SVG is built here from fixed strings; without this file the container stays empty.
// Entry: each band is drawn from its start to its end over 1.6 s (Web Animations, no timers), then the text flows at 60 px/s inside window.motionLoop.
(() => {
  const container = document.querySelector('[data-text-loop]');
  if (!container) return;
  const NS = 'http://www.w3.org/2000/svg';
  const UNIT = 'MINARI ✦ GAME DESIGNER ✦ ';
  const THICK = 44, SPEED = 60, DRAW = 1600, EASE = 'cubic-bezier(.77, 0, .175, 1)';
  const reduce = window.motionLoop.reduce;
  const el = (parent, name, attrs) => {
    const node = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attrs || {})) node.setAttribute(key, value);
    parent.append(node);
    return node;
  };
  let phase = reduce.matches ? 'flow' : 'wait'; // wait (page covered by the intro) -> draw -> flow
  let dirty = true;
  let build = 0; // bumped by every rebuild so a stale draw-in promise is ignored
  let shift = 0; // px the text has travelled, wrapped at one repeat
  let texts = [];
  let draws = []; // per band: the path pieces drawn in (band, text mask, shadow) and their length
  let repeat = 1;
  let loop;

  // A side gutter is (viewport - box)/2 wide; the box is min(816px, viewport - 32px). Bands stay inside it.
  const rebuild = () => {
    dirty = false;
    build++;
    container.replaceChildren();
    texts = [];
    draws = [];
    const width = document.documentElement.clientWidth;
    const height = window.innerHeight;
    const gutter = (width - Math.min(816, width - 32)) / 2;
    const amp = Math.min(90, gutter / 2 - THICK / 2 - 10);
    const wavelength = Math.max(700, height * 0.9);
    const drawn = phase !== 'wait'; // a rebuild during the draw-in just shows the finished bands
    phase = drawn ? 'flow' : 'wait';
    ['left', 'right'].forEach((side, s) => {
      const svg = el(container, 'svg', { class: `tl-svg tl-${side}`, width: gutter, height, viewBox: `0 0 ${gutter} ${height}` });
      const defs = el(svg, 'defs');
      const blur = el(defs, 'filter', { id: `tl-blur-${s}`, filterUnits: 'userSpaceOnUse', x: -40, y: -100, width: gutter + 80, height: height + 200 });
      el(blur, 'feGaussianBlur', { stdDeviation: 6 });
      // The front band runs top to bottom, the crossing band bottom to top on the mirrored wave: they cross like an X and flow opposite ways.
      const band = (name, sign, down, shadow) => {
        const ys = [];
        for (let y = -60; y <= height + 60; y += 12) ys.push(y);
        if (!down) ys.reverse();
        const mirror = side === 'left' ? sign : -sign;
        const d = ys.map((y, i) => `${i ? 'L' : 'M'}${(gutter / 2 + mirror * amp * Math.sin((2 * Math.PI * y) / wavelength)).toFixed(1)} ${y}`).join('');
        const id = `tl-${s}-${name}`;
        const mask = el(defs, 'mask', { id: `${id}-mask`, maskUnits: 'userSpaceOnUse', x: 0, y: -100, width: gutter, height: height + 200 });
        const parts = [el(mask, 'path', { d, fill: 'none', stroke: '#fff', 'stroke-width': THICK + 16 })];
        if (shadow) parts.push(el(svg, 'path', { d, fill: 'none', class: 'tl-shadow', filter: `url(#tl-blur-${s})`, transform: 'translate(4 6)' }));
        const path = el(svg, 'path', { d, fill: 'none', id, class: `tl-band tl-${name}` });
        parts.push(path);
        const text = el(svg, 'text', { class: `tl-text tl-text-${name}`, mask: `url(#${id}-mask)` });
        const along = el(text, 'textPath', { href: `#${id}` });
        const length = path.getTotalLength();
        // Measure one repeat on this exact path, then fill its whole length plus a spare repeat.
        along.textContent = UNIT.repeat(4);
        repeat = text.getComputedTextLength() / 4 || 1;
        along.textContent = UNIT.repeat(Math.ceil(length / repeat) + 2);
        for (const part of parts) {
          part.setAttribute('stroke-dasharray', length);
          part.setAttribute('stroke-dashoffset', drawn ? 0 : length);
        }
        texts.push(along);
        draws.push({ parts, length });
      };
      band('cross', -1, false, false);
      band('front', 1, true, true);
    });
    flow();
  };
  const flow = () => { for (const text of texts) text.setAttribute('startOffset', (shift - repeat).toFixed(2)); };

  const start = () => {
    const id = build;
    const animations = draws.flatMap(({ parts, length }) => parts.map(part => part.animate(
      [{ strokeDashoffset: length }, { strokeDashoffset: 0 }],
      { duration: DRAW, easing: EASE, fill: 'forwards' })));
    Promise.all(animations.map(a => a.finished)).then(() => {
      if (id !== build) return;
      for (const { parts } of draws) for (const part of parts) part.setAttribute('stroke-dashoffset', 0);
      for (const a of animations) a.cancel();
      phase = 'flow';
    }, () => {});
  };
  const ready = () => container.clientWidth > 0;

  loop = window.motionLoop({
    target: container,
    canPlay: ready,
    onReduce: matches => { if (matches) { phase = 'flow'; shift = 0; if (ready()) rebuild(); } },
    tick: dt => {
      if (dirty) rebuild();
      if (phase === 'wait') {
        if (document.querySelector('[data-intro]')) return;
        phase = 'draw';
        start();
      } else if (phase === 'flow') {
        shift = (shift + SPEED * dt) % repeat;
        flow();
      }
    },
  });
  window.addEventListener('resize', () => {
    dirty = true;
    if (reduce.matches) { if (ready()) rebuild(); } else loop.update();
  });
  if (reduce.matches && ready()) rebuild();
})();
