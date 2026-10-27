(() => {
  // First visit in a tab (home or About Me): a glass layer blurs the real page, game cards rise and stack, align into
  // a grid, then spread outward while the glass clears. Everything is sequenced with Web Animation `finished`
  // promises, so no timer or frame loop is needed.
  const layer = document.querySelector('[data-intro]');
  if (!layer) return;
  // Removing the layer also drops its window listeners (a non-passive wheel listener slows scrolling for the whole visit).
  const remove = () => {
    layer.remove();
    window.removeEventListener('keydown', swallow);
    window.removeEventListener('wheel', swallow);
  };
  const KEY = 'intro-seen';
  let seen = false;
  try { seen = sessionStorage.getItem(KEY) !== null; } catch { /* storage blocked: still play once */ }
  // On a slow connection the page may already be on screen before this script runs; covering it then would flash,
  // so the intro only plays when nothing has been painted yet.
  const painted = performance.getEntriesByType('paint').some(entry => entry.name === 'first-contentful-paint');
  if (seen || painted || window.motionLoop.reduce.matches) { remove(); return; }
  try { sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ }

  // Random order each visit (Fisher-Yates); appending in that order also fixes the stack order and each card's grid cell.
  const cards = [...layer.querySelectorAll('.intro-card')];
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  // Phones and touch screens (2026-10-26 perf request): no backdrop-filter (solid layer), no card shadow (all cards still fill the screen), and
  // the clear step fades the layer's opacity. Desktop keeps the full effect.
  const lite = window.matchMedia('(max-width: 640px), (pointer: coarse)').matches;
  if (lite) {
    layer.classList.add('is-lite');
  }
  layer.append(...cards);
  const EASE = 'cubic-bezier(.77, 0, .175, 1)';
  const STAGGER = 65, RISE = 1100, ALIGN = 1100, SPREAD = 1600, SPREAD_DELAY = 350;
  let anims = [];
  let ending = false;

  // The page below sharpens (blur -> 0) and the white wash fades; the start values are read from the CSS, and the end
  // values become the plain style (see finish()).
  const clearGlass = (ms, easing) => {
    const css = getComputedStyle(layer);
    const keys = lite ? { opacity: ['1', '0'] }
      : { background: [css.backgroundColor, 'rgba(255, 255, 255, 0)'], backdropFilter: [css.backdropFilter, 'blur(0px) saturate(1.4)'] };
    for (const [key, [, end]] of Object.entries(keys)) layer.style[key] = end;
    return layer.animate(keys, { duration: ms, easing });
  };

  const finish = ms => {
    if (ending) return;
    ending = true;
    // The cards stop where they are (no jump back to the start) and the whole layer fades out. The end value is also set
    // as the plain style, so the frame where a finished animation is dropped (seen on phones as a flicker) shows nothing.
    for (const anim of anims) anim.pause();
    if (ms === 0 || layer.hidden) { remove(); return; }
    // From the opacity it has now: on phones a skip during the clear step must not jump back to fully covered.
    const from = getComputedStyle(layer).opacity;
    layer.style.opacity = '0';
    layer.animate({ opacity: [from, 0] }, { duration: ms, easing: 'ease' }).finished.then(remove, remove);
  };

  // Keeps the animations so a skip can cancel them; resolves true only if they all ran to the end.
  const run = list => {
    anims.push(...list);
    return Promise.all(list.map(anim => anim.finished)).then(() => !ending, () => false);
  };

  const play = async () => {
    if (ending) return;
    layer.classList.remove('is-waiting');
    const rests = cards.map((_, i) => `translate(0px, ${-i * 2}px) scale(1) rotate(${((i % 2 ? 1 : -1) * 6 * (1 - i / 12)).toFixed(2)}deg)`);
    const rise = cards.map((card, i) => card.animate(
      [{ transform: 'translate(0px, calc(100vh + 200px)) scale(1.6) rotate(0deg)' }, { transform: rests[i] }],
      { duration: RISE, delay: i * STAGGER, easing: EASE, fill: 'both' }
    ));
    if (!await run(rise)) return;

    // Align: a grid over the whole viewport with a gap between the cards and at the edges (24px, 16px on phones), measured
    // once here. Columns are picked so the cells are as close as possible to the card ratio; each card fits inside its cell.
    // Spare cells get clones of the first cards, which fade in from the centre.
    const W = window.innerWidth, H = window.innerHeight, N = cards.length, GAP = W > 640 ? 24 : 16;
    const cols = Math.max(1, Math.round(Math.sqrt(N * (W / H) * (336 / 352)))), rows = Math.ceil(N / cols);
    const cellW = (W - (cols + 1) * GAP) / cols, cellH = (H - (rows + 1) * GAP) / rows;
    const scale = Math.min(cellW / cards[0].offsetWidth, cellH / cards[0].offsetHeight);
    const clones = [];
    for (let i = N; i < cols * rows; i++) {
      const clone = cards[i % N].cloneNode();
      clone.style.visibility = ''; // a card whose picture is still decoding must not hand its hidden state to its clone
      layer.append(clone);
      clones.push(clone);
    }
    const all = [...cards, ...clones];
    const cells = all.map((_, i) => [(i % cols - (cols - 1) / 2) * (cellW + GAP), (Math.floor(i / cols) - (rows - 1) / 2) * (cellH + GAP)]);
    const at = (x, y, s) => `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${s.toFixed(4)}) rotate(0deg)`;
    const align = all.map((card, i) => card.animate(
      i < N ? [{ transform: rests[i] }, { transform: at(...cells[i], scale) }]
        : [{ transform: at(0, 0, 0), opacity: 0 }, { transform: at(...cells[i], scale), opacity: 1 }],
      { duration: ALIGN, easing: EASE, fill: 'both' }
    ));
    if (!await run(align)) return;

    // Spread: every card flies straight out from the screen centre along the line to its own cell (straight up for a card at the
    // centre) by ~0.7 of the viewport diagonal at the same size, fading, after its own random start delay; the glass clears over the same window.
    const reach = Math.hypot(W, H) * .7;
    // Same end-value-as-plain-style rule as finish(): every card ends invisible, so nothing can flash back when the spread ends.
    for (const card of all) card.style.opacity = '0';
    const spread = all.map((card, i) => {
      const [x, y] = cells[i], length = Math.hypot(x, y);
      const [ux, uy] = length < 0.5 ? [0, -1] : [x / length, y / length];
      return card.animate([
        { transform: at(x, y, scale), opacity: 1 },
        { transform: at(x + ux * reach, y + uy * reach, scale), opacity: 0 }
      ], { duration: SPREAD, delay: Math.random() * SPREAD_DELAY, easing: 'cubic-bezier(.5, 0, .75, 0)', fill: 'both' });
    });
    if (await run([...spread, clearGlass(SPREAD, 'ease')])) { ending = true; remove(); }
  };

  // The glass goes up at once (so the page never flashes before it); the cards wait, hidden, until the pictures of the
  // first ones to rise are decoded. The rest decode while those rise, each staying invisible until its own picture is ready,
  // so the start does not decode all 30 at once (2026-10-27 phone hitch). An empty animation on no element is the 1.5s
  // deadline: past it the glass just clears away.
  const FIRST = 6;
  for (const card of cards.slice(FIRST)) {
    card.style.visibility = 'hidden';
    const show = () => { card.style.visibility = ''; };
    card.decode().then(show, show);
  }
  // Resolves on the next frame: two of them let the page's first layout and paint pass under the still glass, so the
  // cards never start moving inside that heavy frame.
  const nextFrame = () => {
    const tick = new Animation(new KeyframeEffect(null, [], 1));
    tick.play();
    return tick.ready;
  };
  layer.classList.add('is-waiting');
  layer.hidden = false;
  const deadline = new Animation(new KeyframeEffect(null, [], 1500));
  deadline.play();
  const timedOut = deadline.finished.then(() => false);
  const firstReady = Promise.all(cards.slice(0, FIRST).map(card => card.decode())).then(nextFrame).then(nextFrame).then(() => true);
  Promise.race([firstReady, timedOut]).then(
    ready => { deadline.cancel(); if (ready) play(); else finish(500); },
    () => { deadline.cancel(); finish(500); }
  );

  layer.addEventListener('pointerdown', () => finish(500));
  // While the layer is up, a key or wheel only skips it: it must not also scroll the page or reach scroll-exit.js
  // (loaded after this file, so stopping here keeps the "one more scroll at the top" from firing).
  function swallow(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    finish(500);
  }
  window.addEventListener('keydown', swallow);
  window.addEventListener('wheel', swallow, { passive: false });
  window.addEventListener('pageshow', event => { if (event.persisted) finish(0); });
})();
