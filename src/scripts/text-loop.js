// /about/ scribbled ribbons ("Text Loop"): 5 long marker-stroke bands with text written along them, drawn across the whole screen BEHIND the white page box.
// Values follow the React Bits Text Loop idea (text on an SVG path that scrolls forever); the code is our own. The SVG is built here from fixed strings; without
// this file the container stays empty. Layout is random per page load (one seed, reused on resize). Entry: each ribbon is drawn from its start to its end over
// 1.6 s (Web Animations, no timers), 0.25 s apart, once the intro layer is gone. After that everything is still (the text does not move), so no motionLoop.
(() => {
  const container = document.querySelector('[data-text-loop]');
  if (!container) return;
  const NS = 'http://www.w3.org/2000/svg';
  const UNIT = 'MINARI ✦ GAME DESIGNER ✦ ';
  const COUNT = 5, OUT = 80, STEP = 0.25, DRAW = 1600, EASE = 'cubic-bezier(.77, 0, .175, 1)';
  const TINT = ['a', 'b', 'a', 'c', 'a']; // three light greens (see about.css) so a ribbon stays readable where it crosses another
  const reduce = window.motionLoop.reduce;
  const seed = Math.floor(Math.random() * 2 ** 32);
  const el = (parent, name, attrs) => {
    const node = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attrs || {})) node.setAttribute(key, value);
    parent.append(node);
    return node;
  };
  const mulberry = a => () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32; };

  // Bezier points [P0, c1, c2, P1, (c3, c4, P2)] for ribbon k: five different sweeps, each entering past one viewport edge and leaving past another.
  const shape = (k, rnd, W, H) => {
    const r = (a, b) => a + (b - a) * rnd();
    const sgn = () => (rnd() < 0.5 ? -1 : 1);
    let pts;
    if (k === 0) { // left -> right diagonal
      const s = [-OUT, H * r(0.08, 0.4)], e = [W + OUT, H * r(0.6, 0.92)];
      pts = [s, [s[0] + W * r(0.25, 0.4), s[1] + H * r(-0.3, 0.3)], [e[0] - W * r(0.25, 0.4), e[1] + H * r(-0.3, 0.3)], e];
    } else if (k === 1) { // top -> bottom sweeping arc
      const s = [W * r(0.08, 0.4), -OUT], e = [W * r(0.6, 0.92), H + OUT], b = sgn();
      pts = [s, [s[0] + b * W * r(0.2, 0.5), H * r(0.2, 0.4)], [e[0] - b * W * r(0.2, 0.5), H * r(0.6, 0.8)], e];
    } else if (k === 2) { // near-horizontal wave (two joined curves)
      const s = [-OUT, H * r(0.35, 0.65)], m = [W * r(0.45, 0.55), H * r(0.3, 0.7)], e = [W + OUT, H * r(0.35, 0.65)], a = sgn() * H * r(0.2, 0.45);
      pts = [s, [W * 0.2, s[1] + a], [W * 0.3, m[1] - a], m, [2 * m[0] - W * 0.3, m[1] + a], [W * r(0.7, 0.85), e[1] - a], e];
    } else if (k === 3) { // bottom-left -> top-right
      const s = [W * r(0.05, 0.3), H + OUT], e = [W + OUT, H * r(0.05, 0.35)];
      pts = [s, [s[0] + W * r(0, 0.3), H * r(0.3, 0.6)], [W * r(0.5, 0.8), e[1] + H * r(0, 0.3)], e];
    } else { // top-right -> bottom-left
      const s = [W * r(0.7, 0.95), -OUT], e = [-OUT, H * r(0.6, 0.9)];
      pts = [s, [s[0] - W * r(0, 0.3), H * r(0.2, 0.5)], [W * r(0.1, 0.4), e[1] - H * r(0, 0.3)], e];
    }
    if (rnd() < 0.5) pts = pts.map(([x, y]) => [x, H - y]);
    if (rnd() < 0.5) pts = pts.map(([x, y]) => [W - x, y]);
    if (pts[0][0] > pts[pts.length - 1][0]) pts.reverse(); // always drawn left to right so glyphs are never upside down
    return pts;
  };
  const toD = pts => `M${pts[0].map(Math.round)}` + pts.slice(1).reduce((s, p, i) => s + (i % 3 === 0 ? 'C' : ',') + p.map(Math.round), '');

  let started = reduce.matches; // true once the draw-in has begun (or reduced motion): later rebuilds show the finished ribbons
  let build = 0; // bumped by every rebuild so a stale draw-in promise is ignored
  let ribbons = []; // per ribbon: { parts, length }

  const rebuild = () => {
    build++;
    container.replaceChildren();
    ribbons = [];
    const W = container.clientWidth, H = container.clientHeight;
    const box = document.querySelector('main.page').getBoundingClientRect();
    const rnd = mulberry(seed);
    const svg = el(container, 'svg', { class: 'tl-svg', width: W, height: H, viewBox: `0 0 ${W} ${H}` });
    const defs = el(svg, 'defs');
    // Length of a path that is on screen and outside the page box, split by side. The box hides the rest, so each side a ribbon shows must show >= 200px.
    const score = path => {
      const side = { left: 0, right: 0 };
      const total = path.getTotalLength();
      for (let l = 0; l < total; l += 8) {
        const { x, y } = path.getPointAtLength(l);
        if (x < 0 || x > W || y < 0 || y > H) continue;
        if (x < box.left) side.left += 8;
        else if (x > box.right) side.right += 8;
      }
      const shown = [side.left, side.right].filter(v => v > 40);
      return shown.length ? Math.min(...shown) + (side.left + side.right) / 100 : 0;
    };
    for (let i = 0; i < COUNT; i++) {
      const thick = Math.round(36 + rnd() * 12), size = Math.round(16 + rnd() * 4);
      const probe = el(svg, 'path', { fill: 'none' });
      let d = '', best = -1;
      for (let attempt = 0; attempt < 60 && best < 200; attempt++) { // retry random shapes until both visible sides show >= 200px
        const pts = shape(i, rnd, W, H);
        probe.setAttribute('d', toD(pts));
        const s = score(probe);
        if (s > best) { best = s; d = toD(pts); }
      }
      probe.remove();
      const id = `tl-${i}`;
      const mask = el(defs, 'mask', { id: `${id}-mask`, maskUnits: 'userSpaceOnUse', x: -100, y: -100, width: W + 200, height: H + 200 });
      const parts = [el(mask, 'path', { d, fill: 'none', stroke: '#fff', 'stroke-width': thick + 16 })];
      // Soft shadow under every ribbon but the first (stacked faint strokes); later ribbons are drawn above earlier ones.
      if (i) for (const grow of [12, 6, 0]) parts.push(el(svg, 'path', { d, fill: 'none', class: 'tl-shadow', 'stroke-width': thick + grow, transform: 'translate(3 5)' }));
      const path = el(svg, 'path', { d, fill: 'none', id, class: `tl-band tl-${TINT[i]}`, 'stroke-width': thick });
      parts.push(path);
      const text = el(svg, 'text', { class: 'tl-text', 'font-size': size, mask: `url(#${id}-mask)` });
      const length = path.getTotalLength();
      // One repeat is at least ~340px at 16px, so length / 250 repeats always cover the ribbon; the mask hides any extra.
      el(text, 'textPath', { href: `#${id}` }).textContent = UNIT.repeat(Math.ceil(length / 250) + 1);
      for (const part of parts) {
        part.setAttribute('stroke-dasharray', length);
        part.setAttribute('stroke-dashoffset', started ? 0 : length);
      }
      ribbons.push({ parts, length });
    }
  };

  const start = () => {
    const id = build;
    started = true;
    ribbons.forEach((r, i) => {
      const animations = r.parts.map(part => part.animate(
        [{ strokeDashoffset: r.length }, { strokeDashoffset: 0 }],
        { duration: DRAW, delay: i * STEP * 1000, easing: EASE, fill: 'both' }));
      Promise.all(animations.map(a => a.finished)).then(() => {
        if (id !== build) return;
        for (const part of r.parts) part.setAttribute('stroke-dashoffset', 0);
        for (const a of animations) a.cancel();
      }, () => {});
    });
  };
  const ready = () => container.clientWidth > 0; // the container is display: none below 1256px, so nothing is built there

  if (ready()) rebuild();
  if (!started) {
    const go = () => { if (ready()) start(); else started = true; };
    if (!document.querySelector('[data-intro]')) go();
    else {
      new MutationObserver((_, observer) => {
        if (document.querySelector('[data-intro]')) return;
        observer.disconnect();
        go();
      }).observe(document.documentElement, { childList: true, subtree: true });
    }
  }
  window.addEventListener('resize', () => { if (ready()) rebuild(); });
})();