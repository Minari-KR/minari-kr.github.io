// "게임 플레이 경험" on the home page: two rows of cartridges flow across a small game screen → a pressed cartridge shows
// its record on the same screen; a press anywhere on it, Esc, Enter or Space goes back.
(() => {
  const screen = document.querySelector('[data-game-screen]');
  const rows = screen?.querySelector('[data-pack-rows]');
  if (!screen || !rows) return;
  const motion = motionLoop.reduce;

  // 8-bit sound: square-wave blips made in the browser (no sound files). Browsers only allow sound after the visitor clicks,
  // taps or presses a key on the page, so the sound engine starts on that first press; pointing before it stays silent.
  let audio = null;
  const volume = 0.035;
  const tunes = {
    point: [[1320, 0, 0.035]],
    open: [[660, 0, 0.06], [990, 0.07, 0.1]],
    close: [[990, 0, 0.05], [660, 0.06, 0.08]]
  };
  const sound = name => {
    if (!audio || audio.state !== 'running') return;
    const now = audio.currentTime;
    for (const [frequency, at, length] of tunes[name]) {
      const tone = audio.createOscillator();
      const level = audio.createGain();
      tone.type = 'square';
      tone.frequency.value = frequency;
      level.gain.setValueAtTime(volume, now + at);
      level.gain.exponentialRampToValueAtTime(0.0001, now + at + length);
      tone.connect(level).connect(audio.destination);
      tone.start(now + at);
      tone.stop(now + at + length + 0.02);
    }
  };
  const wake = () => {
    if (!audio) {
      const Context = window.AudioContext || window.webkitAudioContext;
      audio = Context ? new Context() : null;
    }
    if (audio?.state === 'suspended') audio.resume?.();
  };
  for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, wake, { capture: true, passive: true });

  const detail = screen.querySelector('.gs-detail');
  const big = detail.querySelector('.gs-big');
  const name = detail.querySelector('.gs-name');
  const status = screen.querySelector('[data-game-status]');
  let selected = null;

  let lastPoint = 0;
  let pointed = null;
  // A short blip when a cartridge is pointed at or focused (at most one every 80ms while rows slide under the pointer).
  const point = pack => {
    if (!pack || pack === pointed) return;
    pointed = pack;
    const now = performance.now();
    if (now - lastPoint < 80) return;
    lastPoint = now;
    sound('point');
  };
  rows.addEventListener('pointerover', event => point(event.target.closest('.pack')));
  rows.addEventListener('pointerleave', () => { pointed = null; });
  rows.addEventListener('focusin', event => point(event.target.closest('.pack')));

  const restart = (element, className) => {
    element.classList.remove(className);
    void element.offsetWidth; // restart the CSS animation
    element.classList.add(className);
  };
  const open = pack => {
    const from = pack.getBoundingClientRect();
    selected = pack;
    pack.classList.add('is-selected');
    for (const field of detail.querySelectorAll('[data-field]')) {
      const value = pack.dataset[field.dataset.field] || '';
      field.textContent = value;
      field.hidden = !value;
    }
    for (const stat of detail.querySelectorAll('[data-stat]')) stat.hidden = !pack.dataset[stat.dataset.stat];
    // A group with nothing to show (e.g. no hours or achievements yet) drops out with its dashed rule.
    for (const group of detail.querySelectorAll('.gs-info, .gs-stat')) group.hidden = [...group.children].every(stat => stat.hidden);
    const copy = pack.cloneNode(true);
    for (const attribute of ['aria-label', 'aria-hidden', 'data-clone']) copy.removeAttribute(attribute);
    copy.classList.remove('is-selected');
    copy.disabled = true;
    copy.tabIndex = -1;
    big.replaceChildren(copy);
    screen.dataset.state = 'detail';
    detail.hidden = false;
    rows.inert = true;
    restart(detail, 'is-on');
    sound('open');
    const { title, hours, achievements } = pack.dataset;
    status.textContent = [`${title} 기록`, hours && `플레이 시간 ${hours}`, achievements && `업적 ${achievements}`, '화면을 누르거나 Esc로 돌아가기'].filter(Boolean).join(', ');
    // The chosen cartridge flies from its place in the row to the record view.
    if (!motion.matches && copy.animate) {
      const to = copy.getBoundingClientRect();
      const dx = from.left + from.width / 2 - (to.left + to.width / 2);
      const dy = from.top + from.height / 2 - (to.top + to.height / 2);
      copy.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${from.width / to.width})` }, { transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.2, .7, .2, 1)' });
    }
    name.focus({ preventScroll: true });
  };
  const close = () => {
    if (detail.hidden) return;
    detail.hidden = true;
    detail.classList.remove('is-on');
    rows.inert = false;
    screen.dataset.state = 'select';
    sound('close');
    status.textContent = '';
    if (!selected) return;
    selected.classList.remove('is-selected');
    const original = selected.hasAttribute('data-clone') ? [...rows.querySelectorAll('.pack:not([data-clone])')].find(pack => pack.dataset.title === selected.dataset.title) : selected;
    original?.focus({ preventScroll: true });
    selected = null;
  };
  // The record closes with a press anywhere on the screen, Esc, Enter or Space.
  detail.addEventListener('click', close);
  screen.addEventListener('keydown', event => {
    if (screen.dataset.state === 'detail' && ['Escape', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      close();
    }
  });
  rows.addEventListener('click', event => {
    const pack = event.target.closest('.pack');
    if (pack) open(pack);
  });

  // Repeat each row until half of it is wider than the screen, then duplicate that half so the row can wrap around
  // without a seam.
  const tracks = [...rows.querySelectorAll('.pack-track')];
  const originals = tracks.map(track => [...track.children]);

  // Rows are moved here frame by frame so they handle like cartridges on a table (2026-10-14 user choice "탄성 카트리지"):
  // a grabbed row brakes within about 0.15s and then follows the pointer; let go, it glides on at the speed it was thrown
  // and blends back into its own flow without ever stopping. While a row runs faster or slower than its flow, its
  // cartridges lean against the motion (up to --pack-tilt) and wobble back on a spring as it settles. The top row runs
  // right, the lower one left and a little slower. A row eases to a stop while a cartridge in it has keyboard focus, and
  // behind an open record every row crawls at 0.3×. Only transforms are written per frame; sizes are read on layout.
  const lanes = tracks.map((track, index) => Object.assign(
    flowRow({ row: track.closest('.pack-row'), track, canGrab: () => screen.dataset.state !== 'detail' }),
    { track, flow: (index % 2 ? -1 : 1) * (index ? 0.8 : 1), tilt: 0, spin: 0, shown: '' }
  ));
  const setting = (name, fallback) => {
    const value = Number.parseFloat(getComputedStyle(screen).getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
  };
  let speed = 32;
  let maxTilt = 9;
  const step = dt => {
    const pace = screen.dataset.state === 'detail' ? 0.3 : 1;
    for (const lane of lanes) {
      if (!lane.half) continue;
      const flow = lane.focused ? 0 : lane.flow * speed * pace;
      lane.step(dt, flow);
      // The lean follows how far the row is from its own flow, on a damped spring so it wobbles a little as it settles.
      const lean = Math.max(-maxTilt, Math.min(maxTilt, -(lane.v - flow) * 0.012));
      lane.spin += ((lean - lane.tilt) * 190 - lane.spin * 9) * dt;
      lane.tilt += lane.spin * dt;
      const tilt = Math.abs(lane.tilt) < 0.05 && Math.abs(lane.spin) < 0.05 ? '0deg' : `${Math.max(-maxTilt, Math.min(maxTilt, lane.tilt)).toFixed(2)}deg`;
      if (tilt !== lane.shown) {
        lane.track.style.setProperty('--tilt', tilt);
        lane.shown = tilt;
      }
    }
  };
  const layout = () => {
    speed = setting('--pack-speed', 32);
    maxTilt = setting('--pack-tilt', 9);
    lanes.forEach((lane, index) => {
      const { track } = lane;
      lane.clear();
      track.classList.remove('is-looping');
      track.style.removeProperty('--tilt');
      lane.shown = '';
      if (motion.matches) return;
      const setWidth = originals[index].reduce((sum, pack) => sum + pack.offsetWidth + Number.parseFloat(getComputedStyle(pack).marginRight || 0), 0);
      if (!setWidth) return;
      lane.fill(originals[index], setWidth, rows.clientWidth, clone => clone.classList.remove('is-selected'));
      if (!lane.v) lane.v = lane.flow * speed;
      track.classList.add('is-looping');
    });
    loop.update();
  };

  // The rows only run while the screen is on screen, the tab is visible and motion is allowed (motion-loop.js); the hint's
  // blinking stops with them (games.css: .is-away).
  const loop = motionLoop({
    target: screen,
    tick: step,
    canPlay: () => lanes.some(lane => lane.half),
    cancelAtOnce: true,
    onSeen: on => screen.classList.toggle('is-away', !on),
    onReduce: layout
  });
  // Lay the rows out again once the pixel font is ready and after the window is resized.
  let resizeTimer;
  let width = rows.clientWidth;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (rows.clientWidth === width) return;
      width = rows.clientWidth;
      layout();
    }, 200);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  else layout();
})();
