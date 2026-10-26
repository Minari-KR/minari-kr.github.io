// /about/ scribbled ribbons ("Text Loop"): 5 long marker-stroke bands with text written along them, drawn across the whole screen BEHIND the white page box.
// Values follow the React Bits Text Loop idea (text on an SVG path that scrolls forever); the code is our own. The SVG is built here from fixed strings; without
// this file the container stays empty. Layout is random per page load (one seed, reused on resize). Entry: each ribbon is drawn from its start to its end over
// 1.6 s (Web Animations, no timers), 0.25 s apart, once the intro layer is gone. After that everything is still (the text does not move), so no motionLoop.
(() => {
  const COUNT = 5, OUT = 80, STEP = 0.25, DRAW = 1600, EASE = 'cubic-bezier(.77, 0, .175, 1)';
  const mulberry = a => () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32; };

  // Pure layout (also loaded by Node tests via the guard below). The viewport height is split into `count` equal slots; ribbon i runs left -> right through
  // slot i on both sides of the page box, with its own random tilt (entry/exit y) and bend (control points). Ribbons are placed in slot order; a random shape is
  // kept only if (1) its y in the middle of the left and right gutter lies inside the inner part of its slot and (2) its centre line stays at least
  // (thickA + thickB) / 2 + 24px (+ 4px sampling margin) from every earlier ribbon wherever it is visible (on screen and outside the box). Up to 200 tries per
  // ribbon; if one ribbon cannot be placed, the whole layout is retried with one ribbon fewer (a viewport shorter than count * 72px can never fit them).
  const GAP = 24, MARGIN = 4, TRIES = 200;
  const bez = (pts, n) => { // n evenly spaced (in t) samples on a chain of cubic Beziers [P0, c1, c2, P1, (c3, c4, P2)]
    const out = [], segs = (pts.length - 1) / 3;
    for (let k = 0; k <= n; k++) {
      const u = Math.min(k / n * segs, segs - 1e-9), s = Math.floor(u), t = u - s, q = pts.slice(s * 3, s * 3 + 4), m = 1 - t;
      out.push([0, 1].map(c => m * m * m * q[0][c] + 3 * m * m * t * q[1][c] + 3 * m * t * t * q[2][c] + t * t * t * q[3][c]));
    }
    return out;
  };
  const layoutRibbons = (W, H, box, seed) => {
    const hidden = ([x, y]) => x < 0 || x > W || y < 0 || y > H || (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom);
    const attempt = count => {
      const rnd = mulberry(seed), r = (a, b) => a + (b - a) * rnd(), placed = [], sh = H / count;
      const xl = box.left / 2, xr = (box.right + W) / 2; // middle of the left and right gutter
      for (let i = 0; i < count; i++) {
        const thick = Math.round(36 + rnd() * 12), size = Math.round(16 + rnd() * 4), cy = (i + 0.5) * sh;
        let found = null;
        for (let n = 0; n < TRIES && !found; n++) {
          const y0 = cy + r(-0.45, 0.45) * sh, y1 = cy + r(-0.45, 0.45) * sh;
          const pts = [[-OUT, y0], [-OUT + W * r(0.15, 0.4), y0 + r(-0.7, 0.7) * sh], [W + OUT - W * r(0.15, 0.4), y1 + r(-0.7, 0.7) * sh], [W + OUT, y1]];
          const line = bez(pts, 500), yAt = x => line.find(p => p[0] >= x)[1]; // x only grows along the line, so the first hit is the crossing
          if ([xl, xr].some(x => Math.abs(yAt(x) - cy) > 0.3 * sh)) continue;
          const vis = line.filter(p => !hidden(p));
          if (placed.every(o => { const d = (o.thick + thick) / 2 + GAP + MARGIN; return vis.every(p => o.vis.every(q => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 >= d * d)); })) found = { pts, thick, size, vis };
        }
        if (!found) return null;
        placed.push(found);
      }
      return placed.map(({ pts, thick, size }) => ({ pts, thick, size }));
    };
    for (let count = Math.min(COUNT, Math.floor(H / 72)); count > 0; count--) { const done = attempt(count); if (done) return done; }
    return [];
  };
  if (typeof module !== 'undefined') module.exports = { layoutRibbons, bez, GAP };
  if (typeof document === 'undefined') return;

  const container = document.querySelector('[data-text-loop]');
  if (!container) return;
  const NS = 'http://www.w3.org/2000/svg';
  const UNIT = 'MINARI ✦ GAME DESIGNER ✦ ';
  const TINT = ['a', 'b', 'a', 'c', 'a']; // three light greens (see about.css)
  const reduce = window.motionLoop.reduce;
  const seed = Math.floor(Math.random() * 2 ** 32);
  const el = (parent, name, attrs) => {
    const node = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attrs || {})) node.setAttribute(key, value);
    parent.append(node);
    return node;
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
    const layout = layoutRibbons(W, H, { left: box.left, right: box.right, top: box.top, bottom: box.bottom }, seed);
    const svg = el(container, 'svg', { class: 'tl-svg', width: W, height: H, viewBox: `0 0 ${W} ${H}` });
    const defs = el(svg, 'defs');
    layout.forEach(({ pts, thick, size }, i) => {
      const d = toD(pts);
      const id = `tl-${i}`;
      const mask = el(defs, 'mask', { id: `${id}-mask`, maskUnits: 'userSpaceOnUse', x: -100, y: -100, width: W + 200, height: H + 200 });
      const parts = [el(mask, 'path', { d, fill: 'none', stroke: '#fff', 'stroke-width': thick + 16 })];
      // Narrow soft shadow under every ribbon (stacked faint strokes, no blur); ribbons never overlap, so it only sits on the grey background.
      for (const grow of [6, 3, 0]) parts.push(el(svg, 'path', { d, fill: 'none', class: 'tl-shadow', 'stroke-width': thick + grow, transform: 'translate(1.5 2.5)' }));
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
    });
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