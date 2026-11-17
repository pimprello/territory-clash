// Territory Clash: drawing. The island, the holds, the orders (drag strokes with troops marching along them), the scoreboard,
// the crown-split face-off, and the thumbnail. Looks only: it reads the battle, never changes it, and uses hashes, not dice.
// Uses the shared engine (engine.js, Army Clash's plus the api._ export line, as in Tower Clash) for the cast's portraits,
// the tribe emblems, the palettes and the fonts, so the three channels look like one family.
'use strict';
const path = require('path');
const D = require('./tc-data.js');
const { BOARD, FIGHT } = require('./tc-sim.js');

const ENGINE = process.env.ENGINE || path.join(__dirname, 'engine.js');
let RVB, E, createCanvas;
function init() {
  if (RVB) return;
  const cv = require(process.env.CANVAS || 'canvas');
  createCanvas = cv.createCanvas;
  cv.registerFont(path.join(__dirname, 'fonts/BarlowCondensed-ExtraBoldItalic.ttf'), { family: 'Barlow Condensed', weight: '800', style: 'italic' });
  cv.registerFont(path.join(__dirname, 'fonts/BarlowCondensed-Bold.ttf'), { family: 'Barlow Condensed', weight: '700', style: 'normal' });
  RVB = require(ENGINE); RVB.makeCanvas = (w, h) => createCanvas(w, h); E = RVB._;
}
const W = 1080, H = 1920, TAU = Math.PI * 2;
const FONT = '"Barlow Condensed", "DejaVu Sans", sans-serif';
const font = (size, weight = 800, italic = true) => `${italic ? 'italic ' : ''}${weight} ${size}px ${FONT}`;
const INK = '#04060B', WHITE = '#F4F6FB', GOLD = '#FFD23F';
const h01 = (a, b = 0) => { let x = (a * 374761393 + b * 668265263) | 0; x = Math.imul(x ^ (x >>> 13), 1274126177); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgba = (h, a) => { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; };
const mix = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const pal = key => E.PALETTES[D.KINGDOMS[key].colour];
const NEUTRAL = { c: '#9AA3B2', d: '#5A6276', l: '#D5DAE3' };

function text(g, s, x, y, fill, stroke = INK, lw = 8, maxW) {
  g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = stroke;
  if (maxW) { g.strokeText(s, x, y, maxW); g.fillStyle = fill; g.fillText(s, x, y, maxW); } else { g.strokeText(s, x, y); g.fillStyle = fill; g.fillText(s, x, y); }
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function fit(g, s, size, maxW, min = 22) { g.font = font(size); while (size > min && g.measureText(s).width > maxW) { size -= 2; g.font = font(size); } return size; }

// ----- the cast: one Army instance per palette, so the engine's portrait cache never mixes kingdoms' colours -----
const armies = {};
function portrait(g, type, key, r) {
  init();
  const col = D.KINGDOMS[key] ? D.KINGDOMS[key].colour : key;
  RVB.setTeams(col);
  const a = armies[col] || (armies[col] = new RVB.Army(1, { budgetMul: [0.0001, 0.0001], doctrines: ['KNIGHTS', 'KNIGHTS'], humans: true, shine: { on: true, gloss: 1, rim: 1, damage: true, screen: 1, density: 1.6 }, ui: 2, art: 2, anim: true }));
  const U = E.UNIT[type] || E.UNIT.soldier, hum = E.HUMAN && E.HUMAN[type], sc = (r * (hum ? 0.8 : 0.72)) / U.r;
  g.save(); if (hum) g.translate(0, r * 0.12); g.scale(sc, sc); if (!hum) g.rotate(-Math.PI / 2);
  try { a.drawPortrait(g, type, 0); } catch (e) { g.beginPath(); g.arc(0, 0, U.r, 0, TAU); g.fillStyle = E.TEAMS[0].c; g.fill(); }
  g.restore();
}
// marching troops are drawn hundreds of times a frame, so each kingdom's troop is drawn once into a small picture and reused
let SCALE = 1; const sprites = new Map();
function setScale(rs) { if (rs !== SCALE) { SCALE = rs; sprites.clear(); } }
function troop(g, type, key, x, y) {
  const id = type + '|' + key;
  let sp = sprites.get(id);
  if (!sp) { init(); sp = createCanvas(Math.ceil(52 * SCALE), Math.ceil(52 * SCALE)); const c = sp.getContext('2d'); c.scale(SCALE, SCALE); c.translate(26, 27); portrait(c, type, key, 13); sprites.set(id, sp); }
  g.drawImage(sp, x - 26, y - 27, 52, 52);
}
// a kingdom's crest: a heater shield in its colour with its emblem
function crest(g, key, x, y, s) {
  init();
  const P = pal(key);
  g.save(); g.translate(x, y); g.scale(s / 60, s / 60);
  g.beginPath(); g.moveTo(-30, -34); g.lineTo(30, -34); g.lineTo(30, 2); g.quadraticCurveTo(30, 26, 0, 40); g.quadraticCurveTo(-30, 26, -30, 2); g.closePath();
  const lg = g.createLinearGradient(-30, -34, 30, 40); lg.addColorStop(0, P.l); lg.addColorStop(0.35, P.c); lg.addColorStop(1, P.d);
  g.fillStyle = lg; g.fill(); g.lineWidth = 6; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke();
  g.beginPath(); g.moveTo(-22, -27); g.lineTo(-4, -27); g.lineTo(-22, -5); g.closePath(); g.fillStyle = 'rgba(255,255,255,0.28)'; g.fill();
  const light = ['WHITE', 'LIME', 'AMBER', 'YELLOW', 'GOLD', 'SAND'].includes(D.KINGDOMS[key].colour);
  E.drawEmblem(g, D.KINGDOMS[key].emblem, 0, 1, 28, light ? '#1A2233' : '#F4F1E6');
  g.restore();
}

// ----- holds -----
function holdIcon(g, c, P, t) {
  const x = c.x, y = c.y + 6, roof = P ? P.c : '#8A6A49', roofD = P ? P.d : '#5B4430', stone = '#B9C1CF', stoneD = '#7A8396';
  g.save(); g.translate(x, y); g.lineJoin = 'round'; g.lineWidth = 4; g.strokeStyle = INK;
  g.beginPath(); g.ellipse(0, 4, 34, 8, 0, 0, TAU); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fill();
  const box = (x0, y0, w, h, f) => { g.beginPath(); g.rect(x0, y0, w, h); g.fillStyle = f; g.fill(); g.stroke(); };
  const tri = (x0, y0, w, h, f) => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + w / 2, y0 - h); g.lineTo(x0 + w, y0); g.closePath(); g.fillStyle = f; g.fill(); g.stroke(); };
  const flag = (fx, fy, f) => { g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx, fy - 22); g.stroke(); const w = Math.sin(t * 6 + c.id) * 2; g.beginPath(); g.moveTo(fx, fy - 22); g.quadraticCurveTo(fx + 9, fy - 24 + w, fx + 18, fy - 19); g.lineTo(fx, fy - 13); g.closePath(); g.fillStyle = f; g.fill(); g.lineWidth = 3; g.stroke(); g.lineWidth = 4; };
  switch (c.type) {
    case 'capital':
      box(-30, -30, 14, 30, stone); box(16, -30, 14, 30, stone); box(-16, -22, 32, 22, stone);
      for (const bx of [-30, -23, 16, 23]) box(bx, -36, 7, 6, stone);
      box(-11, -44, 22, 22, stone); tri(-15, -44, 30, 20, roof);
      g.beginPath(); g.moveTo(-6, 0); g.lineTo(-6, -10); g.arc(0, -10, 6, Math.PI, 0); g.lineTo(6, 0); g.closePath(); g.fillStyle = '#2A1A12'; g.fill(); g.stroke();
      flag(0, -64, roof);
      break;
    case 'fort':
      box(-13, -40, 26, 40, stone);
      for (const bx of [-15, -5, 5]) box(bx, -47, 9, 8, stone);
      g.beginPath(); g.rect(-3, -30, 6, 12); g.fillStyle = '#20141A'; g.fill(); flag(0, -47, roof);
      break;
    case 'farm':
      for (let i = 0; i < 3; i++) { g.beginPath(); g.rect(4 + i * 9, -14, 7, 14); g.fillStyle = i % 2 ? '#E0C062' : '#9CC05A'; g.fill(); g.lineWidth = 2.5; g.stroke(); g.lineWidth = 4; }
      box(-24, -16, 22, 16, '#E8DCC4'); tri(-27, -16, 28, 14, roof);
      break;
    case 'mine':
      g.beginPath(); g.moveTo(-24, 0); g.quadraticCurveTo(-22, -34, 0, -36); g.quadraticCurveTo(22, -34, 24, 0); g.closePath(); g.fillStyle = stoneD; g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-11, 0); g.lineTo(-11, -14); g.arc(0, -14, 11, Math.PI, 0); g.lineTo(11, 0); g.closePath(); g.fillStyle = '#16100C'; g.fill(); g.stroke();
      for (const [gx, gy] of [[-5, -4], [3, -7], [7, -2]]) { g.beginPath(); g.arc(gx, gy, 3.2, 0, TAU); g.fillStyle = GOLD; g.fill(); g.lineWidth = 2; g.stroke(); g.lineWidth = 4; }
      break;
    case 'crown': {
      box(-26, -12, 52, 12, stone);
      const gl = g.createRadialGradient(0, -34, 4, 0, -34, 46); gl.addColorStop(0, 'rgba(255,230,120,0.75)'); gl.addColorStop(1, 'rgba(255,210,63,0)'); g.fillStyle = gl; g.beginPath(); g.arc(0, -34, 46, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(-22, -14); g.lineTo(-24, -44); g.lineTo(-11, -30); g.lineTo(0, -50); g.lineTo(11, -30); g.lineTo(24, -44); g.lineTo(22, -14); g.closePath(); g.fillStyle = GOLD; g.fill(); g.stroke();
      for (const [jx, jy] of [[-24, -44], [0, -50], [24, -44]]) { g.beginPath(); g.arc(jx, jy, 4, 0, TAU); g.fillStyle = '#E0263C'; g.fill(); g.lineWidth = 2.5; g.stroke(); g.lineWidth = 4; }
      break; }
    default:
      box(-22, -14, 18, 14, '#E8DCC4'); tri(-25, -14, 24, 13, roof);
      box(2, -18, 20, 18, '#E8DCC4'); tri(-1, -18, 26, 15, roofD);
  }
  g.restore();
}

// ----- the island, its territories and everything on it -----
function drawWorld(g, s, theme, t, o = {}) {
  init();
  const C = s.cells, TH = D.THEMES[theme] || D.THEMES.thornvale;
  // the sea
  const sg = g.createLinearGradient(0, 0, 0, H); sg.addColorStop(0, TH.sea[0]); sg.addColorStop(1, TH.sea[1]);
  g.fillStyle = sg; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 3;
  for (let i = 0; i < 46; i++) { const x = h01(i, 1) * W, y = 380 + h01(i, 2) * 1180, w = 26 + h01(i, 3) * 40, ph = Math.sin(t * 1.3 + i) * 4; g.beginPath(); g.moveTo(x - w, y + ph); g.quadraticCurveTo(x - w / 2, y - 8 + ph, x, y + ph); g.quadraticCurveTo(x + w / 2, y + 8 + ph, x + w, y + ph); g.stroke(); }
  const island = () => { g.beginPath(); s.outline.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); };
  // shadow and surf
  g.save(); g.translate(0, 14); island(); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fill(); g.restore();
  island(); g.lineWidth = 26; g.strokeStyle = 'rgba(220,240,255,0.16)'; g.lineJoin = 'round'; g.stroke();
  island(); g.lineWidth = 12; g.strokeStyle = 'rgba(220,240,255,0.22)'; g.stroke();
  // territories
  g.save(); island(); g.clip();
  const owner = c => (o.owners ? o.owners[c.id] : c.owner);
  for (const c of C) {
    const k = owner(c), P = k >= 0 ? pal(s.K[k].key) : null;
    g.beginPath(); c.poly.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath();
    if (P) { const lg = g.createLinearGradient(c.x - 120, c.y - 120, c.x + 120, c.y + 120); lg.addColorStop(0, mix(P.c, P.l, 0.28)); lg.addColorStop(1, mix(P.c, P.d, 0.22)); g.fillStyle = lg; }
    else g.fillStyle = TH.ground[c.id % 2];
    g.fill();
    // bevel: a darker band inside every territory, lighter on the top-left edge
    g.save(); g.clip(); g.lineWidth = 16; g.strokeStyle = P ? rgba(P.d, 0.55) : 'rgba(0,0,0,0.12)'; g.stroke();
    g.translate(-3, -3); g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,0.16)'; g.stroke(); g.restore();
    // neutral land keeps its scenery (looks only, placed by hash)
    if (!P) for (let q = 0; q < 7; q++) {
      const px = c.x + (h01(c.id, q) - 0.5) * 150, py = c.y + (h01(c.id, q + 20) - 0.5) * 150;
      if (Math.hypot(px - c.x, py - c.y) < 52 || !s.inside(px, py)) continue;
      g.beginPath(); g.ellipse(px, py + 6, 9, 3, 0, 0, TAU); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fill();
      g.beginPath(); g.arc(px, py - 4, 8, 0, TAU); g.fillStyle = mix(TH.ground[0], '#2E4A22', 0.55); g.fill(); g.lineWidth = 2.5; g.strokeStyle = 'rgba(4,6,11,0.55)'; g.stroke();
    }
    // a just-captured territory flashes and its colour washes in from the hold
    const age = t - (c.flipT ?? -9);
    if (age >= 0 && age < 0.7) { g.fillStyle = `rgba(255,255,255,${0.55 * (1 - age / 0.7)})`; g.fill(); }
  }
  // borders: thin between all territories, thick between different owners
  for (const c of C) for (let i = 0; i < c.poly.length; i++) {
    const A = c.poly[i], B = c.poly[(i + 1) % c.poly.length], j = A.e;
    if (j < 0 || j < c.id) continue;
    const diff = owner(c) !== owner(C[j]);
    g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(B.x, B.y);
    if (diff) { g.lineWidth = 7; g.strokeStyle = INK; g.stroke(); g.lineWidth = 2.5; g.strokeStyle = 'rgba(255,255,255,0.35)'; g.stroke(); }
    else { g.lineWidth = 2; g.strokeStyle = 'rgba(4,6,11,0.32)'; g.stroke(); }
  }
  g.restore();
  island(); g.lineWidth = 7; g.strokeStyle = INK; g.stroke();
  // (rules.picks) plague clouds, healing rain and smoke lie on the land, under the roads and the troops
  if (s.pkS && !o.noStreams) drawPicksGround(g, s, t);
  // roads
  g.save(); g.setLineDash([6, 10]); g.lineWidth = 3; g.strokeStyle = 'rgba(255,248,230,0.22)';
  for (const c of C) for (const j of c.nb) if (j > c.id) { g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(C[j].x, C[j].y); g.stroke(); }
  g.restore();
  // orders: the drag stroke, then the troops on it
  if (!o.noStreams) for (const st of s.streams) drawStream(g, s, st, t);
  // holds and their troop counts
  for (const c of C) {
    const k = owner(c), P = k >= 0 ? pal(s.K[k].key) : null;
    if (c.mimic > 0 && k < 0 && !o.counts) chestIcon(g, c, t); else holdIcon(g, c, P, t);
    const n = Math.max(0, Math.floor(o.counts ? o.counts[c.id] : c.n)), str = String(n);
    g.font = font(c.type === 'capital' ? 34 : 29); const w = Math.max(48, g.measureText(str).width + 26), hh = c.type === 'capital' ? 40 : 34, y0 = c.y + 14;
    rr(g, c.x - w / 2, y0, w, hh, hh / 2); g.fillStyle = 'rgba(4,6,11,0.88)'; g.fill(); g.lineWidth = 4; g.strokeStyle = P ? P.l : '#C9CED8'; g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = WHITE; g.fillText(str, c.x, y0 + hh / 2 + 1);
    if (c.type === 'capital' && k >= 0) crest(g, s.K[k].key, c.x + 40, c.y - 46, 34);
  }
  if (s.pkS && !o.noStreams) drawPicksTop(g, s, t);
  g.textBaseline = 'alphabetic';
}

function streamPos(s, st, d) {
  const C = s.cells, a = C[st.from], b = C[st.to], f = Math.max(0, Math.min(1, d / st.len));
  if (!st.sea) return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  // a sea lane bows out over the water, away from the island's middle
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = mx - BOARD.cx, dy = my - BOARD.cy, L = Math.hypot(dx, dy) || 1, qx = mx + (dx / L) * 110, qy = my + (dy / L) * 110, u = 1 - f;
  return { x: u * u * a.x + 2 * u * f * qx + f * f * b.x, y: u * u * a.y + 2 * u * f * qy + f * f * b.y };
}
function drawStream(g, s, st, t) {
  const K = s.K[st.k], P = pal(K.key), C = s.cells, a = C[st.from], b = C[st.to];
  // the drag stroke draws itself out from the hold in 0.3 s, a bright dot riding its tip like a finger on glass
  const grow = Math.min(1, (s.t - st.t0) / 0.3), pts = [];
  for (let i = 0; i <= 20; i++) pts.push(streamPos(s, st, (st.len * grow * i) / 20));
  const line = () => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); };
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  if (st.sea) g.setLineDash([16, 12]);
  line(); g.lineWidth = 20; g.strokeStyle = rgba(INK, 0.55); g.stroke();
  line(); g.lineWidth = 13; g.strokeStyle = rgba(P.c, 0.85); g.stroke();
  line(); g.lineWidth = 4; g.strokeStyle = rgba(P.l, 0.9); g.stroke();
  g.setLineDash([]);
  const tip = pts[pts.length - 1], pre = pts[pts.length - 3] || pts[0], ang = Math.atan2(tip.y - pre.y, tip.x - pre.x);
  if (grow >= 1) {
    // arrowhead just short of the target hold
    const ex = b.x - Math.cos(ang) * 44, ey = b.y - Math.sin(ang) * 44;
    g.save(); g.translate(ex, ey); g.rotate(ang); g.beginPath(); g.moveTo(16, 0); g.lineTo(-12, -15); g.lineTo(-5, 0); g.lineTo(-12, 15); g.closePath(); g.fillStyle = P.c; g.fill(); g.lineWidth = 5; g.strokeStyle = INK; g.stroke(); g.restore();
  } else {
    const gl = g.createRadialGradient(tip.x, tip.y, 2, tip.x, tip.y, 30); gl.addColorStop(0, 'rgba(255,255,255,0.95)'); gl.addColorStop(0.4, rgba(P.l, 0.7)); gl.addColorStop(1, rgba(P.c, 0)); g.fillStyle = gl; g.beginPath(); g.arc(tip.x, tip.y, 30, 0, TAU); g.fill();
  }
  g.restore();
  // the troops (upright, in the kingdom's colour), or boats on a sea lane
  const ps = st.packets.slice(0, 80);
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = streamPos(s, st, ps[i]), side = ((h01(st.id, i) - 0.5) * 16), nx = -Math.sin(ang), ny = Math.cos(ang);
    const x = p.x + nx * side, y = p.y + ny * side + Math.abs(Math.sin(t * 9 + i)) * -3;
    if (st.sea) {
      g.save(); g.translate(x, y); g.beginPath(); g.moveTo(-14, 0); g.lineTo(14, 0); g.lineTo(9, 8); g.lineTo(-9, 8); g.closePath(); g.fillStyle = '#8A6A49'; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -20); g.lineTo(12, -4); g.closePath(); g.fillStyle = P.l; g.fill(); g.stroke(); g.restore();
    } else {
      // (rules.picks) the hero at the front of an order (a golem's halves, a pack of rats: every troop), a ghost walking through
      const hero = st.hero && (st.allHero || i === 0) ? st.hero : null, ghost = st.phaseT > s.t;
      if (ghost) g.globalAlpha = 0.55;
      troop(g, hero || K.line, K.key, x, y);
      if (st.frozeT > s.t) { g.beginPath(); g.arc(x, y - 4, 15, 0, TAU); g.fillStyle = 'rgba(190,235,255,0.5)'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#DCEFFF'; g.stroke(); }
      if (ghost) g.globalAlpha = 1;
    }
  }
  // the bard's war song: notes drifting up off the order while it sings
  if (s.pkS && s.pkS.songT[st.k] > s.t && ps.length) for (let q = 0; q < 3; q++) {
    const p = streamPos(s, st, ps[Math.min(ps.length - 1, q * 4)]), ph = (t * 0.9 + q * 0.33 + h01(st.id, q)) % 1;
    g.save(); g.globalAlpha = Math.sin(ph * Math.PI) * 0.9; g.font = font(26, 700, false); g.textAlign = 'center'; text(g, q % 2 ? '♪' : '♫', p.x + 14, p.y - 26 - ph * 34, '#BBF7D0', INK, 4); g.restore();
  }
}
// a treasure chest (the mimic: rules.picks), its lid snapping when it bites
function chestIcon(g, c, t) {
  const bite = c.biteT != null ? Math.max(0, 1 - (t - c.biteT) / 0.35) : 0;
  g.save(); g.translate(c.x, c.y + 4); g.lineJoin = 'round'; g.lineWidth = 4; g.strokeStyle = INK;
  g.beginPath(); g.ellipse(0, 4, 30, 7, 0, 0, TAU); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fill();
  g.beginPath(); g.rect(-24, -22, 48, 22); g.fillStyle = '#9A6534'; g.fill(); g.stroke();
  g.save(); g.translate(-24, -22); g.rotate(-0.6 * bite); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -8); g.quadraticCurveTo(24, -22, 48, -8); g.lineTo(48, 0); g.closePath(); g.fillStyle = '#B57A40'; g.fill(); g.stroke();
  if (bite > 0) { g.fillStyle = '#FFFFFF'; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(6 + i * 9, 0); g.lineTo(10 + i * 9, 7); g.lineTo(14 + i * 9, 0); g.fill(); } }
  g.restore();
  g.fillStyle = GOLD; g.fillRect(-4, -18, 8, 9); g.strokeRect(-4, -18, 8, 9);
  g.restore();
}
// (rules.picks) on the land, under the troops: plague clouds, healing rain, smoke; walls round walled holds
function drawPicksGround(g, s, t) {
  const S = s.pkS, C = s.cells, T = s.t;
  const fade = (o, len) => Math.min(1, (T - o.t0) / 0.4, Math.max(0, (o.end - T) / 0.6));
  for (const c of S.clouds) { const a = fade(c); if (a <= 0) continue; for (let q = 0; q < 6; q++) { const ang = q / 6 * TAU + t * 0.3, rr0 = 44 + 10 * Math.sin(t * 1.3 + q); g.beginPath(); g.arc(c.x + Math.cos(ang) * 30, c.y + Math.sin(ang) * 22, rr0, 0, TAU); g.fillStyle = `rgba(132,204,22,${0.16 * a})`; g.fill(); } }
  for (const r of S.rains) { const a = fade(r); if (a <= 0) continue; g.beginPath(); g.arc(r.x, r.y, r.r, 0, TAU); g.fillStyle = `rgba(134,239,172,${0.1 * a})`; g.fill(); g.lineWidth = 3; g.setLineDash([10, 10]); g.strokeStyle = `rgba(134,239,172,${0.5 * a})`; g.stroke(); g.setLineDash([]); }
  for (const r of S.smokes) { const a = fade(r); if (a <= 0) continue; for (let q = 0; q < 9; q++) { const ang = q / 9 * TAU + t * 0.15, d = r.r * (0.35 + 0.4 * h01(q, 5)); g.beginPath(); g.arc(r.x + Math.cos(ang) * d, r.y + Math.sin(ang) * d, r.r * 0.45, 0, TAU); g.fillStyle = `rgba(203,213,225,${0.12 * a})`; g.fill(); } }
  for (const c of C) {
    const wf = c.wallFellT != null ? Math.max(0, 1 - (T - c.wallFellT) / 0.8) : 0;
    if (!c.walls && wf <= 0) continue;
    const a = c.walls ? 1 : wf;
    g.save(); g.globalAlpha = a; g.beginPath(); g.arc(c.x, c.y - 6, 58, 0, TAU); g.lineWidth = 12; g.strokeStyle = '#4B5563'; g.stroke(); g.lineWidth = 8; g.setLineDash([14, 6]); g.strokeStyle = '#B9C1CF'; g.stroke(); g.setLineDash([]); g.restore();
  }
}
// (rules.picks) over the holds: shields, the hill and its score, last stands, lightning and frost
function drawPicksTop(g, s, t) {
  const S = s.pkS, C = s.cells, T = s.t;
  for (const sh of S.shields) { const a = Math.min(1, (T - sh.t0) / 0.3, Math.max(0, (sh.end - T) / 0.5)); if (a <= 0) continue; const hit = sh.hitT != null ? Math.max(0, 1 - (T - sh.hitT) / 0.25) : 0; g.beginPath(); g.arc(sh.x, sh.y - 8, 66 + hit * 6, 0, TAU); g.fillStyle = `rgba(147,197,253,${(0.14 + 0.2 * hit) * a})`; g.fill(); g.lineWidth = 5; g.strokeStyle = `rgba(191,219,254,${0.85 * a})`; g.stroke(); }
  for (const c of C) if (c.lastStand && c.owner >= 0) { const P = pal(s.K[c.owner].key), p = 0.5 + 0.5 * Math.sin(t * 6); g.beginPath(); g.arc(c.x, c.y - 6, 62 + p * 6, 0, TAU); g.lineWidth = 6; g.strokeStyle = rgba('#FF3149', 0.5 + 0.4 * p); g.stroke(); g.lineWidth = 2; g.strokeStyle = rgba(P.l, 0.8); g.stroke(); }
  if (S.hill) {
    const c = C[S.hill.id], o = c.owner, P = o >= 0 ? pal(s.K[o].key) : NEUTRAL;
    g.save(); g.lineWidth = 4; g.strokeStyle = INK; g.beginPath(); g.moveTo(c.x - 34, c.y - 58); g.lineTo(c.x - 34, c.y - 98); g.stroke();
    g.beginPath(); g.moveTo(c.x - 34, c.y - 98); g.quadraticCurveTo(c.x - 20, c.y - 100 + Math.sin(t * 6) * 3, c.x - 6, c.y - 92); g.lineTo(c.x - 34, c.y - 84); g.closePath(); g.fillStyle = P.c; g.fill(); g.stroke();
    // each kingdom's time on the hill, as a ring round the flag (the leader's)
    const best = S.hill.held.reduce((b, v, k) => (v > S.hill.held[b] ? k : b), 0), v = S.hill.held[best], k = Math.min(1, v / S.hill.goal);
    if (v > 0) { const BP = pal(s.K[best].key); g.beginPath(); g.arc(c.x, c.y - 6, 70, -Math.PI / 2, -Math.PI / 2 + TAU * k); g.lineWidth = 8; g.lineCap = 'round'; g.strokeStyle = BP.c; g.stroke(); g.lineCap = 'butt';
      g.font = font(26); g.textAlign = 'center'; text(g, `${Math.min(S.hill.goal, Math.floor(v))}/${S.hill.goal}s`, c.x, c.y - 112, BP.l, INK, 5); }
    g.restore();
  }
  for (const f of S.fx) {
    const age = T - f.t0; if (age < 0 || age > 0.9) continue;
    const a = 1 - age / 0.9;
    if (f.kind === 'chain') {
      g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
      for (const p of f.pts) { const st = s.streams.find(x => x.id === p.s); const q = st ? streamPos(s, st, Math.max(0, st.packets[0] || p.d)) : null; if (!q) continue;
        g.beginPath(); let x = q.x, y = q.y - 260; g.moveTo(x, y); for (let j = 1; j <= 6; j++) { const yy = y + (260 / 6) * j, xx = q.x + (j < 6 ? (h01(p.s, j + Math.floor(age * 20)) - 0.5) * 40 : 0); g.lineTo(xx, yy); }
        g.lineWidth = 9; g.strokeStyle = `rgba(196,181,253,${0.4 * a})`; g.stroke(); g.lineWidth = 3; g.strokeStyle = `rgba(255,255,255,${a})`; g.stroke(); }
      g.restore();
    }
    if (f.kind === 'nova') { g.beginPath(); g.arc(f.x, f.y, 40 + age * 380, 0, TAU); g.lineWidth = 10 * a; g.strokeStyle = `rgba(155,231,255,${a})`; g.stroke(); }
    if (f.kind === 'vamp') for (const c of C) if (c.owner === f.k) { g.beginPath(); g.arc(c.x, c.y - 6, 30 + age * 40, 0, TAU); g.lineWidth = 4 * a; g.strokeStyle = `rgba(248,113,113,${a})`; g.stroke(); }
  }
}
// (rules.picks, looks only) the weather and dusk over the island: rain, fog or snow by the battle's own looks hash, snow on the
// Frostwild and at Christmas; dusk falls over the second half of some battles
function skyOf(s, theme, holiday) {
  if (s._sky && s._sky.theme === theme) return s._sky;
  const P = s.pk || {}, a = h01(s.seed % 1000003, 91), b = h01(s.seed % 1000003, 92), c = h01(s.seed % 1000003, 93);
  let wx = null;
  if (P.weather !== false) { if (theme === 'frostwild' || holiday === 'christmas') wx = 'snow'; else if (a < (P.weatherChance ?? 0.4)) wx = b < 0.45 ? 'rain' : b < 0.8 ? 'fog' : 'snow'; }
  return (s._sky = { theme, wx, dusk: P.dusk !== false && c < (P.duskChance ?? 0.3) });
}
function drawSky(g, s, theme, t, holiday) {
  if (!s.pk) return;
  const sky = skyOf(s, theme, holiday), T = s.t;
  if (sky.dusk) {
    const nk = Math.max(0, Math.min(1, (T - FIGHT * 0.35) / (FIGHT * 0.6))), k1 = Math.min(1, nk * 2), k2 = Math.max(0, Math.min(1, nk * 1.6 - 0.4));
    const lg = g.createLinearGradient(0, 380, 0, 1520); lg.addColorStop(0, `rgba(255,120,60,${0.14 * k1 * (1 - k2 * 0.7)})`); lg.addColorStop(1, `rgba(120,40,90,${0.1 * k1 * (1 - k2 * 0.7)})`);
    g.fillStyle = lg; g.fillRect(0, 330, W, 1210); g.fillStyle = `rgba(8,14,44,${0.32 * k2})`; g.fillRect(0, 330, W, 1210);
    // the holds light their lamps as night comes
    if (k2 > 0) for (const c of s.cells) if (c.owner >= 0) { const gl = g.createRadialGradient(c.x, c.y - 10, 4, c.x, c.y - 10, 60); gl.addColorStop(0, `rgba(255,200,110,${0.35 * k2})`); gl.addColorStop(1, 'rgba(255,200,110,0)'); g.fillStyle = gl; g.beginPath(); g.arc(c.x, c.y - 10, 60, 0, TAU); g.fill(); }
  }
  const W0 = sky.wx; if (!W0) return;
  g.save(); g.beginPath(); g.rect(0, 330, W, 1210); g.clip();
  if (W0 === 'rain') { g.fillStyle = 'rgba(30,45,80,0.08)'; g.fillRect(0, 330, W, 1210); g.beginPath(); for (let i = 0; i < 90; i++) { const sp = 0.6 + h01(i, 3) * 0.8, x = (h01(i, 1) * W + t * 120 * sp) % W, y = 330 + (h01(i, 2) * 1210 + t * 1100 * sp) % 1210; g.moveTo(x, y); g.lineTo(x - 5 * sp, y - 26 * sp); } g.lineWidth = 1.8; g.strokeStyle = 'rgba(200,220,255,0.42)'; g.stroke(); }
  else if (W0 === 'fog') { g.fillStyle = 'rgba(214,222,232,0.08)'; g.fillRect(0, 330, W, 1210); for (let i = 0; i < 7; i++) { const x = ((h01(i, 4) * (W + 500) + t * 16 * (0.6 + h01(i, 5))) % (W + 500)) - 250, y = 400 + h01(i, 6) * 1080; g.beginPath(); g.ellipse(x, y, 260, 100, 0, 0, TAU); g.fillStyle = 'rgba(230,236,244,0.1)'; g.fill(); } }
  else { for (let i = 0; i < 90; i++) { const sp = 0.6 + h01(i, 3) * 0.8, x = ((h01(i, 1) * W + Math.sin(t * 0.9 + i) * 24 + t * 18) % W + W) % W, y = 330 + (h01(i, 2) * 1210 + t * 70 * sp) % 1210; g.beginPath(); g.arc(x, y, 1.6 + 1.8 * sp, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fill(); } }
  g.restore();
}

// ----- the scoreboard: clock, crests with counts, the land bar, and the one notice on screen -----
function drawHUD(g, s, t, notice, smooth) {
  const K = s.K, n = K.length, total = s.cells.length;
  // clock
  const left = Math.max(0, FIGHT - s.t), clock = `0:${String(Math.ceil(left)).padStart(2, '0')}`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  // the last five seconds: the clock beats once a second (a smooth swell and settle, never a jump)
  const beat = left > 0 && left <= 5 ? Math.max(0, 1 - (Math.ceil(left) - left) / 0.35) : 0, cz = 1 + 0.16 * Math.sin(Math.PI * Math.min(1, (Math.ceil(left) - left) / 0.35)) * (left > 0 && left <= 5 ? 1 : 0);
  g.save(); g.translate(W / 2, 101); g.scale(cz, cz); g.translate(-W / 2, -101);
  rr(g, W / 2 - 82, 70, 164, 62, 31); g.fillStyle = 'rgba(4,6,11,0.85)'; g.fill(); g.lineWidth = 5; g.strokeStyle = left <= 10 ? '#FF3149' : '#2A3552'; g.stroke();
  if (beat > 0) { g.save(); g.globalAlpha = 0.35 * beat; g.shadowColor = '#FF3149'; g.shadowBlur = 30; g.stroke(); g.restore(); }
  g.font = font(48); text(g, clock, W / 2, 103, left <= 10 ? '#FFB0BA' : WHITE, INK, 6);
  g.restore();
  // crests and counts
  const colW = 940 / n;
  K.forEach((k, i) => {
    const cx = 70 + colW * (i + 0.5), cnt = s.score(i), out = cnt === 0 && s.t > 3, big = n <= 2;
    g.globalAlpha = out ? 0.45 : 1;
    const cw = big ? 76 : 62, tx = cx - colW / 2 + cw + 16;
    crest(g, k.key, cx - colW / 2 + cw / 2 + 6, 206, cw);
    g.textAlign = 'left'; const nm = k.short || k.name; fit(g, nm, big ? 42 : 34, colW - cw - 26, 20);
    text(g, nm, tx, 184, pal(k.key).l, INK, 7);
    g.font = font(big ? 58 : 50); text(g, String(cnt), tx, 230, WHITE, INK, 8);
    g.globalAlpha = 1;
  });
  // the land bar: every kingdom's share of the island, unclaimed land in grey in the middle
  const bx = 70, by = 262, bw = 940, bh = 40;
  rr(g, bx - 4, by - 4, bw + 8, bh + 8, 24); g.fillStyle = INK; g.fill();
  g.save(); rr(g, bx, by, bw, bh, 20); g.clip();
  let x = bx; const shares = smooth || K.map((_, i) => s.cellsOf(i).length), neutral = Math.max(0, total - shares.reduce((a, b) => a + b, 0));
  const order = K.map((_, i) => i); const half = Math.ceil(n / 2);
  const seg = (w, P) => { const lg = g.createLinearGradient(0, by, 0, by + bh); lg.addColorStop(0, P.l); lg.addColorStop(0.45, P.c); lg.addColorStop(1, P.d); g.fillStyle = lg; g.fillRect(x, by, w + 1, bh); g.fillStyle = INK; g.fillRect(x + w - 1.5, by, 3, bh); x += w; };
  order.slice(0, half).forEach(i => seg((shares[i] / total) * bw, pal(K[i].key)));
  seg((neutral / total) * bw, NEUTRAL);
  order.slice(half).forEach(i => seg((shares[i] / total) * bw, pal(K[i].key)));
  g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(bx, by + 3, bw, 9);
  g.restore();
  // (rules.picks, Tug of War) the land bar is the rope: a knot rides where the two kingdoms' land meets
  if (s.pkS && s.pkS.tug && n === 2) {
    const kx = bx + (shares[0] / total) * bw, ky = by + bh / 2;
    g.save(); g.beginPath(); g.moveTo(bx - 24, ky); g.lineTo(bx + bw + 24, ky); g.lineWidth = 6; g.setLineDash([8, 6]); g.strokeStyle = 'rgba(214,180,130,0.9)'; g.stroke(); g.setLineDash([]);
    g.beginPath(); g.arc(kx, ky, 15, 0, TAU); g.fillStyle = '#7C2D12'; g.fill(); g.lineWidth = 4; g.strokeStyle = GOLD; g.stroke(); g.restore();
  }
  // the notice (one at a time: rules.ui.noStack)
  if (notice) {
    const a = Math.min(1, (t - notice.at) / 0.18, (notice.at + 2.2 - t) / 0.3);
    if (a > 0) {
      g.globalAlpha = a; g.font = font(44); const w = Math.min(980, g.measureText(notice.text).width + 70), y = 350;
      const hot = ['capital', 'betrayal', 'out', 'last'].includes(notice.kind);
      rr(g, W / 2 - w / 2, y - 32, w, 64, 32); g.fillStyle = hot ? '#E0263C' : 'rgba(4,6,11,0.88)'; g.fill(); g.lineWidth = 5; g.strokeStyle = hot ? '#FFB3BC' : GOLD; g.stroke();
      g.textAlign = 'center'; fit(g, notice.text, 44, 940); text(g, notice.text, W / 2, y + 2, WHITE, INK, 7);
      g.globalAlpha = 1;
    }
  }
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
}

// ----- the crown-split face-off (3 or 4 kingdoms; 2 use faceoff.js, the same as Army Clash and Tower Clash) -----
function drawCrownSplit(g, s, hook, k = 1) {
  const K = s.K, n = K.length, cx = W / 2, cy = 960;
  g.fillStyle = '#05070D'; g.fillRect(0, 0, W, H);
  const wedge = i => -Math.PI / 2 + (TAU / n) * i - Math.PI / n;
  // (two passes: every wedge's colour first, then the rings and words, so no wedge covers a neighbour's motto)
  K.forEach((kk, i) => {
    const P = pal(kk.key), a0 = wedge(i), a1 = a0 + TAU / n, slide = (1 - k) * 220, am = (a0 + a1) / 2;
    g.save(); g.translate(Math.cos(am) * slide, Math.sin(am) * slide);
    g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 2400, a0, a1); g.closePath();
    const rg = g.createRadialGradient(cx, cy, 80, cx, cy, 1200); rg.addColorStop(0, P.c); rg.addColorStop(0.6, P.d); rg.addColorStop(1, '#05070D'); g.fillStyle = rg; g.fill();
    g.save(); g.clip(); g.globalAlpha = 0.1; g.fillStyle = P.l; for (let r = 0; r < 10; r++) { const aa = a0 + ((a1 - a0) * (r + 0.5)) / 10; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(aa - 0.03) * 2000, cy + Math.sin(aa - 0.03) * 2000); g.lineTo(cx + Math.cos(aa + 0.03) * 2000, cy + Math.sin(aa + 0.03) * 2000); g.closePath(); g.fill(); } g.restore();
    g.restore();
  });
  // lightning down every seam (under the rings and words)
  g.save(); g.lineCap = 'round';
  K.forEach((_, i) => { const a = wedge(i); let x = cx, y = cy; g.beginPath(); g.moveTo(x, y); for (let q = 1; q <= 14; q++) { const r = q * 110; x = cx + Math.cos(a) * r + (h01(i, q) - 0.5) * 40; y = cy + Math.sin(a) * r + (h01(i, q + 9) - 0.5) * 40; g.lineTo(x, y); }
    g.lineWidth = 22; g.strokeStyle = 'rgba(140,200,255,0.25)'; g.stroke(); g.lineWidth = 9; g.strokeStyle = 'rgba(190,230,255,0.85)'; g.stroke(); g.lineWidth = 3; g.strokeStyle = '#FFFFFF'; g.stroke(); });
  g.restore();
  K.forEach((kk, i) => {
    const P = pal(kk.key), a0 = wedge(i), a1 = a0 + TAU / n, slide = (1 - k) * 220, am = (a0 + a1) / 2;
    g.save(); g.translate(Math.cos(am) * slide, Math.sin(am) * slide);
    // the champion in a big glossy ring, crest and motto beside it
    const R = n === 3 ? 400 : 430, px = cx + Math.cos(am) * R * (n === 4 ? 0.92 : 0.95), py = cy + Math.sin(am) * R * (n === 4 ? 1.12 : 1.05), rad = n === 4 ? 128 : 140;
    const gl = g.createRadialGradient(px, py, 10, px, py, rad * 1.5); gl.addColorStop(0, rgba(P.l, 0.75)); gl.addColorStop(1, rgba(P.c, 0)); g.fillStyle = gl; g.beginPath(); g.arc(px, py, rad * 1.5, 0, TAU); g.fill();
    g.beginPath(); g.arc(px, py, rad, 0, TAU); g.fillStyle = rgba(P.d, 0.85); g.fill(); g.lineWidth = 10; g.strokeStyle = INK; g.stroke(); g.lineWidth = 4; g.strokeStyle = P.l; g.stroke();
    g.save(); g.beginPath(); g.arc(px, py, rad - 6, 0, TAU); g.clip(); g.translate(px, py + rad * 0.08); portrait(g, kk.champion, kk.key, rad * 0.95); g.restore();
    crest(g, kk.key, px + rad * 0.78, py - rad * 0.72, 70);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    // (names and mottos kept on screen: centred no closer than 200 px to either edge)
    const tx = Math.max(200, Math.min(W - 200, px)), nm = kk.short || kk.name; fit(g, nm, 58, 370); text(g, nm, tx, py + rad + 44, WHITE, INK, 10);
    g.font = font(26, 700, false); text(g, kk.motto, tx, py + rad + 86, P.l, INK, 6, 380);
    g.restore();
  });
  // WAR in the middle
  g.save(); g.translate(cx, cy); g.rotate(-0.06); g.beginPath(); g.arc(0, 0, 96, 0, TAU); g.fillStyle = INK; g.fill(); g.lineWidth = 8; g.strokeStyle = GOLD; g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(78); text(g, 'WAR', 0, 4, GOLD, INK, 12); g.restore();
  // the question across the top, the logo above it
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = font(44); if ('letterSpacing' in g) g.letterSpacing = '6px'; text(g, 'TERRITORY CLASH', W / 2, 150, WHITE, INK, 9); if ('letterSpacing' in g) g.letterSpacing = '0px';
  fit(g, hook, 84, 980); g.save(); g.translate(W / 2, 236); g.rotate(-0.03); text(g, hook, 0, 0, GOLD, INK, 13); g.restore();
  g.textBaseline = 'alphabetic';
}

// ----- the thumbnail (Tower Clash's layout: logo, the question, the battle framed, the sides below; y 200..1720 only) -----
function drawThumb(g, s, theme, meta) {
  const K = s.K, n = K.length;
  const hsl = hex => { const [r, gg, b] = hexRgb(hex).map(v => v / 255), mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), l = (mx + mn) / 2, d = mx - mn; let h = 0; if (d) h = mx === r ? ((gg - b) / d) % 6 : mx === gg ? (b - r) / d + 2 : (r - gg) / d + 4; return [(h * 60 + 360) % 360, d ? d / (1 - Math.abs(2 * l - 1)) : 0, l]; };
  // background from the first-named kingdom's colour, its hue turned a little and deepened (white kingdoms: a cold slate)
  const cool = K.find(kk => { const [h, sat] = hsl(pal(kk.key).c); return h >= 150 && h <= 300 && sat > 0.3; }) || K[0], first = pal(cool.key);
  const [hh, ss] = hsl(first.c), Hh = (hh + (hh >= 150 && hh <= 300 ? 12 : 200)) % 360, S = Math.round((ss < 0.15 ? 0.35 : Math.min(0.85, Math.max(0.55, ss))) * 100);
  const lg = g.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, `hsl(${Hh},${S}%,30%)`); lg.addColorStop(0.5, `hsl(${Hh},${S}%,16%)`); lg.addColorStop(1, `hsl(${Hh},${S}%,7%)`);
  g.fillStyle = lg; g.fillRect(0, 0, W, H);
  g.save(); g.translate(W / 2, 960); g.globalAlpha = 0.08; g.fillStyle = first.l; for (let i = 0; i < 18; i++) { g.rotate(TAU / 18); g.beginPath(); g.moveTo(0, 0); g.lineTo(-90, -1500); g.lineTo(90, -1500); g.closePath(); g.fill(); } g.restore();
  // the battle, framed (a square crop of the island, a slight tilt, white border)
  const bg = createCanvas(W, H), bc = bg.getContext('2d'); drawWorld(bc, s, theme, s.t);
  const fw = 760, fh = 855, fy = 548;
  g.save(); g.translate(W / 2, fy + fh / 2); g.rotate(-0.025);
  rr(g, -fw / 2 - 10, -fh / 2 - 10, fw + 20, fh + 20, 30); g.fillStyle = INK; g.fill();
  rr(g, -fw / 2, -fh / 2, fw, fh, 22); g.save(); g.clip();
  g.drawImage(bg, 60, 420, 960, 1080, -fw / 2, -fh / 2, fw, fh);
  const vg = g.createRadialGradient(0, 0, fw * 0.3, 0, 0, fw * 0.8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.42)'); g.fillStyle = vg; g.fillRect(-fw / 2, -fh / 2, fw, fh);
  g.restore(); rr(g, -fw / 2, -fh / 2, fw, fh, 22); g.lineWidth = 8; g.strokeStyle = WHITE; g.stroke(); g.restore();
  // logo and question
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = font(60); if ('letterSpacing' in g) g.letterSpacing = '6px'; text(g, 'TERRITORY CLASH', W / 2, 262, first.l, INK, 10); if ('letterSpacing' in g) g.letterSpacing = '0px';
  const q = meta.thumbQ, words = q.split(' '), lines = []; let cur = '', fs0 = 118; g.font = font(fs0);
  for (const w of words) { const t2 = cur ? cur + ' ' + w : w; if (g.measureText(t2).width > 940 && cur) { lines.push(cur); cur = w; } else cur = t2; }
  if (cur) lines.push(cur); if (lines.length > 2) { fs0 = 92; g.font = font(fs0); }
  const ly0 = lines.length > 1 ? (lines.length > 2 ? 345 : 370) : 420;
  lines.forEach((l, i) => { g.save(); g.translate(W / 2, ly0 + i * fs0 * 0.95); g.rotate(-0.04); text(g, l, 0, 0, i === lines.length - 1 ? GOLD : WHITE, INK, 16); g.restore(); });
  // the kingdoms: champions in rings, crests, names; VS between two, a WAR badge for more
  const ring = (kk, cx, cy, r) => {
    const P = pal(kk.key);
    const rg = g.createRadialGradient(cx, cy, 10, cx, cy, r * 1.45); rg.addColorStop(0, rgba(P.c, 0.75)); rg.addColorStop(1, rgba(P.c, 0)); g.fillStyle = rg; g.beginPath(); g.arc(cx, cy, r * 1.45, 0, TAU); g.fill();
    g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fillStyle = rgba(P.c, 0.35); g.fill(); g.lineWidth = 8; g.strokeStyle = INK; g.stroke();
    g.save(); g.beginPath(); g.arc(cx, cy, r - 4, 0, TAU); g.clip(); g.translate(cx, cy + r * 0.06); portrait(g, kk.champion, kk.key, r * 0.85); g.restore();
    crest(g, kk.key, cx + r * 0.72, cy - r * 0.72, r * 0.62);
    g.textAlign = 'center'; g.textBaseline = 'middle'; const nm = kk.short || kk.name; fit(g, nm, n > 2 ? 38 : 46, n > 2 ? 230 : 380); text(g, nm, cx, cy + r + (n > 2 ? 30 : 40), WHITE, INK, 9);
  };
  if (n === 2) { ring(K[0], 270, 1530, 118); ring(K[1], W - 270, 1530, 118); g.save(); g.translate(W / 2, 1535); g.rotate(-0.06); g.font = font(104); text(g, 'VS', 0, 0, GOLD, INK, 14); g.restore(); }
  else { const r = n === 3 ? 104 : 90, xs = n === 3 ? [200, 540, 880] : [148, 400, 680, 932]; K.forEach((kk, i) => ring(kk, xs[i], 1540 + (i % 2) * 14, r)); }
  g.textBaseline = 'alphabetic';
}

module.exports = { init, setScale, drawWorld, drawHUD, drawCrownSplit, drawThumb, crest, portrait, holdIcon, drawSky, skyOf, W, H, canvas: (w, h) => { init(); return createCanvas(w, h); } };
