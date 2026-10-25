// /about/ stat window: tabs (arrow keys, Home, End) and the count-up, run through the shared window.motionLoop.
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
