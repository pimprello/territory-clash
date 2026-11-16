// Territory Clash: the battle, headless. A drag-to-capture territory war on an island of Voronoi territories.
// Every hold grows troops; each kingdom's mind picks an order (a drag from one of its holds to a neighbour), the troops march
// along it in a stream, and arriving troops fight the hold's garrison one for one (times its defence). Take a hold and it's
// yours. Streams meeting head-on on the same road cancel out (a mid-road clash). Last kingdom standing wins; otherwise the
// most territories at the bell (60 s). Fixed 1/120 s ticks; every system has its own dice stream; drawing never reads them.
'use strict';
const D = require('./tc-data.js');

const DT = 1 / 120, FIGHT = 60;
// the board, in the Shorts' 1080x1920 layout units: the island lives in x 60..1020, y 420..1500 (clear of the scoreboard
// above and YouTube's title and buttons below)
const BOARD = { x0: 60, x1: 1020, y0: 420, y1: 1500, cx: 540, cy: 960, rx: 452, ry: 512 };

function rng(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// ----- the island -----
function makeIsland(R) {
  const w = [];
  for (const k of [2, 3, 4, 5]) w.push({ k, a: (0.13 / k) * (0.6 + R() * 0.8) * 2.2, p: R() * Math.PI * 2 });
  const rOf = th => { let r = 1; for (const q of w) r += q.a * Math.sin(q.k * th + q.p); return r * 0.97; };
  const inside = (x, y) => { const dx = (x - BOARD.cx) / BOARD.rx, dy = (y - BOARD.cy) / BOARD.ry; return Math.hypot(dx, dy) < rOf(Math.atan2(dy, dx)) && x > BOARD.x0 + 6 && x < BOARD.x1 - 6 && y > BOARD.y0 + 6 && y < BOARD.y1 - 6; };
  const outline = [];
  for (let i = 0; i < 240; i++) {
    const th = (i / 240) * Math.PI * 2, r = rOf(th);
    let x = BOARD.cx + Math.cos(th) * r * BOARD.rx, y = BOARD.cy + Math.sin(th) * r * BOARD.ry;
    x = Math.max(BOARD.x0 + 6, Math.min(BOARD.x1 - 6, x)); y = Math.max(BOARD.y0 + 6, Math.min(BOARD.y1 - 6, y));
    outline.push({ x, y });
  }
  return { inside, outline };
}

// Voronoi cells by half-plane clipping; every edge remembers which neighbour made it (-1: the board's edge)
function clipCell(sites, i) {
  const s = sites[i];
  let poly = [{ x: BOARD.x0 - 40, y: BOARD.y0 - 40, e: -1 }, { x: BOARD.x1 + 40, y: BOARD.y0 - 40, e: -1 }, { x: BOARD.x1 + 40, y: BOARD.y1 + 40, e: -1 }, { x: BOARD.x0 - 40, y: BOARD.y1 + 40, e: -1 }];
  for (let j = 0; j < sites.length; j++) {
    if (j === i) continue;
    const o = sites[j], mx = (s.x + o.x) / 2, my = (s.y + o.y) / 2, nx = o.x - s.x, ny = o.y - s.y;
    const f = p => (p.x - mx) * nx + (p.y - my) * ny;
    const out = [];
    for (let k = 0; k < poly.length; k++) {
      const A = poly[k], B = poly[(k + 1) % poly.length], fa = f(A), fb = f(B);
      const I = () => { const t = fa / (fa - fb); return { x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t }; };
      if (fa <= 0 && fb <= 0) out.push(A);
      else if (fa <= 0 && fb > 0) { out.push(A); out.push(Object.assign(I(), { e: j })); }
      else if (fa > 0 && fb <= 0) out.push(Object.assign(I(), { e: A.e }));
    }
    poly = out;
    if (poly.length < 3) break;
  }
  return poly;
}
const inPoly = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c; } return c; };

function makeMap(seed, nCells) {
  const R = rng((seed ^ 0x7E2217) >>> 0);
  for (let attempt = 0; attempt < 8; attempt++) {
    const isl = makeIsland(R);
    // Poisson-disc darts, then two rounds of Lloyd relaxation on the land
    let area = 0; for (let y = BOARD.y0; y < BOARD.y1; y += 10) for (let x = BOARD.x0; x < BOARD.x1; x += 10) if (isl.inside(x, y)) area += 100;
    let dmin = Math.sqrt(area / nCells) * 0.82, sites = [];
    for (let tries = 0; tries < 6 && sites.length < nCells; tries++, dmin *= 0.93) {
      sites = [];
      for (let k = 0; k < 6000 && sites.length < nCells; k++) {
        const x = BOARD.x0 + R() * (BOARD.x1 - BOARD.x0), y = BOARD.y0 + R() * (BOARD.y1 - BOARD.y0);
        if (!isl.inside(x, y)) continue;
        if (sites.every(s => (s.x - x) ** 2 + (s.y - y) ** 2 > dmin * dmin)) sites.push({ x, y });
      }
    }
    if (sites.length < nCells) continue;
    for (let it = 0; it < 2; it++) {
      const polys = sites.map((_, i) => clipCell(sites, i));
      sites = polys.map((p, i) => {
        let sx = 0, sy = 0, n = 0;
        const xs = p.map(v => v.x), ys = p.map(v => v.y);
        for (let y = Math.min(...ys); y < Math.max(...ys); y += 8) for (let x = Math.min(...xs); x < Math.max(...xs); x += 8) if (isl.inside(x, y) && inPoly(p, x, y)) { sx += x; sy += y; n++; }
        return n ? { x: sx / n, y: sy / n } : sites[i];
      });
    }
    const polys = sites.map((_, i) => clipCell(sites, i));
    // land area of each cell, and its neighbours across a land border (an edge with land along it)
    const cells = sites.map((s, i) => {
      const p = polys[i], xs = p.map(v => v.x), ys = p.map(v => v.y);
      let n = 0, coast = false;
      for (let y = Math.min(...ys); y < Math.max(...ys); y += 8) for (let x = Math.min(...xs); x < Math.max(...xs); x += 8) if (inPoly(p, x, y)) { if (isl.inside(x, y)) n++; else coast = true; }
      return { id: i, x: s.x, y: s.y, poly: p, area: n * 64, coast, nb: [] };
    });
    for (const c of cells) {
      for (let k = 0; k < c.poly.length; k++) {
        const A = c.poly[k], B = c.poly[(k + 1) % c.poly.length], j = A.e;
        if (j < 0 || c.nb.includes(j)) continue;
        if (Math.hypot(B.x - A.x, B.y - A.y) < 14) continue;
        let land = 0; for (let q = 1; q < 6; q++) { const t = q / 6; if (isl.inside(A.x + (B.x - A.x) * t, A.y + (B.y - A.y) * t)) land++; }
        if (land >= 2 && isl.inside((c.x + cells[j].x) / 2, (c.y + cells[j].y) / 2)) c.nb.push(j);
      }
    }
    for (const c of cells) c.nb = c.nb.filter(j => cells[j].nb.includes(c.id));
    // every cell reachable, every cell with real land
    if (cells.some(c => c.area < 2500 || !c.nb.length)) continue;
    const seen = new Set([0]), q = [0];
    while (q.length) { const i = q.shift(); for (const j of cells[i].nb) if (!seen.has(j)) { seen.add(j); q.push(j); } }
    if (seen.size !== cells.length) continue;
    return { cells, outline: isl.outline, inside: isl.inside };
  }
  throw new Error('could not make a map for seed ' + seed);
}

function hops(cells, from) {
  const h = new Array(cells.length).fill(99); h[from] = 0; const q = [from];
  while (q.length) { const i = q.shift(); for (const j of cells[i].nb) if (h[j] > h[i] + 1) { h[j] = h[i] + 1; q.push(j); } }
  return h;
}

class TCSim {
  // opts: { kingdoms: [keys], mode, tempo, underdogPower, theme }
  constructor(seed, opts) {
    this.seed = seed >>> 0; this.opts = opts;
    const S = s => rng(((seed >>> 0) ^ s) >>> 0);
    this.MR = S(0x3A9F11); this.AIR = S(0xA1D0E5); this.EVR = S(0x3E1D7A); this.NMR = S(0x4A3E5);
    this.mode = D.MODES[opts.mode] ? opts.mode : 'war'; const M = D.MODES[this.mode];
    this.K = opts.kingdoms.map(k => Object.assign({ key: k }, D.KINGDOMS[k]));
    this.tempo = opts.tempo || 1;
    const nCells = opts.cells || Math.round(M.cells[0] + this.MR() * (M.cells[1] - M.cells[0]));
    const map = makeMap(seed, nCells);
    this.cells = map.cells; this.outline = map.outline; this.inside = map.inside;
    this.t = 0; this.done = false; this.streams = []; this.log = []; this.snaps = []; this.uid = 0;
    this.stat = { captures: 0, capitals: 0, clashes: 0, bigClash: 0, leadChanges: 0, firstOut: null, minCells: this.K.map(() => 99), maxCells: this.K.map(() => 0), orders: this.K.map(() => 0), firstOrder: this.K.map(() => null) };
    this.setupHolds(M);
    this.nextThink = this.K.map((K, i) => 0.6 + i * 0.17 + this.AIR() * 0.3);
    this.leader = -1; this.leadT = 0;
    this.out = this.K.map(() => null);
    this.pact = null;
    this.events = this.planEvents();
    this.timers = { merc: 10, dawn: 15 };
  }
  setupHolds(M) {
    const C = this.cells, R = this.MR, nk = this.K.length;
    // capitals: spread round the island (greedy: each new one as far, in steps, from the others as possible)
    const caps = [];
    const centre = C.reduce((b, c) => (Math.hypot(c.x - 540, c.y - 960) < Math.hypot(b.x - 540, b.y - 960) ? c : b));
    const hc = hops(C, centre.id);
    let first = C.filter(c => hc[c.id] >= Math.max(...hc) - 1); first = first[Math.floor(R() * first.length)];
    caps.push(first.id);
    while (caps.length < nk) {
      const H = caps.map(i => hops(C, i));
      let best = null, bs = -1;
      for (const c of C) { if (caps.includes(c.id)) continue; const m = Math.min(...H.map(h => h[c.id])) + hc[c.id] * 0.35 + R() * 0.2; if (m > bs) { bs = m; best = c; } }
      caps.push(best.id);
    }
    for (const c of C) { c.type = 'village'; c.owner = -1; }
    caps.forEach((id, k) => { C[id].type = 'capital'; C[id].owner = k; C[id].n = D.HOLDS.capital.garrison[0]; C[id].name = this.K[k].capital; });
    if (M.crown) { centre.type = 'crown'; centre.name = 'THE GREAT CROWN'; }
    // forts on the busiest crossroads, then farms and mines among the rest
    const free = () => C.filter(c => c.type === 'village');
    free().sort((a, b) => b.nb.length - a.nb.length || a.id - b.id).slice(0, 2 + Math.floor(R() * 2)).forEach(c => (c.type = 'fort'));
    for (let i = 0; i < 3 + Math.floor(R() * 2); i++) { const f = free(); f[Math.floor(R() * f.length)].type = 'farm'; }
    { const f = free(); f[Math.floor(R() * f.length)].type = 'mine'; }
    // names
    const used = new Set(this.K.map(k => k.capital));
    for (const c of C) if (!c.name) { let nm; do { nm = D.NAME_A[Math.floor(this.NMR() * D.NAME_A.length)] + D.NAME_B[Math.floor(this.NMR() * D.NAME_B.length)]; } while (used.has(nm)); used.add(nm); c.name = nm; }
    // garrisons, then each kingdom's starting land (the nearest free holds to its capital)
    for (const c of C) if (c.owner < 0) { const g = D.HOLDS[c.type].garrison; c.n = Math.round(g[0] + R() * (g[1] - g[0])); }
    caps.forEach((id, k) => {
      const extra = (M.underdog && k === 0 ? 1 : M.start) - 1;
      const h = hops(C, id);
      const near = C.filter(c => c.owner < 0 && c.type !== 'crown' && h[c.id] === 1).sort((a, b) => dist(a, C[id]) - dist(b, C[id]));
      for (const c of near.slice(0, extra)) { c.owner = k; c.n = 8; c.type = c.type === 'fort' ? 'village' : c.type; }
    });
    this.caps = caps;
    for (const c of C) c.n0 = c.n, c.owner0 = c.owner, c.flipT = -9;
  }
  planEvents() {
    const R = this.EVR, ev = [], kinds = this.opts.events || ['revolt', 'storm', 'harvest', 'fog'];
    if (R() < (this.opts.eventChance ?? 0.7)) { const k = kinds[Math.floor(R() * kinds.length)]; ev.push({ kind: k, t: 22 + R() * 16, len: k === 'harvest' ? 5 : 6, done: false }); }
    if (this.mode === 'pact') { ev.push({ kind: 'pact', t: 7 + R() * 3, done: false }); }
    return ev;
  }
  // ----- helpers -----
  cellsOf(k) { return this.cells.filter(c => c.owner === k); }
  alive(k) { return this.cells.some(c => c.owner === k) || this.streams.some(s => s.k === k && (s.packets.length || s.left > 0)); }
  defOf(c) { const K = c.owner >= 0 ? this.K[c.owner] : null; let d = D.HOLDS[c.type].def * (K ? K.def : 1); if (K && K.trait === 'bastion' && c.type === 'fort') d += 0.2; return d; }
  capOf(c) { const K = c.owner >= 0 ? this.K[c.owner] : null; let cap = D.HOLDS[c.type].cap; if (K && K.trait === 'bastion' && c.type === 'fort') cap = Math.round(cap * 1.3); return cap; }
  score(k) { const own = this.cellsOf(k); return own.length + (own.some(c => c.type === 'crown') ? 4 : 0); }
  troops(k) { let n = 0; for (const c of this.cells) if (c.owner === k) n += c.n; for (const s of this.streams) if (s.k === k) n += s.packets.length + s.left; return n; }
  blocked(k, o) {
    if (o < 0) return false;
    const K = this.K[k];
    if (K.trait === 'honour' && this.cellsOf(o).length <= 1) return 'honour';
    const P = this.pact;
    if (P && P.on && ((P.a === k && P.b === o) || (P.b === k && P.a === o))) return !(P.breaker === k && this.t >= P.breakT);
    return false;
  }
  note(kind, o) { this.log.push(Object.assign({ t: +this.t.toFixed(2), kind }, o)); }
  // ----- orders: a stream from cell a to cell b (via a sea lane if they aren't neighbours) -----
  order(k, a, b, n, why) {
    a.n -= n;
    const sea = !a.nb.includes(b.id);
    const path = [{ x: a.x, y: a.y }, { x: b.x, y: b.y }];
    const len = dist(a, b) * (sea ? 1.15 : 1);
    this.streams.push({ id: ++this.uid, k, from: a.id, to: b.id, path, len, sea, left: n, sent: n, rate: 14, timer: 1, packets: [], t0: this.t, why });
    this.stat.orders[k]++;
    if (this.stat.firstOrder[k] == null) this.stat.firstOrder[k] = this.t;
    if (n >= 14 && why !== 'move') this.note('order', { k, from: a.id, to: b.id, n, target: b.owner, why, sea });
  }
  // ----- a kingdom's mind -----
  think(k) {
    const K = this.K[k], C = this.cells, mine = this.cellsOf(k);
    if (!mine.length) return;
    const fog = this.events.some(e => e.kind === 'fog' && e.on);
    const allIn = this.t >= FIGHT - 10;   // LAST ORDERS: in the final 10 seconds every kingdom throws everything in
    const incoming = new Map();   // troops of k already on their way to each cell
    for (const s of this.streams) if (s.k === k) incoming.set(s.to, (incoming.get(s.to) || 0) + s.packets.length + s.left);
    const threat = new Map();      // enemy troops on their way to each of k's cells
    for (const s of this.streams) if (s.k !== k && C[s.to].owner === k) threat.set(s.to, (threat.get(s.to) || 0) + s.packets.length + s.left);
    const engaged = o => this.streams.some(s => s.k === o && C[s.to].owner !== o && C[s.to].owner !== k && (s.packets.length || s.left));
    const lead = this.leader;
    let best = null;
    const P = this.pact, breaking = P && P.on && P.breaker === k && this.t >= P.breakT;
    for (const a of mine) {
      if (a.n < 5) continue;
      const send = Math.floor(a.n * (allIn ? Math.max(K.send, 0.88) : K.send));
      if (send < 4) continue;
      const targets = a.nb.map(j => C[j]);
      if (K.trait === 'sealanes' && a.coast) for (const j of a.nb) for (const j2 of C[j].nb) { const c2 = C[j2]; if (c2.id !== a.id && c2.coast && !a.nb.includes(c2.id) && !targets.includes(c2)) targets.push(c2); }
      for (const b of targets) {
        if (b.owner === k) continue;
        const bl = this.blocked(k, b.owner); if (bl) continue;
        const need = b.n * this.defOf(b) + (threat.get(a.id) ? 0 : 0) - (incoming.get(b.id) || 0);
        if (send <= need + K.margin * (allIn ? 0.4 : 1)) continue;
        let v = D.HOLDS[b.type].value * (b.owner < 0 ? K.neutral : 1);
        if (b.owner >= 0 && b.owner === lead) v *= 1.2;
        if (b.owner >= 0 && b.type === 'capital') v *= 1.35;
        if (K.trait === 'opportunist' && b.owner >= 0 && engaged(b.owner)) v *= 1.45;
        if (K.trait === 'raider') v *= 12 / (Math.max(0, need) + 6);
        if (breaking && b.owner === (P.a === k ? P.b : P.a)) v *= 3;
        if (fog) v *= 10 / (Math.max(0, need) + 4);
        const sea = !a.nb.includes(b.id);
        const sc = (v * (1 + Math.min(1, (send - need) / 25))) / (1 + dist(a, b) / 350) * (sea ? 0.8 : 1);
        if (!best || sc > best.sc) best = { sc, a, b, n: send, why: b.owner < 0 ? 'expand' : 'attack' };
      }
    }
    // defend a hold that is about to fall
    for (const b of mine) {
      const th = threat.get(b.id) || 0;
      if (th <= 0 || th < b.n * this.defOf(b) - 2) continue;
      for (const j of b.nb) {
        const a = C[j]; if (a.owner !== k || a.n < 8 || (threat.get(a.id) || 0) > 0) continue;
        const n = Math.floor(a.n * 0.6), sc = 2.0 * D.HOLDS[b.type].value * Math.min(1.5, n / Math.max(4, th));
        if (!best || sc > best.sc) best = { sc, a, b, n, why: 'defend' };
      }
    }
    // move troops from safe holds towards the front
    if (!best || best.sc < 0.6) {
      const front = c => c.nb.some(j => C[j].owner !== k);
      const hf = new Array(C.length).fill(99), q = [];
      for (const c of mine) if (front(c)) { hf[c.id] = 0; q.push(c.id); }
      while (q.length) { const i = q.shift(); for (const j of C[i].nb) if (C[j].owner === k && hf[j] > hf[i] + 1) { hf[j] = hf[i] + 1; q.push(j); } }
      for (const a of mine) {
        if (front(a) || a.n < 16) continue;
        const to = a.nb.map(j => C[j]).filter(c => c.owner === k).sort((x, y) => hf[x.id] - hf[y.id] || x.n - y.n)[0];
        if (to) { const sc = 0.5 + a.n / 200; if (!best || sc > best.sc) best = { sc, a, b: to, n: Math.floor(a.n * 0.75), why: 'move' }; }
      }
    }
    if (best && best.sc > 0.2 && best.n >= 4) {
      if (breaking && best.b.owner === (P.a === k ? P.b : P.a) && !P.broken) { P.broken = true; P.on = false; this.note('betrayal', { k, k2: best.b.owner, cell: best.b.id }); }
      this.order(k, best.a, best.b, best.n, best.why);
    }
  }
  // ----- one fixed tick -----
  tick() {
    const C = this.cells, dt = DT, T = this.tempo;
    this.t += dt;
    // world events
    for (const e of this.events) {
      if (!e.done && this.t >= e.t) { e.done = true; e.on = true; this.fireEvent(e); }
      if (e.on && e.len && this.t >= e.t + e.len) { e.on = false; this.note('eventEnd', { event: e.kind }); }
    }
    const P = this.pact;
    if (P && P.on && this.t >= P.end) { P.on = false; this.note('pactEnd', { k: P.a, k2: P.b }); }
    const harvest = this.events.some(e => e.kind === 'harvest' && e.on) ? 2 : 1;
    const storm = this.events.some(e => e.kind === 'storm' && e.on) ? 0.5 : 1;
    // growth
    for (const c of C) {
      if (c.owner < 0) continue;
      const K = this.K[c.owner];
      let g = D.HOLDS[c.type].grow * T * harvest;
      if (K.trait === 'rootgrowth' && (c.type === 'village' || c.type === 'farm')) g *= K.grow; else g *= K.trait === 'rootgrowth' ? 1 : K.grow;
      if (this.opts.underdogPower && c.owner === 0 && D.MODES[this.mode].underdog) g *= this.opts.underdogPower;
      c.n = Math.min(this.capOf(c), c.n + g * dt);
    }
    // signature timers
    this.timers.merc -= dt * T; this.timers.dawn -= dt * T;
    if (this.timers.merc <= 0) { this.timers.merc += 10; this.K.forEach((K, k) => { if (K.trait !== 'mercs') return; const cap = C[this.caps[k]]; if (cap.owner === k) { cap.n = Math.min(this.capOf(cap), cap.n + 5); this.note('mercs', { k, cell: cap.id }); } }); }
    if (this.timers.dawn <= 0) { this.timers.dawn += 15; this.K.forEach((K, k) => { if (K.trait !== 'dawn') return; const own = this.cellsOf(k); if (!own.length) return; for (const c of own) c.n = Math.min(this.capOf(c), c.n + 2); this.note('dawn', { k }); }); }
    // streams: departures, marching, head-on clashes, arrivals
    for (const s of this.streams) {
      if (s.left > 0) { s.timer += dt * s.rate; while (s.timer >= 1 && s.left > 0) { s.packets.push(0); s.left--; s.timer -= 1; } }
      const v = 150 * this.K[s.k].speed * storm * (s.sea ? 0.9 : 1);
      for (let i = 0; i < s.packets.length; i++) s.packets[i] += v * dt;
    }
    for (let i = 0; i < this.streams.length; i++) for (let j = i + 1; j < this.streams.length; j++) {
      const A = this.streams[i], B = this.streams[j];
      if (A.k === B.k || A.sea || B.sea || A.from !== B.to || A.to !== B.from) continue;
      let n = 0;
      while (A.packets.length && B.packets.length && A.packets[0] + B.packets[0] >= A.len) { A.packets.shift(); B.packets.shift(); n++; }
      if (n) { this.stat.clashes += n; A.clash = (A.clash || 0) + n; B.clash = (B.clash || 0) + n; if (A.clash >= 10 && !A.clashLogged) { A.clashLogged = B.clashLogged = true; this.stat.bigClash++; this.note('clash', { k: A.k, k2: B.k, from: A.from, to: A.to }); } }
    }
    for (const s of this.streams) {
      while (s.packets.length && s.packets[0] >= s.len) { s.packets.shift(); this.arrive(s, C[s.to]); }
    }
    this.streams = this.streams.filter(s => s.left > 0 || s.packets.length);
    // minds
    this.K.forEach((K, k) => { if (this.out[k] != null) return; if (this.t >= this.nextThink[k]) { this.think(k); this.nextThink[k] = this.t + (K.cadence * (0.85 + this.AIR() * 0.3) * (this.t >= FIGHT - 10 ? 0.75 : 1)) / Math.sqrt(T); } });
    // eliminations, the lead, the end
    if (Math.round(this.t * 120) % 12 === 0) this.bookkeep();
  }
  arrive(s, c) {
    const k = s.k;
    if (c.owner === k) { c.n = Math.min(this.capOf(c) + 20, c.n + 1); return; }
    c.n -= 1 / this.defOf(c);
    if (c.n < 0) {
      const prev = c.owner;
      c.owner = k; c.n = 0.5; c.flipT = this.t; this.stat.captures++;
      // the stream that was leaving the fallen hold stops (its troops already on the road keep going)
      for (const o of this.streams) if (o.from === c.id && o.k === prev) o.left = 0;
      if (c.type === 'capital' && prev >= 0) { this.stat.capitals++; (this.stat.capFell || (this.stat.capFell = new Set())).add(c.id); this.note('capital', { k, k2: prev, cell: c.id, own: this.caps[prev] === c.id }); }
      else this.note('capture', { k, k2: prev, cell: c.id, type: c.type });
      this.K.forEach((K, h) => { if (K.trait === 'grave' && h !== k && h !== prev) { const cap = this.cells[this.caps[h]]; if (cap.owner === h) cap.n = Math.min(this.capOf(cap), cap.n + 1); } });
    }
  }
  fireEvent(e) {
    const C = this.cells;
    if (e.kind === 'pact') {
      // the two kingdoms with the least land band together against the other two
      const live = this.K.map((K, k) => k).filter(k => this.out[k] == null).sort((a, b) => this.score(a) - this.score(b) || this.troops(a) - this.troops(b));
      if (live.length < 3) return;
      const [a, b] = live;
      const breaker = this.K[a].trait === 'opportunist' ? a : this.K[b].trait === 'opportunist' ? b : (this.EVR() < 0.4 ? (this.EVR() < 0.5 ? a : b) : -1);
      this.pact = { a, b, on: true, t: this.t, end: this.t + 28, breaker, breakT: breaker >= 0 ? this.t + 9 + this.EVR() * 11 : 99, broken: false };
      this.note('pact', { k: a, k2: b });
      return;
    }
    this.note('event', { event: e.kind });
    if (e.kind === 'revolt') {
      this.K.forEach((K, k) => {
        const own = this.cellsOf(k).filter(c => c.type !== 'capital');
        if (own.length < 2) return;
        const c = own.filter(c => c.nb.some(j => C[j].owner !== k)).sort((x, y) => x.n - y.n)[0] || own[0];
        c.owner = -1; c.n = Math.max(4, Math.round(c.n * 0.5)); c.flipT = this.t;
        for (const o of this.streams) if (o.from === c.id && o.k === k) o.left = 0;
      });
    }
  }
  bookkeep() {
    const K = this.K;
    K.forEach((_, k) => {
      if (this.out[k] != null) return;
      const n = this.cellsOf(k).length;
      if (!n && !this.landless) this.landless = [];
      if (!n && !this.landless.includes(k)) { this.landless.push(k); this.note('landless', { k }); }
      this.stat.minCells[k] = Math.min(this.stat.minCells[k], this.t > 3 ? n : 99); this.stat.maxCells[k] = Math.max(this.stat.maxCells[k], n);
      if (!this.alive(k)) { this.out[k] = this.t; if (this.stat.firstOut == null) this.stat.firstOut = this.t; this.note('out', { k }); }
    });
    // the leader: most land (then troops), and only a clear change counts
    const live = K.map((_, k) => k).filter(k => this.out[k] == null);
    const rank = live.slice().sort((a, b) => this.score(b) - this.score(a) || this.troops(b) - this.troops(a));
    const top = rank[0];
    if (top !== this.leader && (rank.length < 2 || this.score(top) > this.score(rank[1]))) {
      if (this.leader >= 0 && this.t > 4) { this.stat.leadChanges++; this.note('lead', { k: top, k2: this.leader }); }
      this.leader = top; this.leadT = this.t;
    }
    if (Math.round(this.t * 2) !== this.lastSnap) { this.lastSnap = Math.round(this.t * 2); this.snaps.push({ t: +this.t.toFixed(2), sc: K.map((_, k) => this.score(k)), tr: K.map((_, k) => Math.round(this.troops(k))), streams: this.streams.length, flying: this.streams.reduce((n, s) => n + s.packets.length, 0) }); }
    if (!this.lastOrders && this.t >= FIGHT - 10) { this.lastOrders = true; this.note('lastOrders', {}); }
    if (live.length <= 1) return this.finish('conquest');
    if (this.t >= FIGHT) return this.finish('bell');
  }
  finish(how) {
    if (this.done) return;
    this.done = true; this.endT = this.t; this.how = how;
    const live = this.K.map((_, k) => k).filter(k => this.out[k] == null);
    const rank = live.slice().sort((a, b) => this.score(b) - this.score(a) || this.troops(b) - this.troops(a));
    this.winner = rank[0]; this.rank = rank.concat(this.K.map((_, k) => k).filter(k => this.out[k] != null).sort((a, b) => this.out[b] - this.out[a]));
    this.margin = rank.length > 1 ? this.score(rank[0]) - this.score(rank[1]) : 99;
    if (D.MODES[this.mode].underdog) this.underdogSurvived = this.out[0] == null;
    this.note('end', { k: this.winner, how, margin: this.margin });
  }
  runTo(t) { while (!this.done && this.t < t) this.tick(); return this; }
  run() { while (!this.done) this.tick(); return this; }
  // ----- how dramatic this battle is (for picking between candidates: a late, close finish with swings) -----
  drama() {
    const s = this.stat, L = this.log;
    let d = 0;
    if (this.how === 'conquest') d += 40 - Math.abs(57 - this.endT) * 3;
    else d += this.margin === 0 ? 36 : 42 - (this.margin - 1) * 9;   // (a dead heat on land is settled by troops: close, but harder to read than a one-territory win)
    d += Math.min(30, s.leadChanges * 6);
    d += Math.min(15, s.capitals * 5);
    d += Math.min(10, s.bigClash * 2);
    const outs = this.out.filter(x => x != null);
    for (const t of outs) d += t < 18 ? -12 : t > 30 ? 6 : 2;
    const w = this.winner, seen = this.snaps.filter(p => p.t > 12);
    if (seen.length && seen.some(p => p.sc[w] === Math.min(...p.sc.filter((_, k) => this.out[k] == null || this.out[k] > p.t)))) d += 16;   // the winner was last at some point: a comeback
    if (!L.some(e => e.t > this.endT - 10 && ['capture', 'capital', 'lead', 'clash', 'out', 'betrayal'].includes(e.kind))) d -= 12;
    if (L.some(e => e.kind === 'betrayal')) d += 8;
    if (this.mode === 'ember' && this.stat.minCells[0] <= 1 && this.underdogSurvived) d += 10;
    return d;
  }
}

module.exports = { TCSim, makeMap, BOARD, FIGHT, DT, rng };
