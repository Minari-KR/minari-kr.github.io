// Barrel Good Barrel loadout on the detail page (2026-10-22 user request): the game's signature rule, a six-chamber magazine
// where every chamber holds its own fire pattern and the chambers fire in order, redrawn with canvas in the game's black and gold look.
// The game's values: the six chambers' pattern and trait names and colours, 6 chambers, reload 1.8 s with the cylinder turning
// 1.5 times, buckshot 5 pellets at +-0.26 rad, bore damage 4 with pierce, cluster split after 0.18 s into 4 shards over 1.2 rad,
// twin repeat after 0.35 s, beam 420 long for 1.5 s with a tick every 0.3 s, mortar fuse 1.1 s and radius 140, vortex radius 96
// for 3 s with a tick every 0.5 s, the wait after each shot, overload x1.5, mark x2, ignite 1 per second for 3 s.
// Chosen to read well: arena distances at 0.6 of the game's, the pace between shots, the enemies' spots and health, beam width.
// One loop takes 18 s (was 12 s, which read too fast): the in-game motions keep their speed and the extra time is holds between beats
// (chambers fill 0.5 s apart, 1.6 s between shots, "장전 완료" held 2 s). Off screen, in a hidden tab or with reduced motion it stops (motion-loop.js); reduced motion shows three stills instead.
(() => {
  const root = document.querySelector('[data-bgb-loadout]');
  const screen = root && root.querySelector('canvas[data-bgb-screen]');
  if (!screen || !screen.getContext) return;

  const W = 960, H = 540, LOOP = 18;
  const FONT = '"NeoDunggeunmo", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  const GOLD = '#D4AF37', BRIGHT = '#FFD700', DARKGOLD = '#B8860B', DIM = '#4a3a18';

  const TRAIT = {
    pierce: ['관통', '#80ffc0'],
    twin: ['연발', '#ffd040'],
    ignite: ['점화', '#ff6020'],
    mark: ['표식', '#ffa040'],
    overload: ['과부하', '#ff4040'],
  };
  const SLOT = [
    { name: '산탄', short: '산탄', col: '#ffb870', traits: [], wait: 0.7, note: '5발 부채꼴' },
    { name: '대구경', short: '대구', col: '#ffe080', traits: ['pierce'], wait: 0.82, note: '크고 느린 탄 · 피해 4' },
    { name: '분산탄', short: '분산', col: '#ff9cd8', traits: ['twin'], wait: 0.72, note: '0.18초 뒤 4갈래' },
    { name: '빔', short: '빔', col: '#80e8ff', traits: [], wait: 0.85, note: '빔 1.5초 유지' },
    { name: '곡사탄', short: '곡사', col: '#ff9a60', traits: ['ignite'], wait: 0.88, note: '1.1초 뒤 폭발' },
    { name: '소용돌이', short: '소용', col: '#9a70ff', traits: ['mark', 'overload'], wait: 0.98, note: '반경 96 · 3초' },
  ];

  // Timeline in seconds: chambers fill in, shots, reload.
  const FILL0 = 0.4, FILL_STEP = 0.5;
  const T = [4.6, 6.2, 7.8, 9.4, 11.0, 12.6];
  const RELOAD = 14.2, RELOAD_DUR = 1.8, SETTLE = 0.7;

  const CYL = { x: 250, y: 250, outer: 198, orbit: 125, cham: 55, hub: 58 };
  const ARENA = { x: 500, y: 52, w: 430, h: 384 };
  const PL = { x: 556, y: 244 };
  const SC = 0.6, BS = 660 * SC, MUZZLE = 34, MAXHP = 24, VORTEX_T = 3;
  const ENEMIES = [
    { kind: 'sniper', x: 790, y: 150, r: 15, col: '#a0c8e8' },
    { kind: 'slasher', x: 835, y: 244, r: 17, col: '#c0a0d8' },
    { kind: 'slime', x: 780, y: 330, r: 19, col: '#72ffa8' },
    { kind: 'armor', x: 890, y: 244, r: 22, col: '#708090' },
    { kind: 'bomber', x: 850, y: 350, r: 12, col: '#ff8840' },
  ];
  // Where each shot is aimed: the vortex is placed on the spot the sixth shot points at.
  const AIM_PTS = [
    { x: 800, y: 215 },
    { x: 835, y: 244 },
    { x: 800, y: 290 },
    { x: 780, y: 330 },
    { x: 790, y: 300 },
    { x: 850, y: 250 },
  ];
  const AIM = AIM_PTS.map(p => Math.atan2(p.y - PL.y, p.x - PL.x));
  const VORTEX = { x: AIM_PTS[5].x, y: AIM_PTS[5].y, rad: 96 * SC, t0: T[5] };
  ENEMIES.forEach((e, i) => { e.i = i; e.ph = i * 1.7; e.pulled = Math.hypot(e.x - VORTEX.x, e.y - VORTEX.y) < VORTEX.rad; });

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const sm = v => { v = clamp(v); return v * v * (3 - 2 * v); };
  const mix = (a, b, k) => {
    const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), x = p(a), y = p(b);
    return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(",")})`;
  };

  // Enemies hover a little; the vortex pulls those inside it toward its centre while it lasts.
  const pullAt = t => sm((t - VORTEX.t0) / 0.7) * (1 - sm((t - VORTEX.t0 - VORTEX_T) / 0.7));
  const enemyAt = (e, t) => {
    const f = e.pulled ? pullAt(t) * 0.45 : 0;
    return {
      x: e.x + (VORTEX.x - e.x) * f + Math.sin(t * 1.3 + e.ph) * 4,
      y: e.y + (VORTEX.y - e.y) * f + Math.cos(t * 1.1 + e.ph) * 4,
    };
  };

  // Every shot is worked out once, at load: bullets, beam, shell and the damage they deal. Drawing then only reads it at time t.
  const bullets = [], beams = [], shells = [], hits = [], burns = [];
  const shoot = (i, t0, echo) => {
    const a = AIM[i], mx = PL.x + Math.cos(a) * MUZZLE, my = PL.y + Math.sin(a) * MUZZLE;
    const b = (t, x, y, ang, mul, o) =>
      bullets.push({ t0: t, t1: 99, x, y, vx: Math.cos(ang) * BS * mul, vy: Math.sin(ang) * BS * mul, seen: new Set(), ...o, });
    if (i === 0)
      [-0.26, -0.13, 0, 0.13, 0.26].forEach(d =>
        b(t0, mx, my, a + d, 0.82, { r: 4, fill: '#fff2d8', trail: '#ffb870', dmg: 0.8, }),
      );
    if (i === 1) b(t0, mx, my, a, 0.62, { r: 8, fill: '#fff6c0', trail: '#ffe080', dmg: 4, pierce: true, });
    if (i === 2) {
      b(t0, mx, my, a, 0.95, { r: 5, fill: '#ffd8ee', trail: '#ff9cd8', dmg: 2, t1: t0 + 0.18, });
      const sx = mx + Math.cos(a) * BS * 0.95 * 0.18, sy = my + Math.sin(a) * BS * 0.95 * 0.18;
      [-0.6, -0.2, 0.2, 0.6].forEach(d =>
        b(t0 + 0.18, sx, sy, a + d, 0.95, { r: 4, fill: '#ffd8ee', trail: '#ff9cd8', dmg: 0.8, }),
      );
      if (!echo) shoot(2, t0 + 0.35, true);
    }
    if (i === 3) beams.push({ t0, x: mx, y: my, a, len: 420 * SC, dur: 1.5 });
    if (i === 4)
      shells.push({
        t0,
        x: mx,
        y: my,
        a,
        ttl: 1.1,
        rad: 140 * SC,
        lx: mx + Math.cos(a) * BS * 0.5 * 1.1,
        ly: my + Math.sin(a) * BS * 0.5 * 1.1,
      });
  };
  T.forEach((t0, i) => shoot(i, t0));

  const arenaOut = (x, y) => x < ARENA.x + 6 || x > ARENA.x + ARENA.w - 6 || y < ARENA.y + 6 || y > ARENA.y + ARENA.h - 6;
  for (let t = 0; t < LOOP; t += 1 / 240) {
    for (const b of bullets) {
      if (t < b.t0 || t >= b.t1) continue;
      const x = b.x + b.vx * (t - b.t0), y = b.y + b.vy * (t - b.t0);
      if (arenaOut(x, y)) { b.t1 = t; continue; }
      for (const e of ENEMIES) {
        const p = enemyAt(e, t);
        if (b.seen.has(e.i) || Math.hypot(x - p.x, y - p.y) > b.r + e.r * 0.9) continue;
        b.seen.add(e.i);
        hits.push({ t, e: e.i, dmg: b.dmg, x, y });
        if (!b.pierce) { b.t1 = t; break; }
      }
    }
  }
  for (const m of beams) {
    for (let k = 0; k < 5; k++) {
      const tt = m.t0 + 0.3 * k, dx = Math.cos(m.a), dy = Math.sin(m.a);
      for (const e of ENEMIES) {
        const p = enemyAt(e, tt), s = clamp(((p.x - m.x) * dx + (p.y - m.y) * dy) / m.len),
          d = Math.hypot(p.x - (m.x + dx * m.len * s), p.y - (m.y + dy * m.len * s));
        if (d < 5 + e.r * 0.85) hits.push({ t: tt, e: e.i, dmg: 0.44, x: p.x, y: p.y, tick: true });
      }
    }
  }
  for (const s of shells) {
    const tt = s.t0 + s.ttl;
    for (const e of ENEMIES) {
      const p = enemyAt(e, tt);
      if (Math.hypot(p.x - s.lx, p.y - s.ly) > s.rad + e.r * 0.5) continue;
      hits.push({ t: tt, e: e.i, dmg: 2.1, x: p.x, y: p.y });
      burns.push({ e: e.i, t0: tt, t1: tt + 3 });
      for (let k = 1; k <= 3; k++) hits.push({ t: tt + k, e: e.i, dmg: 1, x: p.x, y: p.y, tick: true });
    }
  }
  // Vortex ticks hit for 0.8 x 1.5 (overload); the first tick on each enemy also takes the mark's x2.
  const marked = new Set();
  for (let k = 1; k <= 6; k++) {
    const tt = VORTEX.t0 + 0.5 * k;
    for (const e of ENEMIES) {
      const p = enemyAt(e, tt);
      if (Math.hypot(p.x - VORTEX.x, p.y - VORTEX.y) > VORTEX.rad) continue;
      hits.push({ t: tt, e: e.i, dmg: marked.has(e.i) ? 1.2 : 2.4, x: p.x, y: p.y, tick: true, });
      marked.add(e.i);
    }
  }
  const hpAt = (e, t) => Math.max(1, MAXHP - hits.reduce((n, h) => (h.e === e.i && h.t <= t ? n + h.dmg : n), 0));

  // Empty brass thrown up when the reload starts (fixed seed, so every loop is the same).
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const CASINGS = Array.from({ length: 14 }, () => ({
    ox: (rnd() - 0.5) * 120,
    vx: (rnd() - 0.5) * 240,
    vy: -260 - rnd() * 200,
    rot: rnd() * 6,
    vr: (rnd() - 0.5) * 12,
  }));

  // Cylinder turn in chamber units: one step per shot, a 1.5-turn spin while reloading, then round to chamber 1.
  const rot = t => {
    if (t < RELOAD) { let r = 0; for (let i = 1; i < 6; i++) r += sm((t - (T[i] - 0.45)) / 0.4); return r; }
    if (t < RELOAD + RELOAD_DUR) return 5 + 9 * sm((t - RELOAD) / RELOAD_DUR);
    return 14 + 4 * sm((t - RELOAD - RELOAD_DUR) / SETTLE);
  };
  const fillAt = (i, t) => sm((t - FILL0 - i * FILL_STEP) / 0.3);
  const dimAt = (i, t) => { const r = RELOAD + i * 0.3; return t < r ? clamp((t - T[i]) / 0.25) : 1 - clamp((t - r) / 0.3); };
  const aimAt = t => {
    let a = AIM[0];
    for (let i = 1; i < 6; i++) a += (AIM[i] - AIM[i - 1]) * sm((t - (T[i] - 0.4)) / 0.3);
    return a;
  };
  const shotsAt = t => T.filter(v => v - 0.05 <= t).length;
  const filledAt = t => SLOT.filter((s, i) => fillAt(i, t) > 0.5).length;
  const reloading = t => t >= RELOAD && t < RELOAD + RELOAD_DUR;

  const hudAt = t => {
    if (t < T[0] - 0.05) return `칸 설정 ${filledAt(t)} / 6`;
    if (t < RELOAD) return `탄창 ${shotsAt(t)} / 6`;
    return reloading(t) ? '재장전 1.8초' : '장전 완료';
  };
  // Two caption lines under the cylinder (the chamber at the firing mark) and two under the arena (its pattern).
  const captionAt = t => {
    const idx = t < T[0] - 0.05 ? Math.max(0, filledAt(t) - 1) : t >= RELOAD + RELOAD_DUR ? 0 : Math.max(0, shotsAt(t) - 1);
    const s = SLOT[idx], names = s.traits.map(k => TRAIT[k][0]).join(' + ') || '특성 없음';
    if (reloading(t)) return { l1: '재장전 중', l2: '탄창 6칸을 다시 채움', c: BRIGHT, r1: '6발 모두 발사', r2: '재장전 1.8초' };
    return { l1: `${idx + 1} ${s.name}`, l2: names, c: s.col, r1: s.note, r2: `대기 ${s.wait}초` };
  };

  const dot = (ctx, x, y, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
  const ring = (ctx, x, y, r, col, w) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  };
  // Text is never drawn under 10 css px: u is canvas pixels per css pixel. Too wide a line is squeezed to fit instead of cut.
  const text = (c, str, x, y, base, col, maxW, align = 'center') => {
    const { ctx } = c, size = Math.max(base, 10.5 * c.u);
    ctx.font = `${size}px ${FONT}`;
    ctx.fillStyle = col;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(str).width;
    if (maxW && w > maxW) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(maxW / w, 1);
      ctx.fillText(str, 0, 0);
      ctx.restore();
    } else ctx.fillText(str, x, y);
    return size;
  };

  const drawChamber = (c, j, t, r) => {
    const { ctx, k } = c, s = SLOT[j], f = fillAt(j, t), d = dimAt(j, t), lit = f * (1 - d);
    const a = -Math.PI / 2 + ((j - r) * Math.PI) / 3, x = CYL.x + Math.cos(a) * CYL.orbit, y = CYL.y + Math.sin(a) * CYL.orbit;
    const R = CYL.cham * (0.8 + 0.2 * f + 0.12 * Math.sin(Math.PI * f));
    dot(ctx, x, y, R, '#0c0a02');
    if (f < 1) { ctx.setLineDash([6 * k, 6 * k]); ring(ctx, x, y, R, DIM, 2.5 * k); ctx.setLineDash([]); }
    if (f > 0) {
      ctx.globalAlpha = 0.22 * lit;
      dot(ctx, x, y, R, s.col);
      ctx.globalAlpha = 1;
      ring(ctx, x, y, R, DIM, 3.5 * k);
      ctx.globalAlpha = lit;
      ring(ctx, x, y, R, s.col, 4 * k);
      const dr = ((((j - r) % 6) + 9) % 6) - 3;
      ctx.globalAlpha = clamp(1 - Math.abs(dr) * 2.5) * lit;
      ring(ctx, x, y, R + 4 * k, BRIGHT, 3 * k);
      ctx.globalAlpha = 1;
    }
    text(c, String(j + 1), x, y - 0.6 * CYL.cham, 18, mix('#6a5a30', GOLD, lit), 0);
    if (f > 0.4) {
      ctx.globalAlpha = clamp((f - 0.4) * 2.5);
      text(c, s.short, x, y + 0.14 * CYL.cham, 24, mix('#6a5a3a', s.col, lit), CYL.cham * 1.7);
      const pr = 4.5 * Math.min(k, 1.7), n = s.traits.length;
      s.traits.forEach((tr, q) =>
        dot(ctx, x + (q - (n - 1) / 2) * pr * 2.8, y + 0.74 * CYL.cham, pr, mix('#4a3a18', TRAIT[tr][1], lit)),
      );
      ctx.globalAlpha = 1;
    }
  };

  const drawCylinder = (c, t, r) => {
    const { ctx, k } = c;
    dot(ctx, CYL.x, CYL.y, CYL.outer, '#0a0800');
    ring(ctx, CYL.x, CYL.y, CYL.outer, DARKGOLD, 3 * k);
    ring(ctx, CYL.x, CYL.y, CYL.outer - 8, 'rgba(212,175,55,.25)', 2);
    // Spokes and notches turn with the cylinder so the turn reads even between two chambers.
    ctx.strokeStyle = 'rgba(212,175,55,.3)';
    ctx.lineWidth = 2 * k;
    for (let j = 0; j < 6; j++) {
      const a = -Math.PI / 2 + ((j - r) * Math.PI) / 3, b = a + Math.PI / 6;
      ctx.beginPath();
      ctx.moveTo(CYL.x + Math.cos(a) * CYL.hub, CYL.y + Math.sin(a) * CYL.hub);
      ctx.lineTo(CYL.x + Math.cos(a) * (CYL.orbit - CYL.cham), CYL.y + Math.sin(a) * (CYL.orbit - CYL.cham));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(CYL.x + Math.cos(b) * (CYL.outer - 8), CYL.y + Math.sin(b) * (CYL.outer - 8));
      ctx.lineTo(CYL.x + Math.cos(b) * (CYL.outer - 1), CYL.y + Math.sin(b) * (CYL.outer - 1));
      ctx.stroke();
    }
    dot(ctx, CYL.x, CYL.y, CYL.hub, '#1a1400');
    ring(ctx, CYL.x, CYL.y, CYL.hub, DARKGOLD, 2 * k);
    for (let j = 0; j < 6; j++) drawChamber(c, j, t, r);
    // Fire ring on the chamber at the mark
    T.forEach((v, i) => {
      const p = (t - v) / 0.4;
      if (p < 0 || p >= 1) return;
      ctx.globalAlpha = 1 - p;
      ring(ctx, CYL.x, CYL.y - CYL.orbit, CYL.cham * (1 + 0.6 * p), SLOT[i].col, 4 * k);
      ctx.globalAlpha = 1;
    });
    // Reload arc around the cylinder
    if (t >= RELOAD && t < RELOAD + RELOAD_DUR + 0.4) {
      const p = clamp((t - RELOAD) / RELOAD_DUR), fade = 1 - clamp((t - RELOAD - RELOAD_DUR) / 0.4);
      ctx.globalAlpha = fade;
      ring(ctx, CYL.x, CYL.y, CYL.outer - 2, 'rgba(255,215,0,.2)', 6 * k);
      ctx.strokeStyle = BRIGHT;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(CYL.x, CYL.y, CYL.outer - 2, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.globalAlpha = 1;
    }
    // Hub: shots left, or the reload word
    if (reloading(t)) text(c, '재장전', CYL.x, CYL.y, 22, BRIGHT, CYL.hub * 1.8);
    else text(c, String(t < T[0] - 0.05 ? 6 : t >= RELOAD ? 6 : 6 - shotsAt(t)), CYL.x, CYL.y, 40, GOLD, 0);
    // Firing mark at 12 o'clock
    ctx.fillStyle = BRIGHT;
    ctx.beginPath();
    ctx.moveTo(CYL.x, CYL.y - CYL.outer + 14);
    ctx.lineTo(CYL.x - 13 * Math.min(k, 1.5), CYL.y - CYL.outer - 8);
    ctx.lineTo(CYL.x + 13 * Math.min(k, 1.5), CYL.y - CYL.outer - 8);
    ctx.closePath();
    ctx.fill();
    // Brass
    const tau = t - RELOAD;
    if (tau > 0 && tau < 1.2) {
      CASINGS.forEach(q => {
        ctx.save();
        ctx.globalAlpha = 1 - clamp((tau - 0.7) / 0.5);
        ctx.translate(CYL.x + q.ox + q.vx * tau, CYL.y + CYL.outer - 10 + q.vy * tau + 450 * tau * tau);
        ctx.rotate(q.rot + q.vr * tau);
        ctx.fillStyle = GOLD;
        ctx.fillRect(-2.5 * k, -5 * k, 5 * k, 10 * k);
        ctx.restore();
      });
    }
  };

  const drawEnemy = (c, e, p) => {
    const { ctx, k } = c, r = e.r,
      eyes = (dy, rr) => {
        dot(ctx, p.x - r * 0.33, p.y + dy, rr, '#1a0a2a');
        dot(ctx, p.x + r * 0.33, p.y + dy, rr, '#1a0a2a');
      };
    ctx.fillStyle = e.col;
    if (e.kind === 'armor') {
      ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
      ctx.fillStyle = '#506070';
      ctx.fillRect(p.x - r + 4, p.y - r + 4, r * 2 - 8, r * 2 - 8);
      ctx.fillStyle = '#ff3030';
      ctx.fillRect(p.x - r * 0.55, p.y - r * 0.3, r * 0.4, 3 * k);
      ctx.fillRect(p.x + r * 0.15, p.y - r * 0.3, r * 0.4, 3 * k);
      ctx.strokeStyle = 'rgba(160,200,240,.7)';
      ctx.lineWidth = 3 * k;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 5, Math.PI * 0.75, Math.PI * 1.25);
      ctx.stroke();
      return;
    }
    ctx.beginPath();
    if (e.kind === 'sniper') ctx.ellipse(p.x, p.y, r * 0.8, r, 0, 0, Math.PI * 2);
    else if (e.kind === 'slime')
      ctx.ellipse(p.x, p.y + r * 0.2, r, r * 0.75, 0, 0, Math.PI * 2);
    else ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    if (e.kind === 'bomber') {
      ctx.fillStyle = '#000';
      ctx.fillRect(p.x - r * 0.6, p.y - 2 * k, r * 1.2, 4 * k);
      ctx.strokeStyle = '#8a5a30';
      ctx.lineWidth = 2 * k;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - r);
      ctx.lineTo(p.x + 3, p.y - r - 7);
      ctx.stroke();
    } else eyes(-r * 0.15, Math.max(2, r * 0.12) * Math.min(k, 1.5));
  };

  const drawArena = (c, t) => {
    const { ctx, k } = c, A = ARENA;
    ctx.fillStyle = '#080804';
    ctx.fillRect(A.x, A.y, A.w, A.h);
    ctx.strokeStyle = 'rgba(180,150,60,.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = A.x + 40; x < A.x + A.w; x += 40) { ctx.moveTo(x + 0.5, A.y); ctx.lineTo(x + 0.5, A.y + A.h); }
    for (let y = A.y + 40; y < A.y + A.h; y += 40) { ctx.moveTo(A.x, y + 0.5); ctx.lineTo(A.x + A.w, y + 0.5); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(212,175,55,.25)';
    ctx.lineWidth = 3;
    ctx.strokeRect(A.x - 5, A.y - 5, A.w + 10, A.h + 10);
    ctx.strokeStyle = DARKGOLD;
    ctx.lineWidth = 2 * Math.min(k, 1.5);
    ctx.strokeRect(A.x, A.y, A.w, A.h);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 3 * Math.min(k, 1.5);
    ctx.beginPath();
    [
      [A.x, A.y, 1, 1],
      [A.x + A.w, A.y, -1, 1],
      [A.x, A.y + A.h, 1, -1],
      [A.x + A.w, A.y + A.h, -1, -1],
    ].forEach(([x, y, sx, sy]) => { ctx.moveTo(x + 18 * sx, y); ctx.lineTo(x, y); ctx.lineTo(x, y + 18 * sy); });
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.rect(A.x, A.y, A.w, A.h);
    ctx.clip();

    // Ground effects: vortex field, mortar mark and blast
    const vt = t - VORTEX.t0;
    if (vt > 0 && vt < VORTEX_T + 0.3) {
      const al = Math.min(sm(vt / 0.3), 1 - sm((vt - VORTEX_T) / 0.3)),
        g = ctx.createRadialGradient(VORTEX.x, VORTEX.y, 0, VORTEX.x, VORTEX.y, VORTEX.rad);
      g.addColorStop(0, 'rgba(154,112,255,.45)');
      g.addColorStop(1, 'rgba(154,112,255,.08)');
      ctx.globalAlpha = al;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(VORTEX.x, VORTEX.y, VORTEX.rad, 0, Math.PI * 2);
      ctx.fill();
      ring(ctx, VORTEX.x, VORTEX.y, VORTEX.rad, '#9a70ff', 2.5 * k);
      ctx.strokeStyle = '#c9b0ff';
      ctx.lineWidth = 3 * k;
      ctx.lineCap = 'round';
      [0.35, 0.65, 0.95].forEach((q, n) => {
        const a0 = t * (2.4 - n * 0.5) + n * 2;
        ctx.beginPath();
        ctx.arc(VORTEX.x, VORTEX.y, VORTEX.rad * q, a0, a0 + 2.2);
        ctx.stroke();
      });
      ctx.lineCap = 'butt';
      const tick = (vt % 0.5) / 0.5;
      ctx.globalAlpha = al * (1 - tick) * 0.7;
      ring(ctx, VORTEX.x, VORTEX.y, VORTEX.rad * (0.3 + 0.7 * tick), '#9a70ff', 2 * k);
      ctx.globalAlpha = 1;
    }
    for (const s of shells) {
      const q = t - s.t0;
      if (q > 0 && q < s.ttl) {
        ctx.setLineDash([6 * k, 5 * k]);
        ctx.globalAlpha = 0.5 * sm(q / 0.3);
        ring(ctx, s.lx, s.ly, s.rad, '#ff9a60', 2 * k);
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
      }
      const b = q - s.ttl;
      if (b > 0 && b < 0.6) {
        const p = b / 0.6, g = ctx.createRadialGradient(s.lx, s.ly, 0, s.lx, s.ly, s.rad);
        g.addColorStop(0, 'rgba(255,200,120,.7)');
        g.addColorStop(1, 'rgba(255,120,40,.25)');
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.lx, s.ly, s.rad * (0.3 + 0.7 * sm(p * 2)), 0, Math.PI * 2);
        ctx.fill();
        ring(ctx, s.lx, s.ly, s.rad * (0.3 + 0.7 * sm(p * 2)), '#ffb070', 3 * k);
        ctx.globalAlpha = 1;
      }
    }

    for (const e of ENEMIES) {
      const p = enemyAt(e, t), hp = hpAt(e, t);
      drawEnemy(c, e, p);
      if (burns.some(b => b.e === e.i && t >= b.t0 && t < b.t1)) {
        for (let n = 0; n < 3; n++) {
          ctx.globalAlpha = 0.85;
          dot(
            ctx,
            p.x + (n - 1) * e.r * 0.5,
            p.y - e.r - 3 - Math.abs(Math.sin(t * 5 + n * 2)) * 7,
            3.2 * Math.min(k, 1.5),
            n === 1 ? '#ffb040' : '#ff6020',
          );
        }
        ctx.globalAlpha = 1;
      }
      if (hp < MAXHP) {
        const y = p.y - e.r - 14 * Math.min(k, 1.4);
        ctx.fillStyle = '#300';
        ctx.fillRect(p.x - 20, y, 40, 5 * Math.min(k, 1.5));
        ctx.fillStyle = '#f44';
        ctx.fillRect(p.x - 20, y, (40 * hp) / MAXHP, 5 * Math.min(k, 1.5));
      }
    }

    // Player: ghost hunter in a long coat and hat, gun turned toward the aim
    const a = aimAt(t);
    ctx.save();
    ctx.translate(PL.x, PL.y);
    ctx.scale(1.25, 1.25);
    dot(ctx, 0, 0, 22, 'rgba(232,213,160,.12)');
    ctx.fillStyle = '#4a3a2a';
    ctx.beginPath();
    ctx.ellipse(0, 2, 11, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    dot(ctx, 0, -6, 9, '#e8d5a0');
    ctx.fillStyle = '#150800';
    ctx.fillRect(-8, -16, 16, 5);
    ctx.fillRect(-5, -21, 10, 6);
    ctx.rotate(a);
    ctx.fillStyle = '#1a0a00';
    ctx.fillRect(8, -3, 14, 4);
    ctx.fillStyle = '#505050';
    ctx.fillRect(16, -2, 10, 3);
    ctx.restore();
    T.forEach((v, i) => {
      const p = (t - v) / 0.18;
      if (p < 0 || p >= 1) return;
      ctx.globalAlpha = 1 - p;
      dot(ctx, PL.x + Math.cos(AIM[i]) * MUZZLE, PL.y + Math.sin(AIM[i]) * MUZZLE, 12 * Math.min(k, 1.5), '#ffe080');
      ctx.globalAlpha = 1;
    });

    // Bullets, beam and shell
    for (const b of bullets) {
      if (t < b.t0 || t >= b.t1) continue;
      const x = b.x + b.vx * (t - b.t0), y = b.y + b.vy * (t - b.t0), r = b.r * Math.min(k, 1.6);
      ctx.strokeStyle = b.trail;
      ctx.lineWidth = r * 1.2;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(x - b.vx * 0.06, y - b.vy * 0.06);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.globalAlpha = 0.25;
      dot(ctx, x, y, r * 1.9, b.trail);
      ctx.globalAlpha = 1;
      dot(ctx, x, y, r, b.fill);
    }
    for (const m of beams) {
      const q = t - m.t0;
      if (q < 0 || q > m.dur) continue;
      const al = Math.min(sm(q / 0.12), 1 - sm((q - m.dur + 0.25) / 0.25)), ex = m.x + Math.cos(m.a) * m.len,
        ey = m.y + Math.sin(m.a) * m.len;
      ctx.lineCap = 'round';
      ctx.globalAlpha = al * 0.35;
      ctx.strokeStyle = '#80e8ff';
      ctx.lineWidth = 16 * Math.min(k, 1.5);
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.globalAlpha = al;
      ctx.strokeStyle = '#e8fbff';
      ctx.lineWidth = 5 * Math.min(k, 1.5);
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineCap = 'butt';
    }
    for (const s of shells) {
      const q = t - s.t0;
      if (q < 0 || q >= s.ttl) continue;
      const p = q / s.ttl, x = s.x + (s.lx - s.x) * p, y = s.y + (s.ly - s.y) * p, lift = 40 * Math.sin(Math.PI * p);
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.beginPath();
      ctx.ellipse(x, y, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      dot(ctx, x, y - lift, 7 * Math.min(k, 1.5), '#ffb890');
      ring(ctx, x, y - lift, 10 * Math.min(k, 1.5), 'rgba(255,154,96,.5)', 2);
    }
    // Hit sparks
    hits.forEach((h, n) => {
      const p = (t - h.t) / 0.3;
      if (p < 0 || p >= 1) return;
      ctx.globalAlpha = 1 - p;
      ctx.fillStyle = h.tick ? '#ffb070' : '#ffd966';
      for (let q = 0; q < 5; q++) {
        const an = q * 1.2566 + n, d = 6 + p * 22;
        ctx.fillRect(h.x + Math.cos(an) * d - 2.5 * k, h.y + Math.sin(an) * d - 2.5 * k, 5 * k, 5 * k);
      }
      ctx.globalAlpha = 1;
    });
    ctx.restore();
  };

  const draw = (c, t) => {
    const { ctx } = c, cap = captionAt(t);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    drawCylinder(c, t, rot(t));
    drawArena(c, t);
    const size = Math.max(22, 10.5 * c.u), y1 = 456 + size * 0.5, y2 = y1 + size * 1.15;
    text(c, cap.l1, CYL.x, y1, 22, cap.c, 400);
    text(c, cap.l2, CYL.x, y2, 22, '#d8c890', 400);
    text(c, cap.r1, ARENA.x + ARENA.w / 2, y1, 22, cap.c, ARENA.w);
    text(c, cap.r2, ARENA.x + ARENA.w / 2, y2, 22, '#d8c890', ARENA.w);
    // Fade to black over the loop seam
    const dark = t > LOOP - 0.5 ? (t - (LOOP - 0.5)) / 0.5 : t < 0.35 ? 1 - t / 0.35 : 0;
    if (dark > 0) { ctx.fillStyle = `rgba(0,0,0,${dark})`; ctx.fillRect(0, 0, W, H); }
  };

  // k thickens lines and dots on narrow screens, where the 960-wide scene is drawn small; u keeps text at 10 css px or more.
  const fit = canvas => canvasKit.fit(canvas, W, H);

  const hud = root.querySelector('[data-bgb-hud]');
  let shown = '';
  const setHud = t => { const next = hudAt(t); if (hud && next !== shown) hud.textContent = shown = next; };

  const stills = () => {
    for (const canvas of root.querySelectorAll('canvas[data-bgb-still]')) {
      if (!canvas.clientWidth) continue;
      draw(fit(canvas), Number(canvas.dataset.bgbStill));
    }
  };

  const motion = motionLoop.reduce;
  let view = null, clock = 0;
  const loop = motionLoop({
    target: screen,
    tick: dt => { clock += dt; if (clock >= LOOP) clock -= LOOP; draw(view, clock); setHud(clock); },
    onReduce: () => update(),
  });
  const update = () => {
    canvasKit.ready(root, motion.matches);
    // Fit after is-ready: a screen that is still display:none has no width to fit to.
    if (motion.matches) stills();
    else { view = fit(screen); draw(view, clock); setHud(clock); loop.update(); }
  };

  motionLoop.onResize(update);
  update();
  // The pixel font is drawn into the canvas, so redraw once it has loaded.
  canvasKit.fontReady(`16px ${FONT}`).then(() => { if (motion.matches) stills(); else draw(view, clock); });
})();
