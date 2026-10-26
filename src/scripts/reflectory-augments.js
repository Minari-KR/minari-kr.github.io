// Reflectory augments on the detail page (2026-10-21 user choice C): one game screen and the game's six augment cards.
// Pressing a card plays that augment; until one is pressed the screen moves on to the next augment after each scene.
// Every scene uses the game's numbers from its code: ball speed 6.5 tiles/s, a ball every 0.45 s, 5 walls of up to 3.5
// tiles; 번식 splits the first bounce 10° apart, 피해 증가 adds 1 damage after the first bounce, 추가 벽 doubles the
// walls to 10, 거대 벽 doubles the length to 7, 거울 오라 hurts enemies within 1.6 tiles of a wall once a second, and 터렛
// puts a turret on each wall that fires a homing shot (speed 9) every second at the nearest enemy within 7.35 tiles.
// Enemy health, speed and lanes are chosen to read well (the game's enemies have 1 health, so 피해 증가 shows a 2).
// Off screen or in a hidden tab it stops (motion-loop.js); with reduced motion it shows a still picture of the chosen augment and doesn't move on.
(() => {
  const root = document.querySelector('[data-reflectory-augments]');
  const canvas = root && root.querySelector('canvas');
  if (!canvas || !canvas.getContext) return;

  const RW = 12, RH = 10, W = 960, H = 540, T = 40;
  const COL = {
    paper: '#f5f1e8', paperGrid: 'rgba(120,160,200,.16)', floorGrid: '#cfe0f1', block: '#666', wall: '#3d8fe0', wallDrag: '#1d4f9a',
    ball: '#1767dc', preview: 'rgba(235,140,70,.85)', lane: '#c93a52', target: '#f2cc45', enemy: '#ef5f6f', hpBar: '#4caf50',
    aura: 'rgba(115,217,255,.75)', auraFill: 'rgba(115,217,255,.10)', turret: '#ffc74d', turretEdge: '#b8860b', shot: '#ffd959',
  };
  const S = Math.SQRT1_2 * 0.85;
  const upRight = (x, y, t0, t1, k = 1) => ({ a: { x: x - S * k, y: y - S * k }, b: { x: x + S * k, y: y + S * k }, t0, t1 });
  const upLeft = (x, y, t0, t1, k = 1) => ({ a: { x: x - S * k, y: y + S * k }, b: { x: x + S * k, y: y - S * k }, t0, t1 });
  const seg = (ax, ay, bx, by, t0, t1) => ({ a: { x: ax, y: ay }, b: { x: bx, y: by }, t0, t1 });
  const lane = (x, spawns, hp, speed) => ({ path: [{ x, y: 8.5 }, { x, y: 1.5 }], spawns, hp, speed });
  // 추가 벽: ten walls zigzag the room so one ball bounces ten times
  const snake = [[6, 2.2, 'L'], [2, 2.2, 'L'], [2, 4, 'R'], [9, 4, 'R'], [9, 6, 'L'], [2, 6, 'L'], [2, 8, 'R'], [10, 8, 'L'], [10, 1.5, 'R'], [1.5, 1.5, 'L']]
    .map(([x, y, d], i) => (d === 'R' ? upRight : upLeft)(x, y, 0.3 + i * 0.45, 0.6 + i * 0.45, 0.8));
  const SCENES = {
    duplicate: { name: '번식', length: 10, still: 5, fire: 1.2, split: true, walls: [upRight(6, 3.5, 0.4, 1.0)], lanes: [lane(9.5, [1.0, 2.2, 3.4, 4.6], 3, 1.1)], max: 5 },
    damage: { name: '피해 증가', length: 10, still: 4, fire: 1.2, boost: true, walls: [upRight(6, 3.5, 0.4, 1.0)], lanes: [lane(9.5, [1.0, 2.2, 3.4, 4.6, 5.8], 2, 1.2)], max: 5 },
    'more-walls': { name: '추가 벽', length: 12, still: 7, fire: 5.0, walls: snake, lanes: [lane(4.5, [5.0, 6.4, 7.8], 3, 0.9)], max: 10 },
    'big-walls': { name: '거대 벽', length: 10, still: 4.5, fire: 2.4, reach: true, walls: [seg(1.5, 1.5, 6.45, 6.45, 0.4, 2.0)], lanes: [lane(9.5, [2.0, 3.2, 4.4, 5.6], 2, 1.2)], max: 5 },
    aura: { name: '거울 오라', length: 11, still: 4.5, fire: 1.2, aura: true, walls: [upRight(6, 5, 0.4, 1.0)], lanes: [lane(4.6, [1.2, 2.8, 4.4], 2, 0.9)], max: 5 },
    turret: { name: '터렛', length: 11, still: 3.6, fire: 1.4, turret: true, walls: [upRight(6, 4, 0.4, 1.0), upLeft(3.2, 6.6, 1.1, 1.7)], lanes: [lane(9.5, [1.6, 3.0, 4.4], 2, 1.1), lane(1.5, [1.8, 3.4, 5.0], 2, 1.0)], max: 5 },
  };

  // The room: block walls round the edge and a two-tile gap in the floor's middle for the launcher.
  const isBlock = (x, y) => x < 1 || x >= RW - 1 || y >= RH - 1 || (y < 1 && !(x >= 5 && x < 7));
  const open = (x, y) => (y < 0 ? y > -2 && x >= 5 && x < 7 : x >= 0 && x < RW && y < RH && !isBlock(x, y));
  const { nearest, reflect, along } = canvasKit;
  const turn = (d, q) => ({ x: d.x * Math.cos(q) - d.y * Math.sin(q), y: d.x * Math.sin(q) + d.y * Math.cos(q) });
  const toSegment = (p, w) => {
    const ex = w.b.x - w.a.x, ey = w.b.y - w.a.y, t = Math.max(0, Math.min(1, ((p.x - w.a.x) * ex + (p.y - w.a.y) * ey) / (ex * ex + ey * ey)));
    return Math.hypot(p.x - (w.a.x + ex * t), p.y - (w.a.y + ey * t));
  };
  // A turret sits 0.35 tiles off the middle of its wall, on the wall's local up side, as in the game.
  const turretOf = w => { const ex = w.b.x - w.a.x, ey = w.b.y - w.a.y, n = Math.hypot(ex, ey); return { x: (w.a.x + w.b.x) / 2 - ey / n * 0.35, y: (w.a.y + w.b.y) / 2 + ex / n * 0.35 }; };

  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const burst = (x, y, col, n, speed) => Array.from({ length: n }, () => {
    const q = rnd() * Math.PI * 2, v = speed * (0.5 + rnd() * 0.5);
    return { kind: 'spark', x, y, vx: Math.cos(q) * v, vy: Math.sin(q) * v, col, life: 0.3, age: 0 };
  });

  const fresh = sc => { seed = 7; return { sc, t: 0, balls: [], enemies: [], shots: [], fx: [], placed: [], fired: 0, spawned: sc.lanes.map(() => 0), hp: 12, reload: sc.walls.map(() => 0.5), auraAt: {} }; };
  const step = (s, dt) => {
    const sc = s.sc, t = s.t + dt;
    sc.walls.forEach((w, i) => {
      if (s.placed[i] || t < w.t1) return;
      s.placed[i] = true;
      const cx = (w.a.x + w.b.x) / 2, cy = (w.a.y + w.b.y) / 2;
      s.fx.push({ kind: 'ring', x: cx, y: cy, r0: 0.15, r1: 1.5, col: '#99ebff', life: 0.34, age: 0 }, ...burst(cx, cy, '#99ebff', 8, 4));
    });
    for (let at = sc.fire + s.fired * 0.45; at <= t; at = sc.fire + s.fired * 0.45) { s.balls.push({ x: 6, y: -0.8, d: { x: 0, y: 1 }, bounced: false, touched: new Set() }); s.fired++; }
    sc.lanes.forEach((L, n) => {
      while (s.spawned[n] < L.spawns.length && L.spawns[s.spawned[n]] <= t) { s.enemies.push({ L, dist: 0, hp: L.hp, flash: 0, id: n * 100 + s.spawned[n] }); s.spawned[n]++; }
    });
    const walls = sc.walls.filter((w, i) => s.placed[i]);
    const hurt = (e, p, dmg, col) => {
      e.hp -= dmg; e.flash = 0.09;
      if (sc.boost) s.fx.push({ kind: 'num', x: p.x, y: p.y + 0.5, text: `-${dmg}`, life: 0.6, age: 0 });
      s.fx.push(...(e.hp > 0 ? burst(p.x, p.y, col, 6, 3.5) : burst(p.x, p.y, '#ff8c73', 14, 5.5)));
      if (e.hp <= 0) s.fx.push({ kind: 'ring', x: p.x, y: p.y, r0: 0.1, r1: 0.9, col: '#ff8c73', life: 0.28, age: 0 });
    };
    const born = [];
    for (const b of s.balls) {
      let left = 6.5 * dt;
      for (let g = 0; left > 0 && g < 4; g++) {
        const h = nearest(b, b.d, walls, left);
        if (!h) { b.x += b.d.x * left; b.y += b.d.y * left; break; }
        b.x += b.d.x * h.t; b.y += b.d.y * h.t; left -= h.t; b.d = reflect(b.d, h);
        if (sc.split && !b.bounced) { born.push({ x: b.x, y: b.y, d: turn(b.d, -0.1745), bounced: true, touched: new Set() }); b.d = turn(b.d, 0.1745); }
        b.bounced = true;
      }
      if (!open(b.x, b.y)) { b.dead = true; continue; }
      // Enemies don't stop a ball; each touch costs them health (2 after the first bounce with 피해 증가).
      for (const e of s.enemies) {
        if (e.hp <= 0) continue;
        const p = along(e.L.path, e.dist), near = Math.hypot(b.x - p.x, b.y - p.y) < 0.5;
        if (!near) { b.touched.delete(e.id); continue; }
        if (b.touched.has(e.id)) continue;
        b.touched.add(e.id);
        hurt(e, p, sc.boost && b.bounced ? 2 : 1, '#ffd966');
      }
    }
    s.balls.push(...born);
    s.balls = s.balls.filter(b => !b.dead);
    if (sc.aura) for (const e of s.enemies) {
      if (e.hp <= 0) continue;
      const p = along(e.L.path, e.dist);
      if (walls.some(w => toSegment(p, w) <= 1.6) && t - (s.auraAt[e.id] ?? -9) >= 1) {
        s.auraAt[e.id] = t; hurt(e, p, 1, '#99ebff');
        s.fx.push({ kind: 'ring', x: p.x, y: p.y, r0: 0.2, r1: 0.7, col: COL.aura, life: 0.3, age: 0 });
      }
    }
    if (sc.turret) sc.walls.forEach((w, i) => {
      if (!s.placed[i]) return;
      s.reload[i] -= dt;
      if (s.reload[i] > 0) return;
      const o = turretOf(w);
      let target = null, best = 7.35;
      for (const e of s.enemies) { if (e.hp <= 0) continue; const p = along(e.L.path, e.dist), d = Math.hypot(p.x - o.x, p.y - o.y); if (d <= best) { best = d; target = e; } }
      if (!target) return;
      s.reload[i] = 1;
      const p = along(target.L.path, target.dist), n = Math.hypot(p.x - o.x, p.y - o.y);
      s.shots.push({ x: o.x, y: o.y, d: { x: (p.x - o.x) / n, y: (p.y - o.y) / n }, target, life: 3 });
    });
    for (const sh of s.shots) {
      sh.life -= dt;
      if (sh.target.hp > 0) {   // the shot homes in lightly
        const p = along(sh.target.L.path, sh.target.dist), n = Math.hypot(p.x - sh.x, p.y - sh.y) || 1, k = Math.min(1, 10 * dt);
        sh.d = { x: sh.d.x + ((p.x - sh.x) / n - sh.d.x) * k, y: sh.d.y + ((p.y - sh.y) / n - sh.d.y) * k };
        const m = Math.hypot(sh.d.x, sh.d.y); sh.d.x /= m; sh.d.y /= m;
      }
      sh.x += sh.d.x * 9 * dt; sh.y += sh.d.y * 9 * dt;
      for (const e of s.enemies) { if (e.hp <= 0) continue; const p = along(e.L.path, e.dist); if (Math.hypot(p.x - sh.x, p.y - sh.y) <= 0.64) { hurt(e, p, 1, '#ffd966'); sh.life = 0; break; } }
    }
    s.shots = s.shots.filter(sh => sh.life > 0);
    for (const e of s.enemies) { if (e.hp <= 0) continue; e.dist += e.L.speed * dt; e.flash = Math.max(0, e.flash - dt); if (along(e.L.path, e.dist).done) { e.hp = 0; s.hp--; } }
    s.enemies = s.enemies.filter(e => e.hp > 0);
    for (const f of s.fx) { f.age += dt; if (f.vx !== undefined) { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.9; f.vy *= 0.9; } if (f.kind === 'num') f.y += dt * 0.8; }
    s.fx = s.fx.filter(f => f.age < f.life);
    s.t = t;
  };
  const stateAt = (sc, until) => { const s = fresh(sc); while (s.t < until) step(s, 1 / 120); return s; };

  // ── Drawing ── k (1–1.8) thickens lines and enlarges marks on narrow screens.
  const OX = W / 2 - RW * T / 2, OY = H / 2 + RH * T / 2 - 10;
  const X = x => OX + x * T, Y = y => OY - y * T;
  const font = px => `${px}px NeoDunggeunmo, "Noto Sans KR", sans-serif`;
  const line = (ctx, a, b, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(X(a.x), Y(a.y)); ctx.lineTo(X(b.x), Y(b.y)); ctx.stroke(); };
  const dot = (ctx, x, y, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
  const draw = (ctx, s, k) => {
    const sc = s.sc, t = s.t;
    ctx.fillStyle = COL.paper; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = COL.paperGrid; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 0.5; x < W; x += 20) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0.5; y < H; y += 20) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    for (let x = 0; x < RW; x++) for (let y = 0; y < RH; y++) {
      if (isBlock(x, y)) { ctx.fillStyle = COL.block; ctx.fillRect(X(x) + 2, Y(y + 1) + 2, T - 4, T - 4); continue; }
      ctx.fillStyle = '#fff'; ctx.fillRect(X(x), Y(y + 1), T, T);
      ctx.strokeStyle = COL.floorGrid; ctx.strokeRect(X(x) + 0.5, Y(y + 1) + 0.5, T, T);
    }
    ctx.save(); ctx.translate(X(6), Y(-0.25)); ctx.strokeStyle = COL.wall; ctx.fillStyle = '#d8ecff'; ctx.lineWidth = 2; ctx.beginPath();
    [[0, 0], [-9, 12], [-4, 12], [-4, 26], [4, 26], [4, 12], [9, 12]].forEach(([x, y], n) => (n ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    for (const L of sc.lanes) {
      ctx.strokeStyle = COL.lane; ctx.lineWidth = 2.5 * k; ctx.beginPath();
      L.path.forEach((p, n) => (n ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y)))); ctx.stroke();
      dot(ctx, X(L.path[0].x), Y(L.path[0].y), 5 * k, COL.lane); dot(ctx, X(L.path[1].x), Y(L.path[1].y), 5 * k, COL.target);
    }
    const walls = sc.walls.filter((w, i) => s.placed[i]);
    if (sc.aura) for (const w of walls) {   // the aura: a capsule round the wall
      const ex = w.b.x - w.a.x, ey = w.b.y - w.a.y, half = Math.hypot(ex, ey) / 2 * T, r = 1.6 * T;
      ctx.save(); ctx.translate(X((w.a.x + w.b.x) / 2), Y((w.a.y + w.b.y) / 2)); ctx.rotate(Math.atan2(-ey, ex));
      ctx.beginPath(); ctx.moveTo(-half, -r); ctx.lineTo(half, -r); ctx.arc(half, 0, r, -Math.PI / 2, Math.PI / 2); ctx.lineTo(-half, r); ctx.arc(-half, 0, r, Math.PI / 2, Math.PI * 1.5); ctx.closePath();
      ctx.fillStyle = COL.auraFill; ctx.fill(); ctx.strokeStyle = COL.aura; ctx.lineWidth = 2.5 * k; ctx.stroke(); ctx.restore();
    }
    if (walls.length) {   // the orange dashed path; with 번식 it forks at the first bounce, as the game's preview does
      ctx.save(); ctx.strokeStyle = COL.preview; ctx.lineWidth = 2 * k; ctx.setLineDash([7 * k, 5 * k]); ctx.lineDashOffset = -t * 30;
      const trace = (p, d, depth, forked) => {
        ctx.beginPath(); ctx.moveTo(X(p.x), Y(p.y));
        for (let i = 0; i < depth; i++) {
          const h = nearest(p, d, walls, 99);
          if (!h) { let n = 0; while (n < 20 && open(p.x + d.x * (n + 0.1), p.y + d.y * (n + 0.1))) n += 0.1; ctx.lineTo(X(p.x + d.x * n), Y(p.y + d.y * n)); break; }
          p = { x: p.x + d.x * h.t, y: p.y + d.y * h.t }; ctx.lineTo(X(p.x), Y(p.y)); d = reflect(d, h);
          if (sc.split && !forked) { ctx.stroke(); trace(p, turn(d, 0.1745), depth - i - 1, true); trace(p, turn(d, -0.1745), depth - i - 1, true); return; }
          forked = true;
        }
        ctx.stroke();
      };
      trace({ x: 6, y: -0.8 }, { x: 0, y: 1 }, 14, false);
      ctx.restore();
    }
    let hand = null;
    sc.walls.forEach((w, i) => {
      if (s.placed[i]) { line(ctx, w.a, w.b, COL.wall, 4 * k); return; }
      if (t < w.t0) return;
      const f = (t - w.t0) / (w.t1 - w.t0);
      hand = { x: w.a.x + (w.b.x - w.a.x) * f, y: w.a.y + (w.b.y - w.a.y) * f };
      line(ctx, w.a, hand, COL.wallDrag, 4 * k);
    });
    if (sc.reach) {   // 거대 벽: the orange dot is the usual 3.5-tile limit
      const w = sc.walls[0], L = Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y), m = { x: w.a.x + (w.b.x - w.a.x) * 3.5 / L, y: w.a.y + (w.b.y - w.a.y) * 3.5 / L };
      const drawn = s.placed[0] ? L : Math.max(0, (t - w.t0) / (w.t1 - w.t0)) * L;
      if (drawn > 3.5) dot(ctx, X(m.x), Y(m.y), 5 * k, COL.preview);
      if (s.placed[0]) {
        ctx.font = font(15 * k); ctx.textAlign = 'right'; ctx.fillStyle = '#b5652a'; ctx.fillText('기본 최대', X(m.x) - 10, Y(m.y) + 5);
        ctx.textAlign = 'left'; ctx.fillStyle = COL.wallDrag; ctx.fillText('×2', X(w.b.x) + 8, Y(w.b.y) + 5);
      }
    }
    if (sc.turret) sc.walls.forEach((w, i) => { if (!s.placed[i]) return; const o = turretOf(w); dot(ctx, X(o.x), Y(o.y), 0.16 * T * k + 1, COL.turretEdge); dot(ctx, X(o.x), Y(o.y), 0.16 * T * k, COL.turret); });
    for (const sh of s.shots) dot(ctx, X(sh.x), Y(sh.y), 0.11 * T * k + 1, COL.shot);
    for (const e of s.enemies) {
      const p = along(e.L.path, e.dist), r = 0.36 * T * Math.min(k, 1.3);
      dot(ctx, X(p.x), Y(p.y), r, e.flash > 0 ? '#fff' : COL.enemy);
      if (e.hp < e.L.hp) {
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(X(p.x) - 14, Y(p.y) - r - 8 * k, 28, 3 * k);
        ctx.fillStyle = COL.hpBar; ctx.fillRect(X(p.x) - 14, Y(p.y) - r - 8 * k, 28 * e.hp / e.L.hp, 3 * k);
      }
    }
    for (const b of s.balls) dot(ctx, X(b.x), Y(b.y), 6.5 * k, COL.ball);
    for (const f of s.fx) {
      const p = f.age / f.life;
      ctx.globalAlpha = 1 - p;
      if (f.kind === 'ring') { ctx.strokeStyle = f.col; ctx.lineWidth = 3 * k; ctx.beginPath(); ctx.arc(X(f.x), Y(f.y), (f.r0 + (f.r1 - f.r0) * p) * T, 0, Math.PI * 2); ctx.stroke(); }
      else if (f.kind === 'num') { ctx.font = font(20 * k); ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.strokeText(f.text, X(f.x), Y(f.y)); ctx.fillStyle = '#d9481c'; ctx.fillText(f.text, X(f.x), Y(f.y)); ctx.textAlign = 'left'; }
      else { ctx.fillStyle = f.col; ctx.fillRect(X(f.x) - 2.5 * k, Y(f.y) - 2.5 * k, 5 * k, 5 * k); }
      ctx.globalAlpha = 1;
    }
    if (hand) {
      ctx.save(); ctx.translate(X(hand.x), Y(hand.y)); ctx.scale(k, k); ctx.beginPath();
      [[0, 0], [0, 17], [4, 13], [7, 20], [10, 19], [7, 12], [12, 12]].forEach(([a, b], n) => (n ? ctx.lineTo(a, b) : ctx.moveTo(a, b)));
      ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#222'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
    }
    if (t > sc.length - 0.6) { ctx.fillStyle = `rgba(245,241,232,${Math.min(1, (t - (sc.length - 0.6)) / 0.4)})`; ctx.fillRect(0, 0, W, H); }
  };

  // ── Cards and playback ──
  const buttons = [...root.querySelectorAll('[data-augment]')].filter(b => SCENES[b.dataset.augment]);
  const order = buttons.map(b => b.dataset.augment);
  const desc = root.querySelector('[data-augment-desc]');
  const hud = { hp: root.querySelector('[data-augment-hp]'), walls: root.querySelector('[data-augment-walls]'), name: root.querySelector('[data-augment-name]') };
  const motion = motionLoop.reduce;
  let current = 0, auto = true, state = fresh(SCENES[order[0]]), view = null;
  const shown = {};
  const setHud = () => {
    const next = { hp: `HP ${state.hp} / 12`, walls: `벽 ${state.placed.filter(Boolean).length} / ${state.sc.max}`, name: `증강: ${state.sc.name}` };
    for (const key in next) if (hud[key] && shown[key] !== next[key]) hud[key].textContent = shown[key] = next[key];
  };
  const fit = () => { view = canvasKit.fit(canvas, W, H); };
  const paint = () => { draw(view.ctx, state, view.k); setHud(); };
  const choose = i => {
    current = i;
    const sc = SCENES[order[i]];
    state = motion.matches ? stateAt(sc, sc.still) : fresh(sc);
    buttons.forEach((b, n) => b.setAttribute('aria-pressed', String(n === i)));
    if (desc) desc.textContent = buttons[i].dataset.desc || '';
    paint();
  };
  const loop = motionLoop({
    target: canvas,
    tick: dt => {
      for (let left = dt; left > 0; left -= 1 / 120) step(state, Math.min(1 / 120, left));
      if (state.t >= state.sc.length) { if (auto) choose((current + 1) % order.length); else state = fresh(state.sc); }
      paint();
    },
    onReduce: () => update()
  });
  // Pressing a card shows that augment and stops the automatic turn.
  buttons.forEach((b, n) => b.addEventListener('click', () => { auto = false; choose(n); loop.update(); }));
  const update = () => { canvasKit.ready(root); fit(); choose(current); loop.update(); };
  motionLoop.onResize(() => { fit(); paint(); });
  // The pixel font is drawn into the canvas (the -2 and the 거대 벽 labels), so the first picture waits for it.
  canvasKit.fontReady(font(16)).then(update);
})();
