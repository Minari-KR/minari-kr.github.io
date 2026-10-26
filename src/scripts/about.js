// /about/ page: the game spiral and the tool inventory filter. Without this file the page still shows every image and slot.
// The spiral's clock runs inside window.motionLoop (motion-loop.js), which also stops it off-screen, in a hidden tab and under reduced motion.
(() => {
  const spiral = document.querySelector('[data-spiral]');
  if (spiral) {
    // Each card is a point on a helix, projected by hand to a 2D matrix every frame (no WebGL). Values follow React Bits 'Infinite Spiral'.
    const cards = [...spiral.querySelectorAll('.spiral-card')];
    const perTurn = 7;
    const speed = 0.55; // cards per second, travelling up
    const perspective = 1000;
    const centerScale = 1.2;
    const edgeFade = 0.3;
    const edgeBlur = 6;
    let offset = 0;
    let pace = 1; // 1 = full speed, eased to 0 while a mouse hovers
    let hover = false;
    const count = cards.length; // the 11 games; a card that leaves at the top comes back at the bottom
    let w = 0;
    let h = 0;
    let loop;

    const draw = () => {
      const k = Math.min(1, w / 300); // 300px is the PC column; phones use the same helix, scaled down only if narrower
      const radius = 90 * k;
      const spacing = Math.max(56 * k, h / (count - 2)); // tall columns spread the cards so the stream still fills the height
      const half = h / 2;
      cards.forEach((card, i) => {
        // Slot i of a stream of count cards, wrapped so the stream never ends.
        const p = ((((i - offset + count / 2) % count) + count) % count) - count / 2;
        const angle = (2 * Math.PI * p) / perTurn;
        const z = radius * Math.cos(angle);
        const y = p * spacing;
        const c = Math.max(0, 1 - Math.abs(y) / half);
        const s = (perspective / (perspective - z)) * (1 + (centerScale - 1) * c * c * (3 - 2 * c));
        const edge = Math.min(1, Math.max(0, (Math.abs(y) / half - (1 - edgeFade)) / edgeFade));
        const px = Math.round(radius * Math.sin(angle) * (perspective / (perspective - z)) * 100) / 100;
        card.style.visibility = edge >= 1 ? 'hidden' : 'visible';
        card.style.transform = `matrix(${s}, 0, 0, ${s}, ${px}, ${y * (perspective / (perspective - z))})`;
        card.style.zIndex = Math.round(z + radius);
        card.style.opacity = 1 - edge;
        card.style.filter = edge > 0 ? `blur(${(edgeBlur * edge).toFixed(2)}px)` : 'none';
      });
    };
    const size = () => {
      w = spiral.clientWidth;
      h = spiral.clientHeight;
      spiral.style.setProperty('--card', `${Math.round(92 * Math.min(1, w / 300))}px`);
      draw();
    };

    spiral.classList.add('is-live');
    size();
    new ResizeObserver(size).observe(spiral);

    // Mouse only: a tap on a phone must not pause it for good. The speed eases to 0 and back instead of stopping at once.
    spiral.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') hover = true; });
    spiral.addEventListener('pointerleave', () => { hover = false; loop.update(); });

    loop = window.motionLoop({
      target: spiral,
      canPlay: () => !hover || pace > 0.001,
      onReduce: draw,
      tick: dt => {
        pace += ((hover ? 0 : 1) - pace) * (1 - Math.exp(-dt / 0.1));
        offset += speed * pace * dt;
        draw();
      },
    });
  }

  const inventory = document.querySelector('[data-inventory]');
  if (inventory) {
    const tabs = [...inventory.querySelectorAll('[data-filter]')];
    const slots = [...inventory.querySelectorAll('[data-slot]')];
    const status = inventory.querySelector('[data-filter-status]');
    inventory.classList.add('is-live');
    inventory.querySelector('[data-filters]').hidden = false;
    tabs.forEach(tab => tab.addEventListener('click', () => {
      tabs.forEach(other => other.setAttribute('aria-pressed', String(other === tab)));
      const picked = slots.filter(slot => tab.dataset.filter === '전체' || slot.dataset.group === tab.dataset.filter);
      slots.forEach(slot => slot.classList.toggle('is-dim', !picked.includes(slot)));
      // Dimming is only visual, so the result is also read out: "AI 4개: GPT, Claude, Grok, Gemini".
      status.textContent = `${tab.dataset.filter} ${picked.length}개: ${picked.map(slot => slot.querySelector('.inv-name').textContent).join(', ')}`;
    }));
  }
})();
