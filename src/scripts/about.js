// /about/ page: the top-games pack caption, the stat window (tabs, count-up through the shared window.motionLoop) and the work card flips.
// Without this script the play times and both card faces stay visible as text.
(() => {
  const lcd = document.querySelector('[data-top-games]');
  const caption = lcd?.querySelector('[data-top-caption]');
  if (!caption) return;
  const packs = [...lcd.querySelectorAll('.pack')];
  const line = text => Object.assign(document.createElement('span'), { className: 'caption-line', textContent: text });
  // A pressed pack shows its play time and genre in the LCD caption; pressing it again clears the caption.
  const show = pack => {
    packs.forEach(item => {
      item.setAttribute('aria-pressed', String(item === pack));
      item.classList.toggle('is-selected', item === pack);
    });
    caption.replaceChildren(...(pack ? [line(pack.dataset.title), line(`${pack.dataset.hours} · ${pack.dataset.genre}`)] : [line('팩을 눌러 보세요')]));
  };
  packs.forEach(pack => pack.addEventListener('click', () => show(pack.getAttribute('aria-pressed') === 'true' ? null : pack)));
  lcd.classList.add('is-ready');
  caption.hidden = false;
  show(null);
})();

(() => {
  // A card flips between its picture and its award/event line (CSS rotates it; reduced motion just swaps).
  for (const card of document.querySelectorAll('[data-work]')) {
    const faces = [...card.querySelectorAll('.work-face')];
    const button = Object.assign(document.createElement('button'), { type: 'button', className: 'action work-flip', textContent: '수상·행사 보기' });
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      const flipped = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(flipped));
      faces[0].classList.toggle('is-shown', !flipped);
      faces[1].classList.toggle('is-shown', flipped);
    });
    card.append(button);
    card.classList.add('is-ready');
  }
})();

(() => {
  const root = document.querySelector('[data-about-stats]');
  if (!root || !window.motionLoop) return;
  const list = root.querySelector('[role="tablist"]');
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
  const select = (index, focus) => {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].classList.toggle('is-current', i === index);
    });
    if (focus) tabs[index].focus();
  };
  panels.forEach((panel, i) => {
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tabs[i].id);
  });
  tabs.forEach((tab, i) => tab.addEventListener('click', () => select(i)));
  list.addEventListener('keydown', event => {
    const at = tabs.indexOf(document.activeElement);
    const next = { ArrowRight: at + 1, ArrowDown: at + 1, ArrowLeft: at - 1, ArrowUp: at - 1, Home: 0, End: tabs.length - 1 }[event.key];
    if (at < 0 || next === undefined) return;
    event.preventDefault();
    select((next + tabs.length) % tabs.length, true);
  });
  list.hidden = false;
  root.classList.add('is-ready');

  // Counts tick up from 0 in 6 steps over 0.6s; reduced motion keeps the final numbers.
  const counts = [...root.querySelectorAll('[data-count]')];
  const STEPS = 6;
  const show = step => counts.forEach(el => { el.textContent = String(Math.round(Number(el.dataset.count) * step / STEPS)); });
  if (window.motionLoop.reduce.matches) return;
  let time = 0;
  let step = 0;
  show(0);
  window.motionLoop({
    target: root,
    threshold: 0.1,
    canPlay: () => step < STEPS,
    onReduce: on => { if (on) { step = STEPS; show(STEPS); } },
    tick: dt => {
      time += dt;
      const next = Math.min(STEPS, Math.floor(time / 0.6 * STEPS));
      if (next !== step) { step = next; show(step); }
    }
  });
})();
