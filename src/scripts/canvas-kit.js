// Shared canvas helpers for the Reflectory and Barrel Good Barrel animation scripts (2026-10-22); loaded after motion-loop.js.
//   canvasKit.fit(canvas, W, H)  sizes the canvas to its box (device pixel ratio capped at 2), maps the W x H scene onto it and
//                                returns { ctx, k, u }: k (1-1.8) thickens lines and dots on narrow screens, u = scene units per css px
//                                (so a text of n css px is n * u scene units)
//   canvasKit.ready(root, still) adds is-ready to root; when still is a boolean it also toggles is-still
//   canvasKit.fontReady(spec)    a promise that settles once the canvas font (a CSS font shorthand such as '16px ...') has loaded
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
};
