// Shared canvas helpers for the Reflectory and Barrel Good Barrel animation scripts (2026-10-22); loaded after motion-loop.js.
//   canvasKit.fit(canvas, W, H)  sizes the canvas to its box (device pixel ratio capped at 2), maps the W x H scene onto it and
//                                returns { ctx, k, u }: k (1-1.8) thickens lines and dots on narrow screens, u = scene units per css px
//                                (so a text of n css px is n * u scene units)
//   canvasKit.ready(root, still) adds is-ready to root; when still is a boolean it also toggles is-still
//   canvasKit.fontReady(spec)    a promise that settles once the canvas font (a CSS font shorthand such as '16px ...') has loaded
// Ball maths the three Reflectory scripts shared (2026-10-26); scenes keep their own units, so these take plain {x, y} numbers:
//   canvasKit.hit(p, d, len, w)       where the ray from p along d (unit) meets wall w { a, b } within len: { t, nx, ny } or null
//   canvasKit.nearest(p, d, walls, len)  the closest hit among walls, or null
//   canvasKit.reflect(d, h)           d mirrored on the hit's normal
//   canvasKit.along(path, dist)       the point dist along a polyline, with done once past its end
// (burst/rnd stay in each script: they share a per-script seed, and the augment sparks live 0.3 s instead of 0.25-0.33 s)
window.canvasKit = {
  fit: (canvas, W, H) => {
    const css = canvas.clientWidth || W, ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(css * ratio);
    canvas.height = Math.round(css * ratio * H / W);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    return { ctx, k: Math.min(1.8, Math.max(1, 0.45 * W / css)), u: W / css };
  },
  ready: (root, still) => {
    root.classList.add('is-ready');
    if (typeof still === 'boolean') root.classList.toggle('is-still', still);
  },
  fontReady: spec => Promise.resolve(document.fonts && document.fonts.load ? document.fonts.load(spec).catch(() => null) : null),
  hit: (p, d, len, w) => {
    const ex = w.b.x - w.a.x, ey = w.b.y - w.a.y, den = d.x * ey - d.y * ex;
    if (Math.abs(den) < 1e-9) return null;
    const ax = w.a.x - p.x, ay = w.a.y - p.y;
    const t = (ax * ey - ay * ex) / den, u = (ax * d.y - ay * d.x) / den;
    if (t <= 1e-6 || t > len || u < 0 || u > 1) return null;
    const n = Math.hypot(ex, ey);
    return { t, nx: -ey / n, ny: ex / n };
  },
  nearest: (p, d, walls, len) => {
    let best = null;
    for (const w of walls) { const h = window.canvasKit.hit(p, d, len, w); if (h && (!best || h.t < best.t)) best = h; }
    return best;
  },
  reflect: (d, h) => { const k = d.x * h.nx + d.y * h.ny; return { x: d.x - 2 * k * h.nx, y: d.y - 2 * k * h.ny }; },
  along: (path, dist) => {
    let s = dist;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i], L = Math.hypot(b.x - a.x, b.y - a.y);
      if (s <= L) return { x: a.x + (b.x - a.x) * s / L, y: a.y + (b.y - a.y) * s / L, done: false };
      s -= L;
    }
    return { ...path[path.length - 1], done: true };
  },
};
