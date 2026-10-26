(() => {
  // First visit in a tab: black layer, game cards rise one after another and stack, then the layer dissolves.
  // Everything is sequenced with Web Animation `finished` promises, so no timer or frame loop is needed.
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
  const STAGGER = 100, RISE = 700, HOLD = 200, FADE = 600;
  let anims = [];
  let ending = false;

  const finish = ms => {
    if (ending) return;
    ending = true;
    for (const anim of anims) anim.cancel();
    if (ms === 0 || layer.hidden) { remove(); return; }
    const fade = layer.animate({ opacity: [1, 0] }, { duration: ms, easing: 'ease', fill: 'forwards' });
    fade.finished.then(remove, remove);
  };

  const play = () => {
    if (ending) return;
    layer.classList.remove('is-waiting');
    anims = cards.map((card, i) => {
      const side = i % 2 ? 1 : -1;
      const rest = `translateY(${-i * 2}px) scale(1) rotate(${(side * 6 * (1 - i / 12)).toFixed(2)}deg)`;
      return card.animate(
        [{ transform: 'translateY(calc(100vh + 200px)) scale(1.6) rotate(0deg)' }, { transform: rest }],
        { duration: RISE, delay: i * STAGGER, easing: EASE, fill: 'both' }
      );
    });
    anims[anims.length - 1].finished.then(() => {
      if (ending) return;
      const fade = layer.animate({ opacity: [1, 0] }, { duration: FADE, delay: HOLD, easing: 'ease', fill: 'both' });
      anims.push(fade);
      fade.finished.then(() => { ending = true; remove(); }, () => {});
    }, () => {});
  };

  // The black layer goes up at once (so the page never flashes before it); the cards wait, hidden, until their pictures
  // are decoded. An empty animation on no element is the 1.5s deadline: past it the layer just fades away.
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
  layer.querySelector('[data-intro-skip]')?.addEventListener('click', () => finish(200));
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
