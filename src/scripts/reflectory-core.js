// Reflectory core play on the home card (2026-10-21 user request): the game's own look — paper grid, grey block walls,
// blue walls and balls, orange dashed path, red enemies — redrawn with canvas. The player drags four walls into a loop,
// balls keep firing from the gap below and the loop carries them round, hitting the enemies on their lanes. The fire
// interval (0.45 s), wall limit (5) and HP (12) are the game's values; speeds and enemy health are chosen to read well.
// One loop takes 21 s. Off screen, on a hidden card, in a hidden tab or with reduced
// motion it stops (motion-loop.js); reduced motion shows the three steps as still pictures instead.
(() => {
  const root = document.querySelector('[data-reflectory-core]');
  const screen = root && root.querySelector('canvas[data-core-screen]');
  if (!screen || !screen.getContext) return;

  const W = 960, H = 400, CELL = 40;
  const COL = {
    paper: '#f5f1e8', paperGrid: 'rgba(120,160,200,.16)', floor: '#fff', floorGrid: '#cfe0f1', block: '#666',
    wall: '#3d8fe0', wallDrag: '#1d4f9a', placeFx: '#99ebff', ball: '#1767dc', wallHitFx: 'rgba(0,115,255,.5)',
    preview: 'rgba(235,140,70,.85)', lane: '#c93a52', target: '#f2cc45',
    enemy: '#ef5f6f', hpBar: '#4caf50', hitFx: '#ffd966', deathFx: '#ff8c73',
  };
  const ROOM = { x0: 60, y0: 80, x1: 900, y1: 320 };
  const GAP_X = 620, TOP = 120, BOT = 280, LEFT = 120;
  const LAUNCH = { x: GAP_X, y: 352 }, DIR = { x: 0, y: -1 };
  const SPEED = 190, FIRE_AT = 6.6, FIRE_EVERY = 0.45, FIRE_UNTIL = 19.6, LOOP = 21;
  const D = 24 / Math.SQRT2;
  // The four walls the player drags, from where the drag starts to where it ends.
  const WALLS = [
    { a: { x: GAP_X - D, y: TOP - D }, b: { x: GAP_X + D, y: TOP + D } },
    { a: { x: LEFT + D, y: TOP - D }, b: { x: LEFT - D, y: TOP + D } },
    { a: { x: LEFT - D, y: BOT - D }, b: { x: LEFT + D, y: BOT + D } },
    { a: { x: 820, y: BOT - 28 }, b: { x: 820, y: BOT + 28 } },
  ].map((w, i) => ({ ...w, t0: 0.9 + i * 1.3, t1: 1.7 + i * 1.3 }));
  // Enemies walk across first, then up or down, as in the game.
  const LANES = [
    { from: { x: 80, y: TOP }, turn: { x: 862, y: TOP }, to: { x: 862, y: 200 } },
    { from: { x: 862, y: BOT }, turn: { x: 80, y: BOT }, to: { x: 80, y: 200 } },
  ];
  const ENEMY_R = 13, ENEMY_SPEED = 34, ENEMY_HP = 3;
  const SPAWNS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

  const hitWall = (p, d, len, w) => {
    const ex = w.b.x - w.a.x, ey = w.b.y - w.a.y, den = d.x * ey - d.y * ex;
    if (Math.abs(den) < 1e-9) return null;
    const ax = w.a.x - p.x, ay = w.a.y - p.y;
    const t = (ax * ey - ay * ex) / den, u = (ax * d.y - ay * d.x) / den;
    if (t <= 1e-6 || t > len || u < 0 || u > 1) return null;
    const n = Math.hypot(ex, ey);
    return { t, nx: -ey / n, ny: ex / n };
  };
  const reflect = (d, h) => { const k = d.x * h.nx + d.y * h.ny; return { x: d.x - 2 * k * h.nx, y: d.y - 2 * k * h.ny }; };
  const inRoom = (x, y) => (y >= ROOM.y1 && Math.abs(x - GAP_X) < CELL / 2
    ? y < H + 20 : x > ROOM.x0 && x < ROOM.x1 && y > ROOM.y0 && y < ROOM.y1);
  const nearest = (p, d, walls, len) => {
    let best = null;
    for (const w of walls) { const h = hitWall(p, d, len, w); if (h && (!best || h.t < best.t)) best = h; }
    return best;
  };

  // A fixed seed keeps every loop, and the still pictures, the same.
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const burst = (x, y, col, n, speed) => Array.from({ length: n }, () => {
    const q = rnd() * Math.PI * 2, v = speed * (0.5 + rnd() * 0.5);
    return { kind: 'spark', x, y, vx: Math.cos(q) * v, vy: Math.sin(q) * v, col, life: 0.25 + rnd() * 0.08, age: 0 };
  });

  const fresh = () => { seed = 7; return { time: 0, balls: [], fired: 0, bounces: 0, enemies: [], spawned: 0, fx: [], placed: [], hp: 12 }; };
  const enemyAt = e => {
    const L = LANES[e.lane], d1 = Math.abs(L.turn.x - L.from.x), d2 = Math.abs(L.to.y - L.turn.y), s = Math.min(e.dist, d1 + d2);
    if (s <= d1) return { x: L.from.x + Math.sign(L.turn.x - L.from.x) * s, y: L.from.y, done: false };
    return { x: L.turn.x, y: L.turn.y + Math.sign(L.to.y - L.turn.y) * (s - d1), done: s >= d1 + d2 };
  };

  const step = (s, dt) => {
    const t = s.time + dt;
    WALLS.forEach((w, i) => {
      if (s.placed[i] || t < w.t1) return;
      s.placed[i] = true;
      const cx = (w.a.x + w.b.x) / 2, cy = (w.a.y + w.b.y) / 2;
      s.fx.push({ kind: 'ring', x: cx, y: cy, r0: 6, r1: 60, col: COL.placeFx, life: 0.34, age: 0 }, { kind: 'pulse', w, life: 0.22, age: 0 }, ...burst(cx, cy, COL.placeFx, 8, 160));
    });
    for (let at = FIRE_AT + s.fired * FIRE_EVERY; at <= t && at < FIRE_UNTIL; at = FIRE_AT + s.fired * FIRE_EVERY) {
      s.balls.push({ x: LAUNCH.x, y: LAUNCH.y, d: { ...DIR }, touched: new Set(), squash: 0 });
      s.fired++;
    }
    while (s.spawned < SPAWNS.length && SPAWNS[s.spawned] <= t) {
      s.enemies.push({ lane: s.spawned % 2, dist: 0, hp: ENEMY_HP, flash: 0, grow: 0, id: s.spawned });
      s.spawned++;
    }
    const walls = WALLS.filter((w, i) => s.placed[i]);
    for (const b of s.balls) {
      let left = SPEED * dt;
      for (let guard = 0; left > 0 && guard < 4; guard++) {
        const h = nearest(b, b.d, walls, left);
        if (!h) { b.x += b.d.x * left; b.y += b.d.y * left; break; }
        b.x += b.d.x * h.t; b.y += b.d.y * h.t; left -= h.t;
        b.d = reflect(b.d, h); b.squash = 1; s.bounces++;
      }
      b.squash = Math.max(0, b.squash - dt * 8);
      // The room's block walls take the ball away; enemies don't stop it, each touch costs them health.
      if (!inRoom(b.x, b.y)) {
        b.dead = true;
        if (b.y < H) s.fx.push({ kind: 'ring', x: b.x, y: b.y, r0: 6, r1: 8, col: COL.wallHitFx, life: 0.35, age: 0 });
      }
      for (const e of s.enemies) {
        if (e.hp <= 0) continue;
        const p = enemyAt(e), near = Math.hypot(b.x - p.x, b.y - p.y) < ENEMY_R + 6;
        if (!near) { b.touched.delete(e.id); continue; }
        if (b.touched.has(e.id)) continue;
        b.touched.add(e.id); e.hp--; e.flash = 0.09;
        if (e.hp > 0) s.fx.push(...burst(p.x, p.y, COL.hitFx, 6, 140));
        else s.fx.push(...burst(p.x, p.y, COL.deathFx, 14, 220), { kind: 'ring', x: p.x, y: p.y, r0: 4, r1: 36, col: COL.deathFx, life: 0.28, age: 0 });
      }
    }
    s.balls = s.balls.filter(b => !b.dead);
    for (const e of s.enemies) {
      if (e.hp <= 0) continue;
      e.dist += ENEMY_SPEED * dt; e.flash = Math.max(0, e.flash - dt); e.grow = Math.min(1, e.grow + dt * 2);
      if (enemyAt(e).done) { e.hp = 0; s.hp--; }
    }
    s.enemies = s.enemies.filter(e => e.hp > 0);
    for (const f of s.fx) {
      f.age += dt;
      if (f.vx !== undefined) { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.9; f.vy *= 0.9; }
    }
    s.fx = s.fx.filter(f => f.age < f.life);
    s.time = t;
  };
  const stateAt = until => { const s = fresh(); while (s.time < until) step(s, 1 / 120); return s; };

  const path = walls => {
    const pts = [{ ...LAUNCH }];
    let p = { ...LAUNCH }, d = { ...DIR };
    for (let i = 0; i < 12; i++) {
      const h = nearest(p, d, walls, 2000);
      if (!h) {
        let k = 0;
        while (k < 1200 && inRoom(p.x + d.x * (k + 2), p.y + d.y * (k + 2))) k += 2;
        pts.push({ x: p.x + d.x * k, y: p.y + d.y * k });
        break;
      }
      p = { x: p.x + d.x * h.t, y: p.y + d.y * h.t };
      pts.push(p);
      d = reflect(d, h);
    }
    return pts;
  };

  const line = (ctx, a, b, col, width) => {
    ctx.strokeStyle = col; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  };
  const dot = (ctx, x, y, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
  const room = (ctx, k) => {
    ctx.fillStyle = COL.paper; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = COL.paperGrid; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 0.5; x < W; x += 20) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0.5; y < H; y += 20) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    ctx.fillStyle = COL.floor;
    ctx.fillRect(ROOM.x0, ROOM.y0, ROOM.x1 - ROOM.x0, ROOM.y1 - ROOM.y0);
    ctx.fillRect(GAP_X - CELL / 2, ROOM.y1, CELL, CELL);
    ctx.strokeStyle = COL.floorGrid; ctx.beginPath();
    for (let x = ROOM.x0; x <= ROOM.x1; x += CELL) { ctx.moveTo(x + 0.5, ROOM.y0); ctx.lineTo(x + 0.5, ROOM.y1); }
    for (let y = ROOM.y0; y <= ROOM.y1; y += CELL) { ctx.moveTo(ROOM.x0, y + 0.5); ctx.lineTo(ROOM.x1, y + 0.5); }
    ctx.stroke();
    ctx.fillStyle = COL.block;
    const block = (x, y) => ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
    for (let x = ROOM.x0 - CELL; x < ROOM.x1 + CELL; x += CELL) {
      block(x, ROOM.y0 - CELL);
      if (Math.abs(x + CELL / 2 - GAP_X) > 1) block(x, ROOM.y1);
    }
    for (let y = ROOM.y0; y < ROOM.y1; y += CELL) { block(ROOM.x0 - CELL, y); block(ROOM.x1, y); }
    // The launch arrow under the gap
    ctx.strokeStyle = COL.wall; ctx.fillStyle = '#d8ecff'; ctx.lineWidth = 2; ctx.beginPath();
    [[0, 362], [-9, 374], [-4, 374], [-4, 390], [4, 390], [4, 374], [9, 374]].forEach(([x, y], i) => (i ? ctx.lineTo(GAP_X + x, y) : ctx.moveTo(GAP_X + x, y)));
    ctx.closePath(); ctx.fill(); ctx.stroke();
    for (const L of LANES) {
      ctx.strokeStyle = COL.lane; ctx.lineWidth = 2.5 * k; ctx.beginPath();
      ctx.moveTo(L.from.x, L.from.y); ctx.lineTo(L.turn.x, L.turn.y); ctx.lineTo(L.to.x, L.to.y); ctx.stroke();
      dot(ctx, L.from.x, L.from.y, 5 * k, COL.lane);
      dot(ctx, L.to.x, L.to.y, 5 * k, COL.target);
    }
  };
  const cursor = (ctx, p, k) => {
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(k, k); ctx.beginPath();
    [[0, 0], [0, 17], [4, 13], [7, 20], [10, 19], [7, 12], [12, 12]].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#222'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
  };

  // k thickens balls, walls and lines on narrow screens, where the 960-wide scene is drawn small.
  const draw = (ctx, s, k) => {
    const t = s.time;
    room(ctx, k);
    const walls = WALLS.filter((w, i) => s.placed[i]);
    if (walls.length) {
      ctx.save(); ctx.strokeStyle = COL.preview; ctx.lineWidth = 2 * k; ctx.setLineDash([7 * k, 5 * k]); ctx.lineDashOffset = -t * 30;
      ctx.beginPath(); path(walls).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); ctx.restore();
    }
    let hand = null;
    const rest = { x: 480, y: 220 };
    WALLS.forEach((w, i) => {
      if (s.placed[i]) { line(ctx, w.a, w.b, COL.wall, 4 * k); return; }
      if (t >= w.t0) {
        const f = (t - w.t0) / (w.t1 - w.t0);
        hand = { x: w.a.x + (w.b.x - w.a.x) * f, y: w.a.y + (w.b.y - w.a.y) * f };
        line(ctx, w.a, hand, COL.wallDrag, 4 * k);
      } else if (t >= w.t0 - 0.5) {
        const from = i ? WALLS[i - 1].b : rest, f = (t - (w.t0 - 0.5)) / 0.5;
        hand = { x: from.x + (w.a.x - from.x) * f, y: from.y + (w.a.y - from.y) * f };
      } else if (i === 0) hand = rest;
    });
    if (!hand && t < WALLS[3].t1 + 0.6) hand = WALLS[3].b;
    for (const e of s.enemies) {
      const p = enemyAt(e);
      dot(ctx, p.x, p.y, ENEMY_R * Math.min(k, 1.3) * (0.4 + 0.6 * e.grow), e.flash > 0 ? '#fff' : COL.enemy);
      if (e.hp < ENEMY_HP) {
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(p.x - 14, p.y - 22 * k, 28, 3 * k);
        ctx.fillStyle = COL.hpBar; ctx.fillRect(p.x - 14, p.y - 22 * k, 28 * e.hp / ENEMY_HP, 3 * k);
      }
    }
    // A ball squashes a little as it bounces.
    for (const b of s.balls) {
      const sq = 1 + b.squash * 0.35;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.d.y, b.d.x)); ctx.scale(1 / sq, sq);
      dot(ctx, 0, 0, 6.5 * k, COL.ball); ctx.restore();
    }
    for (const f of s.fx) {
      const p = f.age / f.life;
      ctx.globalAlpha = 1 - p;
      if (f.kind === 'ring') { ctx.strokeStyle = f.col; ctx.lineWidth = 3 * k; ctx.beginPath(); ctx.arc(f.x, f.y, f.r0 + (f.r1 - f.r0) * p, 0, Math.PI * 2); ctx.stroke(); }
      else if (f.kind === 'pulse') line(ctx, f.w.a, f.w.b, COL.placeFx, (12 * (1 - p) + 4) * k);
      else { ctx.fillStyle = f.col; ctx.fillRect(f.x - 2.5 * k, f.y - 2.5 * k, 5 * k, 5 * k); }
      ctx.globalAlpha = 1;
    }
    if (hand) cursor(ctx, hand, k);
    if (t > LOOP - 0.8) { ctx.fillStyle = `rgba(245,241,232,${Math.min(1, (t - (LOOP - 0.8)) / 0.6)})`; ctx.fillRect(0, 0, W, H); }
  };

  const fit = canvas => canvasKit.fit(canvas, W, H);

  const hud = { hp: root.querySelector('[data-core-hp]'), walls: root.querySelector('[data-core-walls]'), bounces: root.querySelector('[data-core-bounces]') };
  const shown = {};
  const setHud = s => {
    const next = { hp: `HP ${s.hp} / 12`, walls: `벽 ${s.placed.filter(Boolean).length} / 5`, bounces: `반사 ${s.bounces}` };
    for (const key in next) if (hud[key] && shown[key] !== next[key]) hud[key].textContent = shown[key] = next[key];
  };

  const stills = () => {
    for (const canvas of root.querySelectorAll('canvas[data-core-still]')) {
      if (!canvas.clientWidth) continue;
      const { ctx, k } = fit(canvas);
      draw(ctx, stateAt(Number(canvas.dataset.coreStill)), k);
    }
  };

  const motion = motionLoop.reduce;
  const card = root.closest('.project');
  let view = fit(screen), state = fresh();
  const loop = motionLoop({
    target: screen,
    // A card hidden behind another project tab doesn't play.
    canPlay: () => !(card && card.closest('.ptabs.is-ready') && !card.classList.contains('is-current')),
    tick: dt => {
      for (let left = dt; left > 0; left -= 1 / 120) step(state, Math.min(1 / 120, left));
      if (state.time >= LOOP) state = fresh();
      draw(view.ctx, state, view.k);
      setHud(state);
    },
    onReduce: () => update()
  });
  const update = () => {
    canvasKit.ready(root, motion.matches);
    if (motion.matches) stills();
    else { draw(view.ctx, state, view.k); setHud(state); loop.update(); }
  };

  if (card) new MutationObserver(loop.update).observe(card, { attributes: true, attributeFilter: ['class'] });
  let resizeTimer;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => { view = fit(screen); update(); }, 120);
  });
  update();
})();
