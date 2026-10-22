// Shared play/pause for the animation scripts (2026-10-22): one requestAnimationFrame loop that runs only while its target is
// on screen, the tab is visible, reduced motion is off and the script's own canPlay() agrees, and stops itself otherwise.
// Every animation used to copy this; now they all call window.motionLoop({ target, tick, ... }) and keep only their own drawing.
//   target     the element watched with an IntersectionObserver (required)
//   threshold  how much of it must show to count as on screen (default 0 = any part)
//   tick(dt)   called every frame with the seconds since the last one, at most maxDt (default 0.05); the first frame after a
//              start gets 0, so a pause never makes the animation jump
//   canPlay()  optional extra condition, e.g. the project card is not hidden behind another tab
//   onSeen(on) optional, when the target enters or leaves the screen
//   onReduce(matches)  optional, when the reduced-motion setting changes; the script redraws its still picture there
//   cancelAtOnce  true: a frame already waiting is cancelled as soon as the loop should not run, and the next start begins
//              with dt 0 (the cartridge and tab rows); default: the waiting frame stops itself, so leaving the screen and
//              coming back in the same moment doesn't skip a frame. A hidden tab always cancels at once.
// It returns { update }: call it after the script's own events change canPlay() (it starts or stops the loop as needed).
// window.motionLoop.reduce is the shared reduced-motion query, so scripts read .matches from one place.
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionLoop = ({ target, threshold = 0, tick, maxDt = 0.05, canPlay, onSeen, onReduce, cancelAtOnce = false }) => {
    let seen = !('IntersectionObserver' in window);
    let raf = 0;
    let last = null;
    const should = () => seen && !document.hidden && !reduce.matches && (!canPlay || canPlay());
    const frame = now => {
      raf = 0;
      if (!should()) return;
      const dt = last === null ? 0 : Math.min(maxDt, (now - last) / 1000);
      last = now;
      tick(dt);
      if (!raf) raf = window.requestAnimationFrame(frame);
    };
    const update = () => {
      if (should()) {
        if (!raf) {
          last = null;
          raf = window.requestAnimationFrame(frame);
        }
      } else if (raf && (cancelAtOnce || document.hidden)) {
        window.cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    if (!seen) {
      new IntersectionObserver(entries => {
        seen = entries[0].isIntersecting;
        if (onSeen) onSeen(seen);
        update();
      }, { threshold }).observe(target);
    }
    document.addEventListener('visibilitychange', update);
    reduce.addEventListener('change', () => {
      if (onReduce) onReduce(reduce.matches);
      update();
    });
    return { update };
  };
  motionLoop.reduce = reduce;
  window.motionLoop = motionLoop;
})();
