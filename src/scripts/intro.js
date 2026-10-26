(() => {
  // First visit in a tab (home or About Me): a glass layer blurs the real page, game cards rise and stack, align into
  // a grid, then spread outward while the glass clears. Everything is sequenced with Web Animation `finished`
  // promises, so no timer or frame loop is needed.
  const layer = document.querySelector('[data-intro]');
  if (!layer) return;
  const remove = () => layer.remove();
  const KEY = 'intro-seen';
  let seen = false;
  try { seen = sessionStorage.getItem(KEY) !== null; } catch { /* storage blocked: still play once */ }
  // On a slow connection the page may already be on screen before this script runs; covering it then would flash,
  // so the intro only plays when nothing has been painted yet.
  const painted = performance.getEntriesByType('paint').some(entry => entry.name === 'first-contentful-paint');
  if (seen || painted || window.motionLoop.reduce.matches) { remove(); return; }
  try { sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ }

  const cards = [...layer.querySelectorAll('.intro-card')];
  const EASE = 'cubic-bezier(.77, 0, .175, 1)';
  const STAGGER = 100, RISE = 700, ALIGN = 600, HOLD = 100, SPREAD = 600, GAP = 16;
  let anims = [];
  let ending = false;

  // The page below sharpens (blur -> 0) and the white wash fades; the start values come from the CSS.
  const clearGlass = (ms, easing) => layer.animate(
    { background: 'rgba(255, 255, 255, 0)', backdropFilter: 'blur(0px) saturate(1.4)' },
    { duration: ms, easing, fill: 'forwards' }
  );

  const finish = ms => {
    if (ending) return;
    ending = true;
    for (const anim of anims) anim.cancel();
    if (ms === 0 || layer.hidden) { remove(); return; }
    clearGlass(ms, 'ease').finished.then(remove, remove);
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

    // Align: a centred grid (4 x 3, or 3 x 4 on narrow screens; the short last row is centred), measured once here.
    // Cells keep the card's 352/336 ratio and fit ~88% of the width and ~80% of the height.
    const W = window.innerWidth, H = window.innerHeight;
    const cols = W > 640 ? 4 : 3, rows = Math.ceil(cards.length / cols);
    const cellW = Math.min((W * .88 - (cols - 1) * GAP) / cols, (H * .8 - (rows - 1) * GAP) / rows * 352 / 336);
    const cellH = cellW * 336 / 352;
    const scale = cellW / cards[0].offsetWidth;
    const cells = cards.map((_, i) => {
      const row = Math.floor(i / cols), inRow = Math.min(cols, cards.length - row * cols);
      return [(i % cols - (inRow - 1) / 2) * (cellW + GAP), (row - (rows - 1) / 2) * (cellH + GAP)];
    });
    const at = (x, y, s) => `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${s.toFixed(4)}) rotate(0deg)`;
    const align = cards.map((card, i) => card.animate(
      [{ transform: rests[i] }, { transform: at(...cells[i], scale) }],
      { duration: ALIGN, easing: EASE, fill: 'both' }
    ));
    if (!await run(align)) return;

    const hold = new Animation(new KeyframeEffect(null, [], HOLD));
    hold.play();
    if (!await run([hold])) return;

    // Spread: every card flies outward from the screen centre along the line to its own cell (straight up for a card
    // at the centre) by ~0.6 of the viewport diagonal, growing and fading, while the glass clears.
    const reach = Math.hypot(W, H) * .6;
    const spread = cards.map((card, i) => {
      const [x, y] = cells[i], length = Math.hypot(x, y);
      const [ux, uy] = length < 0.5 ? [0, -1] : [x / length, y / length];
      return card.animate(
        [{ transform: at(x, y, scale), opacity: 1 }, { transform: at(x + ux * reach, y + uy * reach, scale * 1.3), opacity: 0 }],
        { duration: SPREAD, easing: 'ease-in', fill: 'both' }
      );
    });
    if (await run([...spread, clearGlass(SPREAD, 'ease')])) { ending = true; remove(); }
  };

  // The glass goes up at once (so the page never flashes before it); the cards wait, hidden, until their pictures
  // are decoded. An empty animation on no element is the 1.5s deadline: past it the glass just clears away.
  layer.classList.add('is-waiting');
  layer.hidden = false;
  const deadline = new Animation(new KeyframeEffect(null, [], 1500));
  deadline.play();
  const timedOut = deadline.finished.then(() => false);
  Promise.race([Promise.all(cards.map(card => card.decode())).then(() => true), timedOut]).then(
    ready => { deadline.cancel(); if (ready) play(); else finish(200); },
    () => { deadline.cancel(); finish(200); }
  );

  layer.addEventListener('pointerdown', () => finish(200));
  // While the layer is up, a key or wheel only skips it: it must not also scroll the page or reach scroll-exit.js
  // (loaded after this file, so stopping here keeps the "one more scroll at the top" from firing).
  const swallow = event => {
    if (!layer.isConnected) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    finish(200);
  };
  window.addEventListener('keydown', swallow);
  window.addEventListener('wheel', swallow, { passive: false });
  window.addEventListener('pageshow', event => { if (event.persisted) finish(0); });
})();
