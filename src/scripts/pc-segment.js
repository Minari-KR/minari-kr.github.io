// PC menu "rubber segment": plays the thumb stretch in the page, dissolves the content, then follows the link (a cross-document view
// transition barely shows and does not run from file://). Only transform is animated so it stays smooth while the main thread is busy.
// Sequenced with Web Animation `finished`, no timers.
(() => {
  const nav = document.querySelector('.pc-nav');
  const page = document.querySelector('.pc-page');
  if (!nav || !page || !nav.animate) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const links = [...nav.querySelectorAll('a')];
  const make = name => {
    const part = document.createElement('div');
    part.className = name;
    part.setAttribute('aria-hidden', 'true');
    nav.append(part);
    return part;
  };
  const capL = make('pc-thumb-cap'), capR = make('pc-thumb-cap'), bar = make('pc-thumb-bar');

  const EASE = 'cubic-bezier(.23, 1, .32, 1)';
  const BEZIER = [.23, 1, .32, 1];
  const TOTAL = 600;
  // Each edge is [ms, x, easing to the next point] points; x is the edge position in px.
  // Leading edge (toward the new slot): dilates past the new slot edge in 190 ms, then springs back onto it.
  const lead = (from, to, d) => [[0, from, EASE], [190, to + d * 5, EASE], [450, to, 'linear'], [TOTAL, to]];
  // Trailing edge: waits, then goes 3 px past the new slot edge (squash) and relaxes back.
  const trail = (from, to, d) => [[0, from, 'linear'], [150, from, EASE], [440, to + d * 3, EASE], [TOTAL, to]];

  // The middle bar needs both edges at once, so the easing is evaluated here (same curve as the caps) instead of by the browser.
  const bezier = (x1, y1, x2, y2) => {
    const at = (a, b, t) => 3 * a * (1 - t) * (1 - t) * t + 3 * b * (1 - t) * t * t + t * t * t;
    return x => {
      let lo = 0, hi = 1;
      for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (at(x1, x2, mid) < x) lo = mid; else hi = mid; }
      return at(y1, y2, (lo + hi) / 2);
    };
  };
  const curve = bezier(...BEZIER);
  const edgeAt = (points, ms) => {
    let i = 0;
    while (i < points.length - 2 && ms >= points[i + 1][0]) i++;
    const [t0, x0, easing] = points[i], [t1, x1] = points[i + 1];
    const p = (ms - t0) / (t1 - t0);
    return x0 + (x1 - x0) * (easing === 'linear' ? p : curve(p));
  };

  const frames = (points, shift) => points.map(([ms, x, easing]) => ({ offset: ms / TOTAL, transform: `translateX(${x + shift}px)`, easing }));
  const STEP = 10;

  let running = false;
  let anims = [];
  const reset = () => {
    anims.forEach(anim => anim.cancel());
    anims = [];
    nav.classList.remove('is-moving');
    page.classList.remove('is-leaving');
    links.forEach(a => a.classList.remove('is-origin', 'is-dest'));
    running = false;
  };
  window.addEventListener('pageshow', event => { if (event.persisted) reset(); });

  nav.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || link.getAttribute('aria-current') === 'page') return;
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || reduce.matches) return;
    event.preventDefault();
    if (running) return;
    running = true;
    // Measured at click time so any window width works; positions are relative to the nav's padding box, where the parts sit.
    const box = nav.getBoundingClientRect();
    const slot = a => { const r = a.getBoundingClientRect(); return [r.left - box.left - nav.clientLeft, r.right - box.left - nav.clientLeft, r.height]; };
    const origin = links.find(a => a.getAttribute('aria-current') === 'page') || links[0];
    const [l0, r0, h] = slot(origin);
    const [l1, r1] = slot(link);
    const d = l1 > l0 ? 1 : -1;
    const left = d > 0 ? trail(l0, l1, d) : lead(l0, l1, d);
    const right = d > 0 ? lead(r0, r1, d) : trail(r0, r1, d);
    capL.style.width = capR.style.width = `${h}px`;
    // The bar spans the two cap centres: from the left cap centre, scaled to the distance between the centres.
    const barFrames = [];
    for (let ms = 0; ms <= TOTAL; ms += STEP) {
      const a = edgeAt(left, ms) + h / 2, b = edgeAt(right, ms) - h / 2;
      barFrames.push({ offset: ms / TOTAL, transform: `translateX(${a}px) scaleX(${Math.max(b - a, 0)})` });
    }
    origin.classList.add('is-origin');
    link.classList.add('is-dest');
    nav.classList.add('is-moving');
    page.classList.add('is-leaving');
    document.dispatchEvent(new Event('pc-nav-leave'));
    const options = { duration: TOTAL, fill: 'forwards' };
    anims = [
      capL.animate(frames(left, 0), options),
      capR.animate(frames(right, -h), options),
      bar.animate(barFrames, options)
    ];
    const target = `${link.href.split('#')[0]}#from-nav`;
    Promise.all(anims.map(anim => anim.finished)).then(() => { location.href = target; }, reset);
  });
})();
