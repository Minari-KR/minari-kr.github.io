// "AI와 일하는 방식" on the home page: a small LCD story (I ask, Claude Opus splits the job, four AIs work, Opus reviews, it ships).
// The markup ships in its still frame; this script plays the loop by setting one phase class (s1..s14) on the screen.
// motion-loop.js stops it off screen and while the tab is hidden; with reduced motion only the still frame shows.
(() => {
  const flow = document.querySelector('[data-ai-party]');
  if (!flow) return;
  const times = [0.4, 1.4, 2.2, 3.0, 3.8, 4.6, 7.2, 8.8, 10.4, 12.4, 14.0, 15.0, 16.4, 18.4]; // phase start times (s); the redo-and-pass part is slower so it can be followed
  const loop = 19.4;
  const reduce = motionLoop.reduce;
  const still = 6; // everyone at work, one pass mark
  let phase = -1;
  let time = 0;

  const setPhase = n => {
    if (n === phase) return;
    times.forEach((_, i) => flow.classList.toggle('s' + (i + 1), i < n));
    phase = n;
  };
  const tick = dt => {
    time += dt;
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
  };
  const apply = () => {
    flow.classList.toggle('still', reduce.matches);
    phase = -1;
    time = 0;
    setPhase(reduce.matches ? still : 0);
  };

  motionLoop({ target: flow, threshold: 0.1, maxDt: 0.1, tick, onReduce: apply });
  apply();
})();