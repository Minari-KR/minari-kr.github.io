// "AI 협업 방식" on the home page: a small LCD story (I ask, Claude Opus splits the job, four AIs work, Opus reviews, it ships).
// The markup ships in its still frame; this script plays the loop by setting one phase class (s1..s14) on the screen.
// It stops off screen and while the tab is hidden, and shows only the still frame when the visitor asks for reduced motion.
(() => {
  const flow = document.querySelector('[data-ai-party]');
  if (!flow) return;
  const times = [0.4, 1.4, 2.2, 3.0, 3.8, 4.6, 7.2, 8.8, 10.4, 12.4, 14.0, 15.0, 16.4, 18.4]; // phase start times (s); the redo-and-pass part is slower so it can be followed
  const loop = 19.4;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const still = 6; // everyone at work, one pass mark
  let phase = -1;
  let time = 0;
  let last = 0;
  let seen = false;
  let running = false;

  const setPhase = n => {
    if (n === phase) return;
    times.forEach((_, i) => flow.classList.toggle('s' + (i + 1), i < n));
    phase = n;
  };
  const tick = now => {
    if (!running) return;
    time += Math.min((now - last) / 1000, 0.1);
    last = now;
    if (time >= loop) {
      time -= loop;
      // Back to the start without playing the fade-out backwards.
      flow.classList.add('rs');
      setPhase(0);
      void flow.offsetWidth;
      flow.classList.remove('rs');
    }
    let n = 0;
    while (n < times.length && time >= times[n]) n++;
    setPhase(n);
    requestAnimationFrame(tick);
  };
  const update = () => {
    const should = seen && !document.hidden && !reduce.matches;
    if (should && !running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(tick);
    } else if (!should) running = false;
  };
  const apply = () => {
    flow.classList.toggle('still', reduce.matches);
    phase = -1;
    time = 0;
    setPhase(reduce.matches ? still : 0);
    update();
  };

  new IntersectionObserver(entries => { seen = entries[0].isIntersecting; update(); }, { threshold: 0.1 }).observe(flow);
  document.addEventListener('visibilitychange', update);
  reduce.addEventListener('change', apply);
  apply();
})();