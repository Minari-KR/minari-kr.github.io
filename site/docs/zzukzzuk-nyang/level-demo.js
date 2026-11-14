// Live demo on the level-editor slide: drag the dishes of the "집" level, the checks react at once.
const P0 = [[0, 1.9], [-2, -0.1], [2, -0.1], [-2, -3.9], [2, -3.9]];   // levels.json "집" (world: x right, y up)
const E = [[3, 1], [1, 0], [0, 2], [2, 4], [4, 3]];
let P = P0.map((p) => [...p]);
const svg = document.getElementById('g-board'), out = document.getElementById('g-checks');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const snap = (v) => +(Math.round(v / 0.05) * 0.05).toFixed(2);

let grid = '';
for (let x = -2; x <= 2; x++) grid += `M${x} -2.2V4.2`;
for (let y = -4; y <= 2; y++) grid += `M-2.6 ${-y}H2.6`;
svg.innerHTML = `<rect class="g-bd" x="-2.6" y="-2.2" width="5.2" height="6.4"/><path class="g-grid" d="${grid}"/>`
  + E.map(() => '<line class="g-ln"/>').join('')
  + P.map((_, i) => `<g class="g-dish" tabindex="0" role="button" aria-label="접시 ${i + 1}"><circle r=".5"/><text transform="scale(.025)">${i + 1}</text></g>`).join('');
const lines = [...svg.querySelectorAll('.g-ln')], dishes = [...svg.querySelectorAll('.g-dish')];

const segDist = (p, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
};

function render() {
  const msgs = new Set(), badDish = new Set(), badLine = new Set();
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
    const d = Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]);
    if (d < 1.3) { msgs.add(`접시 사이가 너무 가까움 (${d.toFixed(2)})`); badDish.add(i).add(j); }
  }
  E.forEach(([a, b], k) => P.forEach((p, c) => {
    if (c !== a && c !== b && segDist(p, P[a], P[b]) < 0.25) { msgs.add('접시가 선에 너무 가까움'); badDish.add(c); badLine.add(k); }
  }));
  P.forEach((p, c) => {
    const nb = E.filter((e) => e.includes(c)).map((e) => e[0] === c ? e[1] : e[0]);
    if (nb.length !== 2) return;
    const [u, v] = nb.map((n) => [P[n][0] - p[0], P[n][1] - p[1]]);
    const ang = Math.acos((u[0] * v[0] + u[1] * v[1]) / Math.hypot(...u) / Math.hypot(...v)) * 180 / Math.PI;
    if (ang > 170) { msgs.add('거의 일직선: 게임에서 접시를 건너뛸 수 있음'); badDish.add(c); }
  });
  E.forEach(([a, b], k) => {
    lines[k].setAttribute('x1', P[a][0]); lines[k].setAttribute('y1', -P[a][1]);
    lines[k].setAttribute('x2', P[b][0]); lines[k].setAttribute('y2', -P[b][1]);
    lines[k].classList.toggle('g-bad', badLine.has(k));
  });
  dishes.forEach((g, i) => {
    g.setAttribute('transform', `translate(${P[i][0]} ${-P[i][1]})`);
    g.dataset.x = P[i][0]; g.dataset.y = P[i][1];
    g.classList.toggle('g-bad', badDish.has(i));
  });
  const html = msgs.size ? [...msgs].map((m) => `<p class="g-warn">${m}</p>`).join('') : '<p class="g-ok">문제 없음</p>';
  if (out.innerHTML !== html) out.innerHTML = html;   // only touch the live region when the text changes
}
const move = (i, x, y) => { P[i] = [snap(clamp(x, -2.6, 2.6)), snap(clamp(y, -4.2, 2.2))]; render(); };

let drag = null;
const world = (e) => { const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse()); return [p.x, -p.y]; };
svg.addEventListener('pointerdown', (e) => {
  const g = e.target.closest('.g-dish');
  if (!g) return;
  const i = dishes.indexOf(g), w = world(e);
  drag = { i, dx: P[i][0] - w[0], dy: P[i][1] - w[1] };
  g.setPointerCapture(e.pointerId);
  e.preventDefault();
});
svg.addEventListener('pointermove', (e) => { if (drag) { const w = world(e); move(drag.i, w[0] + drag.dx, w[1] + drag.dy); } });
svg.addEventListener('pointerup', () => { drag = null; });
svg.addEventListener('pointercancel', () => { drag = null; });
svg.addEventListener('keydown', (e) => {
  const g = e.target.closest('.g-dish'), k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
  if (!g || !k) return;
  e.preventDefault(); e.stopPropagation();   // deck.js pages on ArrowLeft/Right, the page scrolls on Up/Down
  const i = dishes.indexOf(g), s = e.shiftKey ? 0.25 : 0.05;
  move(i, P[i][0] + k[0] * s, P[i][1] + k[1] * s);
});
document.querySelector('.g-reset').addEventListener('click', () => { P = P0.map((p) => [...p]); render(); });
render();
