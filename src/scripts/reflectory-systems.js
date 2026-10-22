// Reflectory map-change system on the detail page (2026-10-21 user request), under the augment block.
// The screen follows the game's own rules from its code: 12×10 rooms that get walls only where no room is next to them,
// a gap in the bottom middle room's floor for the launcher, walls (the game's mirrors) that reflect balls, and enemies
// that walk their lanes. Rooms join in the game's order (middle → left → right → the row above) and the walls clear after
// every wave, so the path is placed again. Ball speed (6.5 tiles/s) and fire interval (0.45 s) are the game's; enemy
// lanes, health and speed are chosen to read well. Off screen or in a hidden tab it stops (motion-loop.js); with reduced motion it shows one still picture.
// The augment block has its own script (reflectory-augments.js).
(() => {
  const roots = [...document.querySelectorAll('[data-reflectory-system]')];
  if (!roots.length || !document.createElement('canvas').getContext) return;

  // ── Engine: tile units, +y up as in the game ──
  const RW = 12, RH = 10;
  const key = (x, y) => `${x},${y}`;
  const tilesOf = rooms => {
    const has = (x, y) => rooms.some(r => r[0] === x && r[1] === y);
    const bottom = Math.min(...rooms.map(r => r[1]));
    const floor = new Set(), wall = new Set();
    for (const [gx, gy] of rooms) {
      const ox = gx * RW, oy = gy * RH;
      for (let x = 0; x < RW; x++) for (let y = 0; y < RH; y++) floor.add(key(ox + x, oy + y));
      const left = has(gx - 1, gy), right = has(gx + 1, gy);
      let up = has(gx, gy + 1), down = has(gx, gy - 1);
      if (gx !== 0) { up = up && has(0, gy + 1); down = down && has(0, gy - 1); }
      if (!up) for (let x = 0; x < RW; x++) wall.add(key(ox + x, oy + RH - 1));
      if (!down) {
        for (let x = 0; x < RW; x++) wall.add(key(ox + x, oy));
        if (gx === 0 && gy === bottom) { wall.delete(key(ox + RW / 2, oy)); wall.delete(key(ox + RW / 2 - 1, oy)); }
      }
      if (!left) for (let y = 0; y < RH; y++) wall.add(key(ox, oy + y));
      if (!right) for (let y = 0; y < RH; y++) wall.add(key(ox + RW - 1, oy + y));
    }
    const xs = rooms.map(r => r[0] * RW), ys = rooms.map(r => r[1] * RH);
    return { floor, wall, bounds: { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs) + RW, y1: Math.max(...ys) + RH } };
  };
  const hitSeg = (p, d, len, w) => {
    const ex = w.b.x - w.a.x, ey = w.b.y - w.a.y, den = d.x * ey - d.y * ex;
    if (Math.abs(den) < 1e-9) return null;
    const ax = w.a.x - p.x, ay = w.a.y - p.y;
    const t = (ax * ey - ay * ex) / den, u = (ax * d.y - ay * d.x) / den;
    if (t <= 1e-6 || t > len || u < 0 || u > 1) return null;
    const n = Math.hypot(ex, ey);
    return { t, nx: -ey / n, ny: ex / n };
  };
  const reflect = (d, h) => { const k = d.x * h.nx + d.y * h.ny; return { x: d.x - 2 * k * h.nx, y: d.y - 2 * k * h.ny }; };
  const nearest = (p, d, walls, len) => { let best = null; for (const w of walls) { const h = hitSeg(p, d, len, w); if (h && (!best || h.t < best.t)) best = h; } return best; };
  // A ball lives on floor that isn't a block wall, or in the launcher spot under the gap.
  const open = (tiles, x, y) => {
    if (y < tiles.bounds.y0 && y > tiles.bounds.y0 - 2 && x >= RW / 2 - 1 && x < RW / 2 + 1) return true;
    const k = key(Math.floor(x), Math.floor(y));
    return tiles.floor.has(k) && !tiles.wall.has(k);
  };
  const along = (path, dist) => {
    let s = dist;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i], seg = Math.hypot(b.x - a.x, b.y - a.y);
      if (s <= seg) return { x: a.x + (b.x - a.x) * s / seg, y: a.y + (b.y - a.y) * s / seg, done: false };
      s -= seg;
    }
    return { ...path[path.length - 1], done: true };
  };
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const burst = (x, y, col, n, sp) => Array.from({ length: n }, () => {
    const q = rnd() * Math.PI * 2, v = sp * (0.5 + rnd() * 0.5);
    return { kind: 'spark', x, y, vx: Math.cos(q) * v, vy: Math.sin(q) * v, col, life: 0.25 + rnd() * 0.08, age: 0 };
  });

  // ── Scenes ──
  const S = Math.SQRT1_2 * 0.85;
  const upRight = (x, y, t0, t1) => ({ a: { x: x - S, y: y - S }, b: { x: x + S, y: y + S }, t0, t1 });
  const upLeft = (x, y, t0, t1) => ({ a: { x: x - S, y: y + S }, b: { x: x + S, y: y - S }, t0, t1 });
  const SCENES = {
    map: { speed: 6.5, fireEvery: 0.45, length: 34.2, still: 31, stages: [
      { t0: 0, name: '웨이브 1', rooms: [[0, 0]], walls: [upRight(6, 6, 1.0, 1.8)], fire: 2.0, clear: 6.2,
        lanes: [{ path: [{ x: 9.5, y: 8.5 }, { x: 9.5, y: 1.5 }], spawns: [2.4, 3.2], hp: 2, speed: 1.3 }] },
      { t0: 6.8, name: '웨이브 2', rooms: [[0, 0], [-1, 0]], walls: [upLeft(6, 7.5, 1.2, 2.0)], fire: 2.2, clear: 6.6,
        lanes: [{ path: [{ x: -10.5, y: 7.5 }, { x: 3.5, y: 7.5 }, { x: 3.5, y: 1.5 }], spawns: [1.4, 2.4], hp: 3, speed: 1.6 }] },
      { t0: 14.0, name: '웨이브 3', rooms: [[0, 0], [-1, 0], [1, 0]], walls: [upLeft(6, 8, 1.2, 1.9), upRight(-4.5, 8, 2.0, 2.7), upLeft(-4.5, 1.5, 2.8, 3.5)], fire: 3.7, clear: 11.0,
        lanes: [{ path: [{ x: -10.5, y: 8 }, { x: 22.5, y: 8 }, { x: 22.5, y: 4.5 }], spawns: [3.4, 4.4], hp: 3, speed: 1.5 },
                { path: [{ x: 22.5, y: 1.5 }, { x: -10.5, y: 1.5 }, { x: -10.5, y: 4.5 }], spawns: [1.0, 2.0], hp: 3, speed: 1.8 }] },
      { t0: 25.6, name: '웨이브 4', rooms: [[0, 0], [-1, 0], [1, 0], [0, 1]], walls: [upRight(6, 15, 1.4, 2.2)], fire: 2.4, clear: 7.8,
        lanes: [{ path: [{ x: 9.5, y: 18.5 }, { x: 9.5, y: 1.5 }], spawns: [2.2, 3.0], hp: 2, speed: 1.1 }] },
    ] },
  };
  for (const scene of Object.values(SCENES)) for (const st of scene.stages) st.tiles = tilesOf(st.rooms);

  const fresh = scene => { seed = 7; return { scene, time: 0, stage: -1, balls: [], enemies: [], fx: [], placed: [], fired: 0, hp: 12, tiles: null, prev: null, spawned: [], hurt: 0 }; };
  const enter = (s, i) => {
    const st = s.scene.stages[i];
    s.stage = i; s.balls = []; s.enemies = []; s.placed = []; s.fired = 0; s.spawned = st.lanes.map(() => 0);
    s.prev = s.tiles; s.tiles = st.tiles;
  };
  const launch = s => ({ x: RW / 2, y: s.tiles.bounds.y0 - 0.8 });

  const step = (s, dt) => {
    const sc = s.scene, t = s.time + dt;
    let i = s.stage;
    while (i + 1 < sc.stages.length && sc.stages[i + 1].t0 <= t) i++;
    if (i !== s.stage) enter(s, i);
    const st = sc.stages[s.stage], u = t - st.t0;
    const cleared = st.clear !== undefined && u >= st.clear;
    // After a wave every placed wall goes (WaveManager.FinishWave → DestroyAllLines).
    if (cleared && s.placed.some(Boolean)) {
      st.walls.forEach((w, n) => { if (s.placed[n]) s.fx.push({ kind: 'pulse', w, col: '#3d8fe0', life: 0.3, age: 0, fade: true }); });
      s.placed = []; s.balls = [];
    }
    if (!cleared) st.walls.forEach((w, n) => {
      if (s.placed[n] || u < w.t1) return;
      s.placed[n] = true;
      const cx = (w.a.x + w.b.x) / 2, cy = (w.a.y + w.b.y) / 2;
      s.fx.push({ kind: 'ring', x: cx, y: cy, r0: 0.15, r1: 1.5, col: '#99ebff', life: 0.34, age: 0 }, { kind: 'pulse', w, col: '#99ebff', life: 0.22, age: 0 }, ...burst(cx, cy, '#99ebff', 8, 4));
    });
    if (st.fire !== undefined && !cleared) {
      for (let at = st.fire + s.fired * sc.fireEvery; at <= u; at = st.fire + s.fired * sc.fireEvery) {
        s.balls.push({ ...launch(s), d: { x: 0, y: 1 }, touched: new Set(), squash: 0 });
        s.fired++;
      }
    }
    st.lanes.forEach((L, n) => {
      while (s.spawned[n] < L.spawns.length && L.spawns[s.spawned[n]] <= u) {
        s.enemies.push({ lane: L, dist: 0, hp: L.hp, flash: 0, grow: 0, id: n * 100 + s.spawned[n] });
        s.spawned[n]++;
      }
    });
    const walls = st.walls.filter((w, n) => s.placed[n]);
    for (const b of s.balls) {
      let left = sc.speed * dt;
      for (let g = 0; left > 0 && g < 4; g++) {
        const h = nearest(b, b.d, walls, left);
        if (!h) { b.x += b.d.x * left; b.y += b.d.y * left; break; }
        b.x += b.d.x * h.t; b.y += b.d.y * h.t; left -= h.t; b.d = reflect(b.d, h); b.squash = 1;
      }
      b.squash = Math.max(0, b.squash - dt * 8);
    }
    for (const b of s.balls) {
      if (!open(s.tiles, b.x, b.y)) {
        b.dead = true;
        if (b.y > s.tiles.bounds.y0) s.fx.push({ kind: 'ring', x: b.x, y: b.y, r0: 0.15, r1: 0.2, col: 'rgba(0,115,255,.5)', life: 0.35, age: 0 });
        continue;
      }
      // Enemies don't stop a ball; every touch costs them health.
      for (const e of s.enemies) {
        if (e.hp <= 0) continue;
        const p = along(e.lane.path, e.dist), near = Math.hypot(b.x - p.x, b.y - p.y) < 0.5;
        if (!near) { b.touched.delete(e.id); continue; }
        if (b.touched.has(e.id)) continue;
        b.touched.add(e.id); e.hp--; e.flash = 0.09;
        if (e.hp > 0) s.fx.push(...burst(p.x, p.y, '#ffd966', 6, 3.5));
        else s.fx.push(...burst(p.x, p.y, '#ff8c73', 14, 5.5), { kind: 'ring', x: p.x, y: p.y, r0: 0.1, r1: 0.9, col: '#ff8c73', life: 0.28, age: 0 });
      }
    }
    s.balls = s.balls.filter(b => !b.dead);
    for (const e of s.enemies) {
      if (e.hp <= 0) continue;
      e.dist += e.lane.speed * dt; e.flash = Math.max(0, e.flash - dt); e.grow = Math.min(1, e.grow + dt * 2);
      if (along(e.lane.path, e.dist).done) {
        const z = e.lane.path[e.lane.path.length - 1];
        e.hp = 0; s.hp--; s.hurt = 0.5;
        s.fx.push({ kind: 'ring', x: z.x, y: z.y, r0: 0.1, r1: 1.4, col: 'rgba(0,115,255,.5)', life: 0.3, age: 0 });
      }
    }
    s.enemies = s.enemies.filter(e => e.hp > 0);
    s.hurt = Math.max(0, s.hurt - dt);
    for (const f of s.fx) { f.age += dt; if (f.vx !== undefined) { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.9; f.vy *= 0.9; } }
    s.fx = s.fx.filter(f => f.age < f.life);
    s.time = t;
  };
  const stateAt = (scene, until) => { const s = fresh(scene); step(s, 1e-4); while (s.time < until) step(s, 1 / 120); return s; };

  // The orange dashed path the next ball will take.
  const previews = s => {
    const st = s.scene.stages[s.stage], walls = st.walls.filter((w, n) => s.placed[n]);
    if (!walls.length) return [];
    const trace = (p, d, depth) => {
      const pts = [p];
      for (let n = 0; n < depth; n++) {
        const h = nearest(p, d, walls, 200);
        if (!h) {
          let k = 0;
          while (k < 80 && open(s.tiles, p.x + d.x * (k + 0.1), p.y + d.y * (k + 0.1))) k += 0.1;
          pts.push({ x: p.x + d.x * k, y: p.y + d.y * k });
          break;
        }
        p = { x: p.x + d.x * h.t, y: p.y + d.y * h.t }; pts.push(p); d = reflect(d, h);
      }
      return [pts];
    };
    return trace(launch(s), { x: 0, y: 1 }, 10);
  };

  // ── Drawing ──
  const W = 960, H = 540;
  const COL = { paper: '#f5f1e8', paperGrid: 'rgba(120,160,200,.16)', floorGrid: '#cfe0f1', block: '#666', wall: '#3d8fe0', wallDrag: '#1d4f9a', ball: '#1767dc', preview: 'rgba(235,140,70,.85)', lane: '#c93a52', target: '#f2cc45', enemy: '#ef5f6f', hpBar: '#4caf50' };
  const ease = k => (k <= 0 ? 0 : k >= 1 ? 1 : k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  const camFor = b => { const m = 1.2, bw = b.x1 - b.x0 + 2 * m, bh = b.y1 - b.y0 + 2 * m + 1.6; return { cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2 - 0.5, sc: Math.min(W / bw, H / bh) }; };
  const pointer = (ctx, x, y, k) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.beginPath();
    [[0, 0], [0, 17], [4, 13], [7, 20], [10, 19], [7, 12], [12, 12]].forEach(([a, b], n) => (n ? ctx.lineTo(a, b) : ctx.moveTo(a, b)));
    ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#222'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
  };
  const font = px => `${px}px NeoDunggeunmo, "Noto Sans KR", sans-serif`;

  // k (1–1.8) thickens lines and enlarges text on narrow screens, where the 960-wide scene is drawn small.
  const draw = (ctx, s, k) => {
    const st = s.scene.stages[s.stage], u = s.time - st.t0;
    const grow = s.prev && s.prev !== s.tiles ? ease(u / 1.0) : 1;
    const c1 = camFor(s.tiles.bounds), c0 = s.prev ? camFor(s.prev.bounds) : c1;
    const cam = { cx: c0.cx + (c1.cx - c0.cx) * grow, cy: c0.cy + (c1.cy - c0.cy) * grow, sc: c0.sc + (c1.sc - c0.sc) * grow };
    const X = x => W / 2 + (x - cam.cx) * cam.sc, Y = y => H / 2 - (y - cam.cy) * cam.sc, T = cam.sc;
    ctx.fillStyle = COL.paper; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = COL.paperGrid; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 0.5; x < W; x += 20) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0.5; y < H; y += 20) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    // A new room fades in; the walls where rooms now meet fade out.
    const prev = s.prev && s.prev !== s.tiles ? s.prev : null, cur = s.tiles;
    const at = kk => kk.split(',').map(Number);
    for (const kk of cur.floor) { const [x, y] = at(kk); ctx.globalAlpha = prev && !prev.floor.has(kk) ? grow : 1; ctx.fillStyle = '#fff'; ctx.fillRect(X(x), Y(y + 1), T + 0.5, T + 0.5); }
    ctx.globalAlpha = prev ? 0.3 + 0.7 * grow : 1; ctx.strokeStyle = COL.floorGrid; ctx.beginPath();
    for (const kk of cur.floor) { const [x, y] = at(kk); ctx.rect(Math.round(X(x)) + 0.5, Math.round(Y(y + 1)) + 0.5, T, T); }
    ctx.stroke();
    const block = (kk, alpha) => { const [x, y] = at(kk), g = T * 0.06; ctx.globalAlpha = alpha; ctx.fillStyle = COL.block; ctx.fillRect(X(x) + g, Y(y + 1) + g, T - 2 * g, T - 2 * g); };
    for (const kk of cur.wall) block(kk, prev && !prev.wall.has(kk) ? grow : 1);
    if (prev) for (const kk of prev.wall) if (!cur.wall.has(kk)) block(kk, 1 - grow);
    ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(X(RW / 2), Y(cur.bounds.y0 - 0.25)); ctx.scale(T / 40, T / 40);   // launch arrow
    ctx.strokeStyle = COL.wall; ctx.fillStyle = '#d8ecff'; ctx.lineWidth = 2; ctx.beginPath();
    [[0, 0], [-9, 12], [-4, 12], [-4, 26], [4, 26], [4, 12], [9, 12]].forEach(([x, y], n) => (n ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.globalAlpha = Math.min(1, Math.max(0, (u - 0.6) / 0.5));   // enemy lanes
    for (const L of st.lanes) {
      ctx.strokeStyle = COL.lane; ctx.lineWidth = 2.5 * k; ctx.beginPath();
      L.path.forEach((p, n) => (n ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y)))); ctx.stroke();
      const a = L.path[0], z = L.path[L.path.length - 1];
      ctx.fillStyle = COL.lane; ctx.beginPath(); ctx.arc(X(a.x), Y(a.y), 5 * k, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COL.target; ctx.beginPath(); ctx.arc(X(z.x), Y(z.y), 5 * k, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.save(); ctx.strokeStyle = COL.preview; ctx.lineWidth = 2 * k; ctx.setLineDash([7 * k, 5 * k]); ctx.lineDashOffset = -s.time * 30;
    for (const pts of previews(s)) { ctx.beginPath(); pts.forEach((p, n) => (n ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y)))); ctx.stroke(); }
    ctx.restore();
    const seg = (a, b, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(X(a.x), Y(a.y)); ctx.lineTo(X(b.x), Y(b.y)); ctx.stroke(); };
    const cleared = st.clear !== undefined && u >= st.clear;
    let hand = null;
    if (!cleared) st.walls.forEach((w, n) => {
      if (s.placed[n]) { seg(w.a, w.b, COL.wall, 4 * k); return; }
      if (u >= w.t0) { const f = (u - w.t0) / (w.t1 - w.t0); hand = { x: w.a.x + (w.b.x - w.a.x) * f, y: w.a.y + (w.b.y - w.a.y) * f }; seg(w.a, hand, COL.wallDrag, 4 * k); }
      else if (u >= w.t0 - 0.5) { const from = n ? st.walls[n - 1].b : { x: cam.cx, y: cam.cy }, f = (u - (w.t0 - 0.5)) / 0.5; hand = { x: from.x + (w.a.x - from.x) * f, y: from.y + (w.a.y - from.y) * f }; }
    });
    const lastWall = st.walls[st.walls.length - 1];
    if (!hand && lastWall && !cleared && u >= lastWall.t1 && u < lastWall.t1 + 0.6) hand = lastWall.b;
    for (const e of s.enemies) {
      const p = along(e.lane.path, e.dist), r = Math.max(0.36 * T, 7 * k) * (0.4 + 0.6 * e.grow);
      ctx.fillStyle = e.flash > 0 ? '#fff' : COL.enemy; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), r, 0, Math.PI * 2); ctx.fill();
      if (e.hp < e.lane.hp) {
        const bw = Math.max(T * 0.8, 16 * k);
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(X(p.x) - bw / 2, Y(p.y) - r - 8 * k, bw, 3 * k);
        ctx.fillStyle = COL.hpBar; ctx.fillRect(X(p.x) - bw / 2, Y(p.y) - r - 8 * k, bw * e.hp / e.lane.hp, 3 * k);
      }
    }
    for (const b of s.balls) {   // a ball squashes a little as it bounces
      const sq = 1 + b.squash * 0.35;
      ctx.save(); ctx.translate(X(b.x), Y(b.y)); ctx.rotate(Math.atan2(-b.d.y, b.d.x)); ctx.scale(1 / sq, sq);
      ctx.fillStyle = COL.ball; ctx.beginPath(); ctx.arc(0, 0, Math.max(4 * k, 0.17 * T), 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    for (const f of s.fx) {
      const p = f.age / f.life; ctx.globalAlpha = 1 - p;
      if (f.kind === 'ring') { ctx.strokeStyle = f.col; ctx.lineWidth = 3 * k; ctx.beginPath(); ctx.arc(X(f.x), Y(f.y), (f.r0 + (f.r1 - f.r0) * p) * T, 0, Math.PI * 2); ctx.stroke(); }
      else if (f.kind === 'pulse') seg(f.w.a, f.w.b, f.col, (f.fade ? 4 : 12 * (1 - p) + 4) * k);
      else { ctx.fillStyle = f.col; ctx.fillRect(X(f.x) - 2.5 * k, Y(f.y) - 2.5 * k, 5 * k, 5 * k); }
      ctx.globalAlpha = 1;
    }
    if (hand) pointer(ctx, X(hand.x), Y(hand.y), k);
    if (s.hurt > 0) { ctx.strokeStyle = `rgba(239,95,111,${s.hurt})`; ctx.lineWidth = 16; ctx.strokeRect(0, 0, W, H); }
    const banner = (text, a) => {
      ctx.globalAlpha = a; ctx.font = font(30 * k); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 6 * k; ctx.strokeStyle = '#fff'; ctx.strokeText(text, W / 2, 44 * k); ctx.fillStyle = '#2b2b2b'; ctx.fillText(text, W / 2, 44 * k);
      ctx.globalAlpha = 1; ctx.textAlign = 'left';
    };
    if (cleared) banner('웨이브 클리어', Math.min(1, (u - st.clear) / 0.2));
    else if (st.name && s.stage > 0 && u < 1.6) banner(st.name, Math.min(1, u / 0.3) * Math.min(1, (1.6 - u) / 0.3));
    if (s.time > s.scene.length - 0.8) { ctx.fillStyle = `rgba(245,241,232,${Math.min(1, (s.time - (s.scene.length - 0.8)) / 0.6)})`; ctx.fillRect(0, 0, W, H); }
  };


  // ── Players ──
  const motion = motionLoop.reduce;
  const players = roots.map(root => {
    const scene = SCENES[root.dataset.reflectorySystem], canvas = root.querySelector('canvas');
    const hud = { hp: root.querySelector('[data-system-hp]'), info: root.querySelector('[data-system-info]') };
    return { root, scene, canvas, hud, state: fresh(scene), view: null, shown: {} };
  }).filter(p => p.scene && p.canvas);

  const fit = p => { p.view = canvasKit.fit(p.canvas, W, H); };
  const paint = p => {
    if (p.state.stage < 0) step(p.state, 1e-4);
    draw(p.view.ctx, p.state, p.view.k);
    const st = p.scene.stages[p.state.stage];
    const next = { hp: `HP ${p.state.hp} / 12`, info: st.name };
    for (const name in next) if (p.hud[name] && p.shown[name] !== next[name]) p.hud[name].textContent = p.shown[name] = next[name];
  };

  // Each map plays on its own, only while it is on screen (motion-loop.js).
  for (const p of players) {
    p.loop = motionLoop({
      target: p.canvas,
      tick: dt => {
        for (let left = dt; left > 0; left -= 1 / 120) step(p.state, Math.min(1 / 120, left));
        if (p.state.time >= p.scene.length) p.state = fresh(p.scene);
        paint(p);
      }
    });
  }
  const update = () => {
    for (const p of players) {
      canvasKit.ready(p.root);
      fit(p);
      if (motion.matches) p.state = stateAt(p.scene, p.scene.still);
      paint(p);
      p.loop.update();
    }
  };
  motion.addEventListener('change', update);
  let resizeTimer;
  window.addEventListener('resize', () => { window.clearTimeout(resizeTimer); resizeTimer = window.setTimeout(update, 120); });
  // The pixel font is drawn into the canvas (stage names), so the first picture waits for it.
  canvasKit.fontReady(font(16)).then(update);
})();
