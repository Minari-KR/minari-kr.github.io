// Barrel Good Barrel detail page, "맵 생성과 보상 시스템" and "위협 설계" (2026-10-22 request), two looping canvas scenes.
// The game's own values (from its latest index.html): 10 rooms made by a random walk (66% from the previous room, 34% from
// a random room), distance = |x|+|y|, the order the room types are given (boss, midboss, time attack, treasure, shop, elite,
// the rest combat), the minimap colours and letters, the three reward moments (entry, wave, clear), 3 cards each, a slot type
// for 28% of the cards and one guaranteed in the first card while fewer than 2 are owned; armor soldier (0.8 s telegraph,
// charge speed 350, stun 1.5 s, back x2, front x0.2), boss (radius 42, shield x0.5, core x2 for 3.0 / 2.0 / 1.5 s, laser 9 / 12 / 15
// shots, phases at HP 60% and 30%, bar colours, no shield in phase 3), dash invulnerability 0.25 s, base shot damage 2.
// Chosen to read well: the walk's seed (one fixed seed, so the loop never changes), canvas sizes and positions, the arena
// scale (0.75 of the game's pixels for speeds), the demo cards, the HP numbers on the way down, and the player's moves.
// The boss inner colour "#380" is copied literally from the analysis. Everything is drawn from the time t alone, so a still
// frame is the same picture the loop shows. Off screen or in a hidden tab it stops (motion-loop.js); with reduced motion it draws one still.
// Pace (user asked for slower, 2026-10-22): the scenes are still written in their original time t, and HOLDS freeze t between
// beats (rooms attach every 0.75 s, the zoomed room's cards stay 2 s, and so on), so every motion keeps its game speed and
// nothing is slowed down. Loop lengths: map about 26 s (was 14), threat about 18.5 s (was 12). Each caption/HUD text stays
// visible at least 1.5 s; the previous caption stays dimmed above the new one so the six room-type steps can run 1 s apart.
// Reduced-motion stills show the same moments as before (map: clear reward, threat: boss with the core of phase 1 open).
(() => {
  const roots = [...document.querySelectorAll('[data-bgb-system]')];
  if (!roots.length || !document.createElement('canvas').getContext) return;

  // ── Helpers ──
  const W = 960, H = 540;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ramp = (t, a, b) => clamp((t - a) / (b - a));
  const ease = k => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  const lerp = (a, b, k) => a + (b - a) * k;
  const FONT = 'NeoDunggeunmo, "Noto Sans KR", sans-serif';
  const GOLD = '#D4AF37';
  // v = { ctx, k (1–1.8 on narrow screens), min (10 css px in canvas units), g (base alpha) }
  const px = (v, u) => Math.max(u * v.k, v.min);
  const A = (v, a = 1) => { v.ctx.globalAlpha = v.g * a; };
  const txt = (v, s, x, y, u, col, align = 'left', a = 1) => {
    const c = v.ctx;
    c.font = `${px(v, u)}px ${FONT}`;
    c.textAlign = align;
    c.textBaseline = 'middle';
    A(v, a);
    c.fillStyle = col;
    c.fillText(s, x, y);
    A(v);
  };
  // Draws the first wording that fits maxW; extra notes simply drop out on the narrowest screens.
  const say = (v, opts, x, y, u, col, align, maxW, a = 1) => {
    v.ctx.font = `${px(v, u)}px ${FONT}`;
    const s = opts.find(o => v.ctx.measureText(o).width <= maxW);
    if (s) txt(v, s, x, y, u, col, align, a);
  };
  const num = (v, s, x, y, u, col, a) => {
    const c = v.ctx;
    c.font = `bold ${px(v, u)}px "Courier New", monospace`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    A(v, a);
    c.fillStyle = col;
    c.fillText(s, x, y);
    A(v);
  };
  const rr = (c, x, y, w, h, r) => {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  };
  const circle = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); };
  // The top strip stays dark like the game screen; the HUD text above it is gold (detail.css, Barrel Good Barrel screens).
  const strip = v => {
    const c = v.ctx;
    A(v);
    c.fillStyle = '#0a0a06';
    c.fillRect(0, 0, W, 40);
    c.fillStyle = '#B8860B';
    c.fillRect(0, 40, W, 2);
  };
  const arenaBox = (v, x, y, w, h) => {
    const c = v.ctx;
    A(v);
    c.fillStyle = '#080804';
    c.fillRect(x, y, w, h);
    c.strokeStyle = 'rgba(180,150,60,.1)';
    c.lineWidth = 1;
    c.beginPath();
    for (let gx = x + 32; gx < x + w; gx += 64) { c.moveTo(gx, y); c.lineTo(gx, y + h); }
    for (let gy = y + 32; gy < y + h; gy += 64) { c.moveTo(x, gy); c.lineTo(x + w, gy); }
    c.stroke();
    c.strokeStyle = '#B8860B';
    c.lineWidth = 2 * v.k;
    c.strokeRect(x, y, w, h);
    c.strokeStyle = 'rgba(212,175,55,.25)';
    c.lineWidth = 1;
    c.strokeRect(x + 5, y + 5, w - 10, h - 10);
    c.strokeStyle = GOLD;
    c.lineWidth = 2;
    c.beginPath(); // corner marks
    [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(([a, b, sx, sy]) => {
      c.moveTo(a + 18 * sx, b + 3 * sy);
      c.lineTo(a + 3 * sx, b + 3 * sy);
      c.lineTo(a + 3 * sx, b + 18 * sy);
    });
    c.stroke();
  };

  // ── Scene "map": the random-walk floor, room types, the three reward moments ──
  const mulberry = a => () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const TYPE = {
    // the game's minimap colours and letters
    start: { col: '#b8d4ff', ch: 'S' },
    boss: { col: '#ff5050', ch: 'B' },
    midboss: { col: '#b8d4ff', ch: 'M' },
    time: { col: '#80d0ff', ch: 'T' },
    treasure: { col: '#ffd040', ch: '?' },
    shop: { col: '#70ff90', ch: '$' },
    elite: { col: '#ff9c70', ch: 'E' },
    combat: { col: GOLD, ch: '' },
  };
  const RW = 112, RH = 70, PITCH_X = 150,
    PITCH_Y = 94; // room size and pitch on the canvas
  const MAP = (() => {
    const rnd = mulberry(16), R = [{ x: 0, y: 0 }];
    const at = (x, y) => R.findIndex(q => q.x === x && q.y === y);
    while (R.length < 10) {
      const prev = rnd() < 0.66, from = prev ? R.length - 1 : Math.floor(rnd() * R.length);
      const free = DIRS.map(([a, b]) => [R[from].x + a, R[from].y + b]).filter(([x, y]) => at(x, y) < 0);
      if (!free.length) continue;
      const [x, y] = free[Math.floor(rnd() * free.length)];
      R.push({ x, y, parent: from, prev });
    }
    const adj = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
    R.forEach((q, i) => {
      q.d = Math.abs(q.x) + Math.abs(q.y);
      q.doors = R.filter(o => adj(o, q)).length;
      q.type = i ? '' : 'start';
      q.place = 0.25 + 0.48 * i;
      q.typeT = i ? 99 : 0.25;
    });
    // The code's order: each rule picks from the rooms still without a type.
    const pick = (ok, cmp) => R.map((q, i) => i).filter(i => i && !R[i].type && ok(R[i])).sort(cmp)[0];
    const far = (a, b) => R[b].d - R[a].d, near3 = (a, b) => Math.abs(R[a].d - 3) - Math.abs(R[b].d - 3);
    const steps = [
      ['boss', () => true, (a, b) => far(a, b) || R[a].doors - R[b].doors, '보스 · 시작방에서 가장 먼 방'],
      ['midboss', q => q.d >= 2, near3, '중간보스 · 거리 3에 가까운 방'],
      ['time', q => q.d >= 2, far, '타임어택 · 거리 2 이상 중 가장 먼 방'],
      ['treasure', q => q.doors <= 1, far, '보물 · 막다른 방 중 가장 먼 방'],
      ['shop', q => q.d >= 2, near3, '상점 · 거리 3에 가까운 방'],
      ['elite', () => true, far, '정예 · 남은 방 중 가장 먼 방'],
    ];
    const order = steps.map(([type, ok, cmp, words], n) => {
      const i = pick(ok, cmp);
      R[i].type = type;
      R[i].typeT = 5.6 + 0.55 * n;
      return { i, type, words };
    });
    R.forEach(q => { if (!q.type) { q.type = 'combat'; q.typeT = 8.85; } });
    const links = [];
    R.forEach((a, i) =>
      R.forEach((b, j) => { if (j > i && adj(a, b)) links.push({ i, j, t: Math.max(a.place, b.place) + 0.12 }); }),
    );
    const minx = Math.min(...R.map(q => q.x)), maxx = Math.max(...R.map(q => q.x)), maxy = Math.max(...R.map(q => q.y));
    const ox = (W - (maxx - minx) * PITCH_X - RW) / 2, oy = 84;
    R.forEach(q => { q.cx = ox + (q.x - minx) * PITCH_X + RW / 2; q.cy = oy + (maxy - q.y) * PITCH_Y + RH / 2; });
    return { R, links, order, E: order.find(o => o.type === 'elite').i, minx, maxx, maxy };
  })();
  const PANE = { x: 24, y: 72, w: 376, h: 235 }; // where the elite room lands after the zoom
  PANE.cx = PANE.x + PANE.w / 2;
  PANE.cy = PANE.y + PANE.h / 2;
  const SETS = [
    // demo cards (chosen), shown when each reward moment starts; pick = the card taken
    {
      name: '입장 보상',
      hud: '입장',
      s: 9.9,
      pick: 10.45,
      end: 10.75,
      take: 0,
      cards: [{ slot: 1, n: '산탄', c: '#ffb870' }, { n: '관통', c: '#80ffc0' }, { n: '과부하', c: '#ff4040' }],
    },
    {
      name: '웨이브 보상',
      hud: '웨이브',
      s: 11.3,
      pick: 11.8,
      end: 12.1,
      take: 1,
      cards: [{ n: '점화', c: '#ff6020' }, { slot: 1, n: '대구경', c: '#ffe080' }, { n: '표식', c: '#ffa040' }],
    },
    {
      name: '클리어 보상',
      hud: '클리어',
      s: 12.15,
      pick: 13.2,
      end: 13.75,
      take: 2,
      cards: [{ n: '연발', c: '#ffd040' }, { n: '관통', c: '#80ffc0' }, { slot: 1, n: '분산탄', c: '#ff9cd8' }],
    },
  ];
  const setAt = t => SETS.filter(S => t >= S.s - 0.05).pop() || SETS[0];

  const drawMapRooms = (v, t) => {
    const c = v.ctx, k = v.k, { R, links } = MAP;
    // empty grid cells hint at the grid the walk happens on
    c.strokeStyle = 'rgba(180,150,60,.16)';
    c.lineWidth = 1;
    c.setLineDash([4, 5]);
    A(v);
    for (let gx = MAP.minx; gx <= MAP.maxx; gx++) for (let gy = MAP.maxy - 3; gy <= MAP.maxy; gy++)
        c.strokeRect(R[0].cx + gx * PITCH_X - RW / 2, R[0].cy - gy * PITCH_Y - RH / 2, RW, RH);
    c.setLineDash([]);
    for (const L of links) {
      const a = R[L.i], b = R[L.j], p = ramp(t, L.t, L.t + 0.25);
      if (p <= 0) continue;
      c.strokeStyle = '#B8860B';
      c.lineWidth = 3 * k;
      A(v);
      c.beginPath();
      c.moveTo(a.cx, a.cy);
      c.lineTo(lerp(a.cx, b.cx, p), lerp(a.cy, b.cy, p));
      c.stroke();
    }
    const placed = R.filter(q => t >= q.place), last = placed[placed.length - 1];
    R.forEach((q, i) => {
      const a = ramp(t, q.place, q.place + 0.25);
      if (a <= 0) return;
      const bump = i ? 1 + 0.12 * Math.sin(Math.PI * ramp(t, q.typeT, q.typeT + 0.4)) : 1, s = (0.6 + 0.4 * ease(a)) * bump;
      c.save();
      c.translate(q.cx, q.cy);
      c.scale(s, s);
      const x = -RW / 2, y = -RH / 2, T = TYPE[q.type] || TYPE.combat, ta = ramp(t, q.typeT, q.typeT + 0.3);
      A(v, a);
      rr(c, x, y, RW, RH, 6);
      c.fillStyle = '#0a0800';
      c.fill();
      c.strokeStyle = '#B8860B';
      c.lineWidth = 2 * k;
      c.stroke();
      if (ta > 0) {
        A(v, a * ta);
        c.fillStyle = T.col + '33';
        rr(c, x, y, RW, RH, 6);
        c.fill();
        c.strokeStyle = T.col;
        c.lineWidth = 3 * k;
        c.stroke();
        if (T.ch) txt(v, T.ch, 0, 3, 28, T.col, 'center', a * ta);
      }
      c.restore();
      // distance numbers appear briefly before the types are given
      const da = ramp(t, 4.95, 5.2) * (1 - ramp(t, 7.9, 8.4));
      if (da > 0 && i) num(v, String(q.d), q.cx - RW / 2 + 15, q.cy - RH / 2 + 15, 18, '#e8d5a0', da * a);
      // glow on the newest room and the room it grew from
      if (t < 5 && (i === last.parent || q === last)) {
        const g = q === last ? 1 - ramp(t, q.place + 0.3, q.place + 0.7) : 1 - ramp(t, last.place, last.place + 0.5);
        A(v, g * 0.9);
        c.strokeStyle = q === last ? '#fff8c0' : '#FFD700';
        c.lineWidth = 3 * k;
        rr(c, q.cx - RW / 2 - 4, q.cy - RH / 2 - 4, RW + 8, RH + 8, 8);
        c.stroke();
      }
    });
    A(v);
  };

  const drawCard = (v, x, y, it, a, chosen) => {
    const c = v.ctx, k = v.k, w = 156, h = 200;
    c.save();
    c.translate(x + w / 2, y + h / 2 + (1 - a) * 14);
    const s = chosen ? 1.04 : 1;
    c.scale(s, s);
    c.translate(-w / 2, -h / 2);
    A(v, a);
    rr(c, 0, 0, w, h, 8);
    c.fillStyle = it.slot ? '#1a1030' : '#100c08';
    c.fill();
    c.strokeStyle = chosen ? '#FFD700' : it.slot ? '#9a70ff' : '#6b5520';
    c.lineWidth = (chosen ? 4 : 2) * k;
    c.stroke();
    say(v, it.slot ? ['◈ 발사 패턴 ◈', '◈ 패턴 ◈'] : ['특성'], w / 2, 24, 14, it.slot ? '#c9b0ff' : '#c8b070', 'center', w - 12, a);
    if (it.slot) {
      // slot types get a hexagon
      c.beginPath();
      for (let n = 0; n < 6; n++) {
        const q = (Math.PI / 3) * n + Math.PI / 6;
        c.lineTo(w / 2 + Math.cos(q) * 34, 92 + Math.sin(q) * 34);
      }
      c.closePath();
      c.fillStyle = it.c + '40';
      c.fill();
      c.strokeStyle = it.c;
      c.lineWidth = 3 * k;
      c.stroke();
    } else {
      rr(c, w / 2 - 28, 64, 56, 56, 8);
      c.fillStyle = '#100c08';
      c.fill();
      c.strokeStyle = it.c;
      c.lineWidth = 3 * k;
      c.stroke();
      circle(c, w / 2, 92, 12);
      c.fillStyle = it.c;
      c.fill();
    }
    txt(v, it.n, w / 2, h - 40, 24, '#fff4d0', 'center', a);
    c.restore();
    A(v);
  };

  const drawDetail = (v, t) => {
    const c = v.ctx, k = v.k, { x, y, w, h } = PANE, f = ramp(t, 9.4, 9.9);
    // the zoomed room: pillar cross layout, as the game gives an elite room
    A(v, f);
    c.fillStyle = '#080804';
    c.fillRect(x, y, w, h);
    c.strokeStyle = 'rgba(180,150,60,.14)';
    c.lineWidth = 1;
    c.beginPath();
    for (let gx = x + 24; gx < x + w; gx += 24) { c.moveTo(gx, y); c.lineTo(gx, y + h); }
    for (let gy = y + 24; gy < y + h; gy += 24) { c.moveTo(x, gy); c.lineTo(x + w, gy); }
    c.stroke();
    c.strokeStyle = TYPE.elite.col;
    c.lineWidth = 3 * k;
    c.strokeRect(x, y, w, h);
    const lock = t >= 10.8 && t < 12.1;
    c.fillStyle = lock ? '#ff5050' : GOLD;
    c.fillRect(x + w / 2 - 20, y - 2, 40, 7);
    c.fillRect(x + w / 2 - 20, y + h - 5, 40, 7);
    c.fillRect(x - 2, y + h / 2 - 20, 7, 40);
    c.fillRect(x + w - 5, y + h / 2 - 20, 7, 40);
    for (const [dx, dy, r] of [[0, 0, 20], [-100, -58, 13], [100, -58, 13], [-100, 58, 13], [100, 58, 13],]) {
      circle(c, PANE.cx + dx, PANE.cy + dy, r);
      c.fillStyle = '#2a2628';
      c.fill();
      c.strokeStyle = '#837879';
      c.lineWidth = 2;
      c.stroke();
    }
    [
      ['#a0c8e8', -130, -20],
      ['#c0a0d8', 125, 10],
      ['#708090', -60, 70],
      ['#72ffa8', 70, -75],
      ['#ff8840', 20, 80],
    ].forEach(([col, dx, dy], n) => {
      const born = ramp(t, 10.85, 11.05), die = ramp(t, 11.1 + 0.05 * n, 11.3 + 0.05 * n);
      if (born > 0 && die < 1) {
        A(v, f * born * (1 - die));
        circle(c, PANE.cx + dx, PANE.cy + dy, Math.max(7 * k, 7));
        c.fillStyle = col;
        c.fill();
      }
      if (die > 0 && die < 1) {
        A(v, f * (1 - die));
        c.strokeStyle = '#ff9090';
        c.lineWidth = 2 * k;
        circle(c, PANE.cx + dx, PANE.cy + dy, 8 + 18 * die);
        c.stroke();
      }
    });
    A(v, f);
    circle(c, x + 56, y + h - 44, Math.max(8 * k, 8));
    c.fillStyle = '#e8d5a0';
    c.fill(); // the player
    txt(v, '정예방', x, 340, 22, '#ff9c70', 'left', f);
    txt(v, t < 10.8 ? '입장' : lock ? '문 잠김 · 전투' : '문 열림', x, 374, 20, '#e8d5a0', 'left', f);
    if (t >= 12.15)
      txt(v, '+$3', x + w - 20, y + h - 20 - 16 * ramp(t, 12.15, 12.9), 22, GOLD, 'right', f * (1 - ramp(t, 12.9, 13.4)));

    SETS.forEach(S =>
      S.cards.forEach((it, i) => {
        const a = ramp(t, S.s + 0.08 * i, S.s + 0.08 * i + 0.2) *
          (1 - ramp(t, S.end - 0.2, S.end));
        if (a > 0) drawCard(v, 420 + i * 180, 78, it, a * f, t >= S.pick && i === S.take);
      }),
    );
    // the guaranteed slot type, only on the first reward
    const na = ramp(t, 9.95, 10.15) * (1 - ramp(t, 10.6, 10.8)) * f;
    say(v, ['첫 카드는 발사 패턴 보장'], 678, 304, 22, '#c9b0ff', 'center', 516, na);
    say(v, ['보유 발사 패턴이 2개 미만일 때'], 678, 334, 15, '#a090d0', 'center', 516, na);
    // 28% / 72% bar
    const bx = 420, bw = 516, by = 360;
    A(v, f);
    c.fillStyle = '#9a70ff';
    c.fillRect(bx, by, bw * 0.28, 16);
    c.fillStyle = GOLD;
    c.fillRect(bx + bw * 0.28, by, bw * 0.72, 16);
    txt(v, '발사 패턴 28%', bx, by + 36, 18, '#c9b0ff', 'left', f);
    txt(v, '특성 72%', bx + bw, by + 36, 18, '#e8d5a0', 'right', f);
    // the three moments as chips
    SETS.forEach((S, n) => {
      const cx = 30 + n * 310, nextS = SETS[n + 1] ? SETS[n + 1].s - 0.05 : 99, lit = t >= S.s - 0.05 && t < nextS,
        done = t >= nextS;
      A(v, f);
      rr(c, cx, 430, 280, 54, 8);
      c.fillStyle = lit ? 'rgba(255,215,0,.22)' : '#0a0800';
      c.fill();
      c.strokeStyle = lit ? '#FFD700' : lit || done ? GOLD : '#504010';
      c.lineWidth = (lit ? 3 : 2) * k;
      c.stroke();
      txt(v, `${n + 1} ${S.name}`, cx + 140, 458, 22, lit ? '#FFD700' : done ? GOLD : '#7a6a40', 'center', f);
    });
    say(v, ['클리어 보상: 보상방만(정예·타임어택·중간보스)'], W / 2, 510, 17, '#a89868', 'center', 900, f * ramp(t, 12.1, 12.3));
    A(v);
  };

  // Caption lines in order; the previous line stays dimmed above the current one.
  const LINES = [
    [0, ['S 시작방에서 출발 · 직전 방 66% · 아무 방 34%', '방을 하나씩 뻗기 · 66% / 34%']],
    [4.9, ['거리 = |가로| + |세로| (시작방 기준)']],
    ...MAP.order.map(o => [MAP.R[o.i].typeT, [`${TYPE[o.type].ch} ${o.words}`]]),
    [8.85, ['나머지는 일반 전투방']],
  ];

  const drawMap = (v, t) => {
    const c = v.ctx, e = ease(ramp(t, 8.9, 9.8)), mapA = 1 - ramp(t, 9.3, 9.9), E = MAP.R[MAP.E];
    c.fillStyle = '#000';
    c.fillRect(0, 0, W, H);
    if (mapA > 0) {
      const s = 1 + (PANE.w / RW - 1) * e;
      c.save();
      v.g = mapA;
      c.translate(lerp(E.cx, PANE.cx, e), lerp(E.cy, PANE.cy, e));
      c.scale(s, s);
      c.translate(-E.cx, -E.cy);
      drawMapRooms(v, t);
      c.restore();
      v.g = 1;
    }
    if (t >= 9.4) drawDetail(v, t);
    // caption at the bottom while the map is visible
    const R = MAP.R, placedN = R.filter(q => t >= q.place).length, n = LINES.filter(([a]) => t >= a).length - 1,
      capA = 1 - ramp(t, 9.0, 9.3);
    let hud;
    if (capA > 0) {
      say(v, LINES[n][1], W / 2, 500, 22, '#e8d5a0', 'center', 900, capA);
      if (n > 0) say(v, LINES[n - 1][1], W / 2, 466, 16, '#a89868', 'center', 900, 0.55 * capA);
      txt(v, `방 ${placedN} / 10`, W - 24, 62, 18, '#e8d5a0', 'right', capA);
    }
    if (t < 4.9) hud = '방 추가·무작위 연결';
    else if (t < 9.3) hud = '거리 계산·방 종류 정하기';
    else { const set = setAt(t); hud = `방 ${MAP.E + 1} / 10·보상: ${set.hud}`; }
    const dark = Math.max(1 - ramp(t, 0, 0.3), ramp(t, 13.6, 14)); // fade to black at the loop edges
    if (dark > 0) { c.fillStyle = `rgba(0,0,0,${dark})`; c.fillRect(0, 0, W, H); }
    strip(v);
    return hud;
  };

  // ── Scene "threat": armor soldier, then the boss shield / core ──
  const AR = { x: 40, y: 56, w: 880, h: 468 };
  const SC = 0.75; // game pixels → canvas pixels in the arena
  const PHASE = [
    null,
    { col: '#802020', fill: '#380', bar: '#D4AF37' },
    { col: '#b02222', fill: '#500', bar: '#FFD700' },
    { col: '#d03018', fill: '#500', bar: '#ff6a3d' },
  ];
  const player = (v, x, y, aim, ghost) => {
    const c = v.ctx;
    c.save();
    c.translate(x, y);
    c.scale(1.25, 1.25);
    A(v, ghost ? 0.4 : 1);
    c.fillStyle = ghost || '#4a3a2a';
    c.beginPath();
    c.ellipse(0, 2, 11, 14, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = ghost || '#e8d5a0';
    circle(c, 0, -6, 9);
    c.fill();
    c.fillStyle = ghost || '#150800';
    c.fillRect(-8, -16, 16, 5);
    c.fillRect(-5, -21, 10, 6);
    c.rotate(aim);
    c.fillStyle = ghost || '#1a0a00';
    c.fillRect(8, -3, 14, 4);
    c.fillStyle = ghost || '#505050';
    c.fillRect(16, -2, 10, 3);
    c.restore();
    A(v);
  };
  const bullet = (v, x, y, r, fill, glow) => {
    const c = v.ctx;
    A(v, 0.35);
    circle(c, x, y, r * 2.2);
    c.fillStyle = glow;
    c.fill();
    A(v);
    circle(c, x, y, r);
    c.fillStyle = fill;
    c.fill();
  };
  const pop = (v, t, at, x, y, text, col, life = 0.7) => {
    // a damage number that rises and fades
    const p = (t - at) / life;
    if (p >= 0 && p < 1) num(v, text, x, y - 26 * p, 22, col, 1 - p * p);
  };
  const drain = (v, x, y, w, frac, col) => {
    const c = v.ctx;
    A(v);
    c.fillStyle = 'rgba(255,255,255,.14)';
    c.fillRect(x - w / 2, y, w, 10);
    c.fillStyle = col;
    c.fillRect(x - w / 2, y, w * clamp(frac), 10);
  };

  const drawArmor = (v, t) => {
    const c = v.ctx, k = v.k, R = 26, PIL = { x: 150, y: 300, r: 36 }, XH = PIL.x + PIL.r + R, X0 = XH + 350 * SC * 0.9;
    arenaBox(v, AR.x, AR.y, AR.w, AR.h);
    c.save(); // zoom the action 1.4x so it fills the arena
    c.translate(480, 300); c.scale(1.4, 1.4); c.translate(-330, -300);
    circle(c, PIL.x, PIL.y, PIL.r);
    c.fillStyle = '#2a2628';
    c.fill();
    c.strokeStyle = '#837879';
    c.lineWidth = 3 * k;
    c.stroke();
    const ax = t < 1.0 ? X0 : t < 1.9 ? lerp(X0, XH, (t - 1.0) / 0.9) : XH, ay = PIL.y;
    const dash = ease(ramp(t, 0.95, 1.2)), P = { x: 330, y: lerp(300, 230, dash) };
    // red dashed telegraph for 0.8 s (it fades in once and holds, no flicker)
    const tel = ramp(t, 0.2, 0.35) * (1 - ramp(t, 1.0, 1.15));
    if (tel > 0) {
      c.save();
      c.setLineDash([14 * k, 10 * k]);
      c.strokeStyle = '#ff4040';
      c.lineWidth = 3 * k;
      A(v, tel * 0.9);
      c.beginPath();
      c.moveTo(ax - R - 6, ay);
      c.lineTo(PIL.x + PIL.r + 4, ay);
      c.stroke();
      c.restore();
      A(v);
      drain(v, ax, ay - R - 24, 110, 1 - ramp(t, 0.2, 1.0), '#ff4040');
      txt(v, '예고 0.8초', ax, ay - R - 48, 20, '#ff8080', 'center', tel);
    }
    // dash afterimages and the 0.25 s invulnerability
    if (dash > 0 && dash < 1) for (let n = 1; n <= 3; n++) player(v, P.x, lerp(300, P.y, 1 - n * 0.25), -0.5, '#80a0ff');
    say(
      v,
      ['대시 무적 0.25초'],
      P.x + 40,
      205,
      18,
      '#a8c0ff',
      'left',
      AR.x + AR.w - P.x - 50,
      ramp(t, 1.0, 1.15) * (1 - ramp(t, 1.7, 1.9)),
    );
    // soldier: a square with red eyes and a blue shield arc in front (gone while stunned)
    const stun = t >= 1.9 && t < 3.4, face = t < 3.4 ? Math.PI
          : lerp(Math.PI, 2 * Math.PI + Math.atan2(P.y - ay, P.x - ax), ease(ramp(t, 3.4, 3.6)));
    c.save();
    c.translate(ax, ay);
    c.rotate(face);
    A(v);
    c.fillStyle = '#708090';
    c.fillRect(-R, -R, 2 * R, 2 * R);
    c.fillStyle = '#506070';
    c.fillRect(-R + 6, -R + 6, 2 * R - 12, 2 * R - 12);
    c.strokeStyle = '#ff3030';
    c.lineWidth = 3 * k;
    c.beginPath();
    c.moveTo(R - 10, -9);
    c.lineTo(R - 2, -9);
    c.moveTo(R - 10, 9);
    c.lineTo(R - 2, 9);
    c.stroke();
    if (!stun) {
      c.strokeStyle = 'rgba(160,200,240,.8)';
      c.lineWidth = 5 * k;
      c.beginPath();
      c.arc(0, 0, R + 9, -0.45 * Math.PI, 0.45 * Math.PI);
      c.stroke();
    }
    c.restore();
    if (t >= 1.9 && t < 2.25) {
      const p = ramp(t, 1.9, 2.25);
      A(v, 1 - p);
      c.strokeStyle = '#ffe070';
      c.lineWidth = 3 * k;
      circle(c, ax - R, ay, 6 + 44 * p);
      c.stroke();
      A(v);
    }
    if (stun) {
      for (let n = 0; n < 3; n++) {
        const q = t * 6.3 + n * 2.094;
        A(v);
        circle(c, ax + Math.cos(q) * 22, ay - R - 10 + Math.sin(q) * 6, 4 * k);
        c.fillStyle = '#ffe070';
        c.fill();
      }
      txt(v, 'STUN', ax, ay - R - 40, 30, '#ffe070', 'center');
      drain(v, ax, ay - R - 74, 110, 1 - ramp(t, 1.9, 3.4), '#ffe070');
      txt(v, '기절 1.5초', ax, ay + R + 32, 20, '#ffe070', 'center');
      txt(v, '뒤에서 ×2', ax, ay + R + 64, 20, '#ffb3a8', 'center', ramp(t, 2.5, 2.65));
    }
    // the player: shots from behind while the soldier is stunned, then one from the front
    player(v, P.x, P.y, Math.atan2(ay - P.y, (t < 3.4 ? ax : XH) - P.x));
    for (const [ts, back] of [[2.25, 1], [2.7, 1], [3.15, 1], [3.42, 0],]) {
      const dur = Math.hypot(ax - P.x, ay - P.y) / (660 * SC), q = (t - ts) / dur;
      if (q >= 0 && q < 1) bullet(v, lerp(P.x, ax, q), lerp(P.y, ay, q), Math.max(5 * k, 5), '#fff8c0', '#ffe080');
      if (back) pop(v, t, ts + dur, ax + 16, ay - 8, '4', '#ffb3a8');
      else {
        pop(v, t, ts + dur, ax + 30, ay - 22, '0.4', '#a0c8e8', 0.8);
        const p = (t - ts - dur) / 0.8;
        if (p >= 0 && p < 1) txt(v, 'BLOCKED ×0.2', ax + 52, ay + R + 36, 22, '#a0c8e8', 'left', 1 - p * p);
      }
    }
    c.restore();
    return t < 1.0 ? '아머 예고 0.8초' : t < 1.9 ? '아머 돌진 속도 350' : t < 3.4 ? '아머 기절 1.5초' : '아머 정면 ×0.2';
  };

  const hpAt = t => {
    const K = [[4, 100], [5.4, 97], [8.4, 60], [9.3, 59], [11.3, 30], [12, 29]]; // chosen: shield hits chip it, core hits drop it
    for (let n = 1; n < K.length; n++) if (t <= K[n][0]) return lerp(K[n - 1][1], K[n][1], ramp(t, K[n - 1][0], K[n][0]));
    return K[K.length - 1][1];
  };
  const BOSS = { x: 480, y: 290, r: 52 }; // the game's radius 42, drawn about 1.24x
  const CORES = [[5.4, 8.4, 3.0], [9.3, 11.3, 2.0], [11.3, 12.8, 1.5]];
  const LASERS = [{ t0: 4.8, n: 9, gap: 0.075, spd: 310 }, { t0: 8.5, n: 12, gap: 0.06, spd: 360 }];
  const PY = 410, playerX = t => 480 + 170 * Math.sin((t - 4) * 0.8);

  const drawBoss = (v, t) => {
    const c = v.ctx, k = v.k, ph = t < 8.4 ? 1 : t < 11.3 ? 2 : 3, PH = PHASE[ph];
    arenaBox(v, AR.x, AR.y, AR.w, AR.h);
    const core = CORES.find(([a, b]) => t >= a && t < b), shield = ph < 3 && !core, hp = hpAt(t);
    // HP bar with 60% / 30% marks in the phase colour
    const bx = 230, by = 68, bw = 670;
    A(v);
    c.fillStyle = '#300';
    c.fillRect(bx, by, bw, 16);
    c.fillStyle = PH.bar;
    c.fillRect(bx, by, (bw * hp) / 100, 16);
    c.fillStyle = '#fff';
    c.fillRect(bx + bw * 0.3 - 1, by - 3, 3, 22);
    c.fillRect(bx + bw * 0.6 - 1, by - 3, 3, 22);
    c.strokeStyle = '#B8860B';
    c.lineWidth = 2;
    c.strokeRect(bx, by, bw, 16);
    txt(v, `BOSS P${ph}`, 52, by + 8, 18, PH.bar, 'left');
    txt(v, '30%', bx + bw * 0.3, by + 34, 15, '#e8d5a0', 'center');
    txt(v, '60%', bx + bw * 0.6, by + 34, 15, '#e8d5a0', 'center');
    c.save(); // zoom the boss and shots 1.25x; the HP bar and the table stay put
    c.translate(480, 290); c.scale(1.25, 1.25); c.translate(-480, -290);
    for (const [at, col] of [[8.4, '#ff6060'], [11.3, '#ffb060'],]) {
      // one ring when a phase begins
      const p = ramp(t, at, at + 0.7);
      if (p > 0 && p < 1) {
        A(v, 1 - p);
        c.strokeStyle = col;
        c.lineWidth = 4 * k;
        circle(c, BOSS.x, BOSS.y, BOSS.r + 150 * p);
        c.stroke();
        A(v);
      }
    }
    circle(c, BOSS.x, BOSS.y, BOSS.r);
    c.fillStyle = PH.col;
    c.fill();
    circle(c, BOSS.x, BOSS.y, BOSS.r * 0.68);
    c.fillStyle = PH.fill;
    c.fill();
    c.fillStyle = '#ff8800';
    circle(c, BOSS.x - 16, BOSS.y - 6, 7);
    c.fill();
    circle(c, BOSS.x + 16, BOSS.y - 6, 7);
    c.fill();
    if (core) {
      // the red core opens and pulses about once a second
      const [a, b, dur] = core, open = ramp(t, a, a + 0.25) * (1 - ramp(t, b - 0.15, b)), pulse = 0.88 + 0.12 * Math.sin(t * 6.3);
      A(v, 0.4 * open);
      circle(c, BOSS.x, BOSS.y + 10, 30 * open + 6);
      c.fillStyle = '#ff2020';
      c.fill();
      A(v, open);
      circle(c, BOSS.x, BOSS.y + 10, 20 * open * pulse);
      c.fillStyle = '#ff3a3a';
      c.fill();
      c.strokeStyle = '#ffd0d0';
      c.lineWidth = 2 * k;
      c.stroke();
      A(v);
      say(
        v,
        ph === 3 ? ['코어 노출 1.5초 · 방패 없음', '방패 없음 · 피해 ×2'] : [`코어 노출 ${dur.toFixed(1)}초 · 피해 ×2`, '코어 노출 ×2'],
        BOSS.x,
        BOSS.y - BOSS.r - 46,
        22,
        '#ff8080',
        'center',
        700,
      );
      drain(v, BOSS.x, BOSS.y - BOSS.r - 26, 230, 1 - (t - a) / dur, '#ff4040');
    }
    if (shield) {
      A(v);
      circle(c, BOSS.x, BOSS.y, BOSS.r + 16);
      c.fillStyle = 'rgba(90,150,255,.14)';
      c.fill();
      c.strokeStyle = 'rgba(110,170,255,.85)';
      c.lineWidth = 5 * k;
      c.stroke();
      txt(v, 'SHIELDED ×0.5', BOSS.x, BOSS.y - BOSS.r - 40, 22, '#a8c8ff', 'center');
    }
    for (const L of LASERS) {
      // the laser: shots in a row along one direction, aimed where the player stood
      const ang = Math.atan2(PY - BOSS.y, playerX(L.t0) - BOSS.x);
      for (let n = 0; n < L.n; n++) {
        const age = t - (L.t0 + n * L.gap);
        if (age < 0) continue;
        const x = BOSS.x + Math.cos(ang) * L.spd * SC * age, y = BOSS.y + Math.sin(ang) * L.spd * SC * age;
        if (x > 136 && x < 824 && y > 111 && y < 440) bullet(v, x, y, Math.max(6 * k, 6), '#ff9090', '#ff6060');
      }
    }
    // the player strafes and shoots every 0.6 s; the damage number shows what the boss was doing when it hit
    const px_ = playerX(t);
    player(v, px_, PY, Math.atan2(BOSS.y - PY, BOSS.x - px_));
    for (let j = 0; j < 13; j++) {
      const ts = 4.3 + 0.6 * j, ox = playerX(ts), d = Math.hypot(BOSS.x - ox, BOSS.y - PY), dur = d / (660 * SC),
        q = (t - ts) / dur;
      if (q >= 0 && q < 1) bullet(v, lerp(ox, BOSS.x, q), lerp(PY, BOSS.y, q), Math.max(5 * k, 5), '#fff8c0', '#ffe080');
      const th = ts + dur, hitCore = CORES.some(([a, b]) => th >= a && th < b), hitShield = th < 5.4 || (th >= 8.4 && th < 9.3);
      pop(
        v,
        t,
        th,
        BOSS.x + 40 + (j % 3) * 22,
        BOSS.y - 4 - (j % 2) * 18,
        hitCore ? '4' : hitShield ? '1' : '2',
        hitCore ? '#ffe070' : '#ffb3a8',
      );
    }
    c.restore();
    [
      ['P1 · 9발 · 코어 3.0초', 'P1 9발 3.0초'],
      ['P2 · 12발 · 코어 2.0초', 'P2 12발 2.0초'],
      ['P3 · 15발 · 1.5초 · 방패 없음', 'P3 15발 1.5초'],
    ].forEach((o, n) => {
      const x = AR.x + 8 + n * 292, cur = n + 1 === ph;
      A(v);
      rr(c, x, 482, 280, 36, 6);
      c.fillStyle = cur ? 'rgba(255,215,0,.18)' : '#0a0800';
      c.fill();
      c.strokeStyle = cur ? PHASE[n + 1].bar : '#504010';
      c.lineWidth = (cur ? 3 : 2) * k;
      c.stroke();
      say(v, o, x + 140, 501, 17, cur ? '#fff4d0' : '#8a7a50', 'center', 264);
    });
    return core ? `페이즈 ${ph}·코어 ${core[2].toFixed(1)}초` : ph === 3 ? '페이즈 3·방패 없음' : `페이즈 ${ph}·방패 ×0.5`;
  };

  const drawThreat = (v, t) => {
    const c = v.ctx;
    c.fillStyle = '#000';
    c.fillRect(0, 0, W, H);
    const a1 = ramp(t, 0, 0.3) * (1 - ramp(t, 3.95, 4.2)), a2 = ramp(t, 4.2, 4.5) * (1 - ramp(t, 12.8, 13.1));
    let hud = '';
    if (a1 > 0) { v.g = a1; hud = drawArmor(v, t); v.g = 1; }
    if (a2 > 0) { v.g = a2; hud = drawBoss(v, t); v.g = 1; }
    if (!hud) hud = t < 4 ? '아머 예고 0.8초' : '페이즈 1·방패 ×0.5';
    strip(v);
    return hud;
  };

  // [t, seconds]: the scene time t stands still for that many seconds (see header). Every hold sits where the picture is at rest.
  const MAP_HOLDS = [
    ...Array.from({ length: 9 }, (_, i) => [0.25 + 0.48 * i + 0.38, 0.27]), // rooms 1–9 attach every 0.75 s
    [4.89, 0.5], // all 10 placed
    [5.3, 0.5], // distance numbers
    ...Array.from({ length: 6 }, (_, i) => [5.6 + 0.55 * i + 0.42, 0.45]), // each room type
    [9.0, 0.8], // plain combat rooms, zoom just starting
    [10.44, 1.7], // entry reward cards
    [11.05, 0.4], // wave enemies
    [11.75, 1.7], // wave reward cards
    [12.9, 1.0], // clear reward cards
    [13.3, 0.2], // clear reward pick
  ];
  const THREAT_HOLDS = [
    [0.4, 0.7], // telegraph
    [1.65, 0.65], // charge and dash invulnerability
    [2.05, 0.5], // STUN
    [3.05, 0.7], // back hits x2
    [3.85, 0.9], // BLOCKED x0.2
    [4.2, 0.4], // between armor and boss
    [5.0, 0.5], // phase 1 shield and laser
    [8.8, 0.65], // phase 2 shield
    [11.5, 0.4], // phase 3
  ];
  const scene = (end, holds, still, draw) => {
    const total = holds.reduce((n, h) => n + h[1], 0);
    return {
      length: end + total,
      still: still + holds.filter(h => h[0] < still).reduce((n, h) => n + h[1], 0),
      // loop time T → scene time t
      at: T => {
        let off = 0;
        for (const [h, d] of holds) { const start = h + off; if (T < start) break; if (T < start + d) return h; off += d; }
        return T - off;
      },
      draw,
    };
  };
  const SCENES = { map: scene(14, MAP_HOLDS, 12.5, drawMap), threat: scene(13.1, THREAT_HOLDS, 6.5, drawThreat) };

  // ── Players ──
  const motion = motionLoop.reduce;
  const players = roots
    .map(root => {
      const scene = SCENES[root.dataset.bgbSystem], canvas = root.querySelector('canvas');
      return { root, scene, canvas, hud: root.querySelector('[data-bgb-hud]'), t: 0, view: null, shown: '' };
    })
    .filter(p => p.scene && p.canvas);

  // k (1–1.8) thickens lines and enlarges text on narrow screens, where the 960-wide scene is drawn small.
  const fit = p => {
    const view = canvasKit.fit(p.canvas, W, H);
    p.view = { ctx: view.ctx, k: view.k, min: 10 * view.u, g: 1 };
  };
  const paint = p => {
    p.view.ctx.globalAlpha = 1;
    p.view.ctx.setLineDash([]);
    const hud = p.scene.draw(p.view, p.scene.at(p.t));
    if (p.hud && p.shown !== hud) p.hud.textContent = p.shown = hud;
  };

  // Each system plays on its own, only while it is on screen and the tab is visible (motion-loop.js).
  for (const p of players) {
    p.loop = motionLoop({ target: p.canvas, tick: dt => { p.t = (p.t + dt) % p.scene.length; paint(p); }, });
  }
  const update = () => {
    for (const p of players) {
      canvasKit.ready(p.root);
      fit(p);
      if (motion.matches) p.t = p.scene.still;
      paint(p);
      p.loop.update();
    }
  };
  motion.addEventListener('change', update);
  let resizeTimer;
  window.addEventListener('resize', () => { window.clearTimeout(resizeTimer); resizeTimer = window.setTimeout(update, 120); });
  // The pixel font is drawn into the canvas, so the first picture waits for it.
  canvasKit.fontReady(`16px ${FONT}`).then(update);
})();
