// Territory Clash: drawing. The island, the holds, the orders (drag strokes with troops marching along them), the scoreboard,
// the crown-split face-off, and the thumbnail. Looks only: it reads the battle, never changes it, and uses hashes, not dice.
// Uses the shared engine (engine.js, Army Clash's plus the api._ export line, as in Tower Clash) for the cast's portraits,
// the tribe emblems, the palettes and the fonts, so the three channels look like one family.
'use strict';
const path = require('path');
const D = require('./tc-data.js');
const WD = require('./tc-war-draw.js');
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
const back = x => { x = Math.max(0, Math.min(1, x)); const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
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
// a champion (tc-war.js): its portrait, drawn once into a picture and reused
function champ(g, K, x, y) {
  const id = 'champ|' + K.champion + '|' + K.key;
  let sp = sprites.get(id);
  if (!sp) { init(); sp = createCanvas(Math.ceil(48 * SCALE), Math.ceil(48 * SCALE)); const c = sp.getContext('2d'); c.scale(SCALE, SCALE); c.translate(24, 25); c.beginPath(); c.arc(0, -1, 19, 0, TAU); c.clip(); portrait(c, K.champion, K.key, 18); sprites.set(id, sp); }
  g.drawImage(sp, x - 24, y - 25, 48, 48);
}
const inPolyD = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c; } return c; };
const WX = { inPoly: inPolyD, pal: k => pal(k), rgba: (h, a) => rgba(h, a), champ, troop: (g, type, key, x, y) => troop(g, type, key, x, y) };
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
    case 'pass':
      // a gatehouse in the rocks
      g.beginPath(); g.moveTo(-30, 0); g.lineTo(-24, -26); g.lineTo(-14, -18); g.lineTo(-12, 0); g.closePath(); g.fillStyle = stoneD; g.fill(); g.stroke();
      g.beginPath(); g.moveTo(30, 0); g.lineTo(24, -28); g.lineTo(14, -20); g.lineTo(12, 0); g.closePath(); g.fillStyle = stoneD; g.fill(); g.stroke();
      box(-12, -30, 24, 30, stone); for (const bx of [-13, -4, 5]) box(bx, -36, 8, 6, stone);
      g.beginPath(); g.moveTo(-6, 0); g.lineTo(-6, -12); g.arc(0, -12, 6, Math.PI, 0); g.lineTo(6, 0); g.closePath(); g.fillStyle = '#2A1A12'; g.fill(); g.stroke(); flag(0, -36, roof);
      break;
    default:
      box(-22, -14, 18, 14, '#E8DCC4'); tri(-25, -14, 24, 13, roof);
      box(2, -18, 20, 18, '#E8DCC4'); tri(-1, -18, 26, 15, roofD);
  }
  g.restore();
}

// ----- the island, its territories and everything on it -----

// ----- the island's shape (looks only) -----
const MAPZ = 0.9, MAPDY = 40, HUD_DY = 130;
const mapPt = p => ({ x: BOARD.cx + (p.x - BOARD.cx) * MAPZ, y: BOARD.cy + MAPDY + (p.y - BOARD.cy) * MAPZ });
// a border's gentle bow: points from A to B (B included, A not), the same curve whichever side draws it
function edgePts(A, B) {
  const flip = A.x > B.x || (A.x === B.x && A.y > B.y), P = flip ? B : A, Q = flip ? A : B;
  const dx = Q.x - P.x, dy = Q.y - P.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const hsh = h01(Math.round(P.x * 7 + Q.y * 13), Math.round(P.y * 11 + Q.x * 5)), amp = Math.min(9, L * 0.09) * (hsh < 0.5 ? -1 : 1), amp2 = Math.min(4, L * 0.04) * (h01(Math.round(L * 31), 7) - 0.5) * 2;
  const out = []; for (let i = 1; i <= 8; i++) { const u = i / 8, o = amp * Math.sin(Math.PI * u) + amp2 * Math.sin(2 * Math.PI * u); out.push({ x: P.x + dx * u + nx * o, y: P.y + dy * u + ny * o }); }
  if (flip) { out.reverse(); out.shift(); out.push({ x: B.x, y: B.y }); }
  return out;
}
function cellPath(g, c) { const p0 = c.poly[0]; g.beginPath(); g.moveTo(p0.x, p0.y); for (let i = 0; i < c.poly.length; i++) { const A = c.poly[i], B = c.poly[(i + 1) % c.poly.length]; if (A.e >= 0) edgePts(A, B).forEach(p => g.lineTo(p.x, p.y)); else g.lineTo(B.x, B.y); } g.closePath(); }
const coasts = new WeakMap(), shown = new WeakMap(), counts = new WeakMap();
function coastOf(s) {
  if (coasts.has(s.outline)) return coasts.get(s.outline);
  const o = s.outline, n = o.length, out = [], ph = h01(o.length, Math.round(o[0].x)) * TAU;
  for (let i = 0; i < n; i++) {
    const p = o[i], q = o[(i + 1) % n];
    for (let k = 0; k < 3; k++) {
      const u = k / 3, x = p.x + (q.x - p.x) * u, y = p.y + (q.y - p.y) * u, th = (i + u) / n * TAU;
      const bite = 9 + 7 * Math.sin(th * 5 + ph) + 5 * Math.sin(th * 11 + ph * 2) + 3 * Math.sin(th * 23 + ph * 3);
      const dx = x - BOARD.cx, dy = y - BOARD.cy, L = Math.hypot(dx, dy) || 1, d = Math.max(0, bite);
      out.push({ x: x - dx / L * d, y: y - dy / L * d });
    }
  }
  coasts.set(s.outline, out); return out;
}

function drawWorld(g, s, theme, t, o = {}) {
  init();
  const C = s.cells, TH = D.THEMES[theme] || D.THEMES.thornvale;
  // the sea (Rellz, 2026-11-16: "make the background like water and look better and aesthetic"): deep water lit from above,
  // slow light ripples drifting across it, glints, turquoise shallows round the island and foam that breathes on the shore.
  // Looks only, placed by hash and moved by the video clock.
  const sg = g.createLinearGradient(0, 0, 0, H); sg.addColorStop(0, mix(TH.sea[0], '#2A8FB0', 0.22)); sg.addColorStop(0.55, TH.sea[0]); sg.addColorStop(1, TH.sea[1]);
  g.fillStyle = sg; g.fillRect(0, 0, W, H);
  const lit = g.createRadialGradient(W * 0.42, H * 0.4, 60, W * 0.42, H * 0.4, H * 0.62); lit.addColorStop(0, 'rgba(120,220,255,0.16)'); lit.addColorStop(1, 'rgba(120,220,255,0)'); g.fillStyle = lit; g.fillRect(0, 0, W, H);
  // (Rellz, 2026-11-21: "especially the background water make it styled better") a painted sea in the family style: depth
  // contours ringing the island like an old map (each band a shade darker, drifting slowly), little curled wave marks in loose
  // rows, and sun glints. Hashes and the video clock only.
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  const islandAt = (z, off) => { g.beginPath(); s.outline.forEach((p, i) => { const q = mapPt(p), x = BOARD.cx + (q.x - BOARD.cx) * z, y = BOARD.cy + (q.y - BOARD.cy) * z + off; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); };
  for (let r = 6; r >= 1; r--) {
    const z = 1 + r * 0.075 + 0.006 * Math.sin(t * 0.5 + r);
    islandAt(z, 0); g.fillStyle = rgba(mix(TH.sea[0], '#7FE0E8', 0.05 + (6 - r) * 0.05), 0.55); g.fill();
    islandAt(z, 0); g.lineWidth = 3; g.setLineDash([26, 18]); g.lineDashOffset = -t * (6 + r * 2) * (r % 2 ? 1 : -1); g.strokeStyle = 'rgba(220,248,255,0.13)'; g.stroke(); g.setLineDash([]);
  }
  // wave marks: a soft curl and a trailing line, in rows that drift sideways and bob
  for (let row = 0; row < 15; row++) for (let i = 0; i < 6; i++) {
    const id = row * 6 + i, y = 150 + row * 122 + (row % 2) * 30 + Math.sin(t * 0.8 + id) * 5;
    const x = ((i * 200 + (row % 2) * 100 + h01(id, 3) * 70 + t * (10 + 4 * (row % 3))) % 1260) - 90;
    const a = 0.1 + 0.1 * (0.5 + 0.5 * Math.sin(t * 1.1 + id * 1.9));
    g.beginPath(); g.moveTo(x - 30, y + 4); g.bezierCurveTo(x - 16, y - 8, x - 2, y - 8, x + 6, y); g.bezierCurveTo(x + 10, y + 5, x + 2, y + 9, x - 3, y + 3);
    g.moveTo(x + 6, y); g.quadraticCurveTo(x + 22, y + 7, x + 40, y + 1);
    g.lineWidth = 4; g.strokeStyle = `rgba(225,250,255,${a})`; g.stroke();
  }
  // glints of sun on the water
  for (let i = 0; i < 30; i++) {
    const tw = Math.max(0, Math.sin(t * (1.4 + h01(i, 31) * 1.6) + i * 2.3)); if (tw < 0.6) continue;
    const x = h01(i, 32) * W, y = h01(i, 33) * H, z = 3 + 7 * (tw - 0.6);
    g.fillStyle = `rgba(255,255,255,${0.6 * (tw - 0.6) / 0.4})`; g.beginPath(); g.moveTo(x - z * 2.2, y); g.lineTo(x, y - z * 0.6); g.lineTo(x + z * 2.2, y); g.lineTo(x, y + z * 0.6); g.closePath(); g.fill();
  }
  g.restore();
  // (Rellz, 2026-11-21: "make the map a bit smaller instead of just about fitting the screen") the island at MAPZ round the
  // board's middle; everything on it is drawn in the island's own coordinates inside this transform (mapPt for anything outside)
  g.save(); g.translate(BOARD.cx, BOARD.cy + MAPDY); g.scale(MAPZ, MAPZ); g.translate(-BOARD.cx, -BOARD.cy);
  // (Rellz, 2026-11-21: "better shapes not the straight lines") the coast gets bays and headlands (only ever bitten inwards, so the
  // land still covers it), and every border between territories bows gently (the same curve from both sides)
  const coast = coastOf(s), island = () => { g.beginPath(); coast.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); };
  // the shallows: turquoise bands round the shore, then the island's shadow on the sea bed
  const sh = mix(TH.sea[0], '#5FD6D2', 0.55); g.lineJoin = 'round';
  for (const [w, a] of [[120, 0.12], [80, 0.16], [48, 0.2]]) { island(); g.lineWidth = w; g.strokeStyle = rgba(sh, a); g.stroke(); }
  g.save(); g.translate(0, 14); island(); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fill(); g.restore();
  // foam that breathes in and out on the shore
  const br = 0.5 + 0.5 * Math.sin(t * 1.8);
  island(); g.lineWidth = 30 + 10 * br; g.strokeStyle = `rgba(235,250,255,${0.12 + 0.06 * br})`; g.stroke();
  g.save(); island(); g.setLineDash([10, 18]); g.lineDashOffset = -t * 14; g.lineWidth = 16; g.strokeStyle = 'rgba(255,255,255,0.32)'; g.stroke(); g.restore();
  island(); g.lineWidth = 10; g.strokeStyle = 'rgba(240,252,255,0.3)'; g.stroke();
  // territories
  g.save(); island(); g.clip();
  // a hold two armies are pouring into can change hands every few hundredths of a second; the colour on screen follows the battle
  // but never strobes: a new owner shows once it has held for 0.25 s, or at once if nobody has flipped it for a while (looks only)
  const owner = c => { if (o.owners) return o.owners[c.id]; let d = shown.get(c); if (!d || t < d.t0) { d = { k: c.owner, t0: t, at: -9 }; shown.set(c, d); }
    if (c.owner !== d.k) { if (d.pend !== c.owner) { d.pend = c.owner; d.pt = t; } if (t - d.pt >= 0.25 || t - d.at >= 0.6) { d.prev = d.k; d.k = c.owner; d.at = t; d.pend = null; } } else d.pend = null;
    d.t0 = t; return d.k; };
  for (const c of C) {
    const k = owner(c), P = k >= 0 ? pal(s.K[k].key) : null;
    cellPath(g, c);
    const landFill = PP => { if (PP) { const lg = g.createLinearGradient(c.x - 120, c.y - 120, c.x + 120, c.y + 120); lg.addColorStop(0, mix(PP.c, PP.l, 0.28)); lg.addColorStop(1, mix(PP.c, PP.d, 0.22)); return lg; } return TH.ground[c.id % 2]; };
    // (Rellz, 2026-11-23: "polished and satisfying to watch like Tower Clash") a captured territory doesn't just change colour:
    // the new colour floods out from the hold like paint across the land in under half a second, a bright wave on its edge
    const dS = o.owners ? null : shown.get(c), fl = dS && dS.prev !== undefined ? t - dS.at : 9;
    if (fl >= 0 && fl < 0.5) {
      const PO = dS.prev >= 0 ? pal(s.K[dS.prev].key) : null, r = 12 + 230 * (1 - Math.pow(1 - fl / 0.5, 3));
      g.fillStyle = landFill(PO); g.fill();
      g.save(); g.clip(); g.beginPath(); g.arc(c.x, c.y, r, 0, TAU); g.fillStyle = landFill(P); g.fill();
      g.lineWidth = 10 * (1 - fl / 0.5) + 2; g.strokeStyle = `rgba(255,255,255,${0.8 * (1 - fl / 0.5)})`; g.stroke(); g.restore();
      cellPath(g, c);
    } else { g.fillStyle = landFill(P); g.fill(); }
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
    const age = o.owners ? t - (c.flipT ?? -9) : t - (shown.get(c) || { at: -9 }).at;
    if (age >= 0 && age < 0.7) { g.fillStyle = `rgba(255,255,255,${0.55 * (1 - age / 0.7)})`; g.fill(); }
  }
  // (rules.warfare) forests, the pass, the river, plague, the golden field, cut-off land
  WD.ground(g, s, t, WX);
  // borders: thin between all territories, thick between different owners
  for (const c of C) for (let i = 0; i < c.poly.length; i++) {
    const A = c.poly[i], B = c.poly[(i + 1) % c.poly.length], j = A.e;
    if (j < 0 || j < c.id) continue;
    const diff = owner(c) !== owner(C[j]);
    g.beginPath(); g.moveTo(A.x, A.y); edgePts(A, B).forEach(p => g.lineTo(p.x, p.y));
    if (diff) { g.lineWidth = 7; g.strokeStyle = INK; g.stroke(); g.lineWidth = 2.5; g.strokeStyle = 'rgba(255,255,255,0.35)'; g.stroke(); }
    else { g.lineWidth = 2; g.strokeStyle = 'rgba(4,6,11,0.32)'; g.stroke(); }
  }
  g.restore();
  island(); g.lineWidth = 7; g.strokeStyle = INK; g.stroke();
  // (rules.picks) plague clouds, healing rain and smoke lie on the land, under the roads and the troops
  if (s.pkS && !o.noStreams) drawPicksGround(g, s, t);
  // roads
  g.save(); g.setLineDash([6, 10]); g.lineWidth = 3; g.strokeStyle = 'rgba(255,248,230,0.22)';
  for (const c of C) for (const j of c.nb) if (j > c.id) { const dx = C[j].x - c.x, dy = C[j].y - c.y, L = Math.hypot(dx, dy) || 1, e = Math.min(56, L * 0.3) / L; g.beginPath(); g.moveTo(c.x + dx * e, c.y + dy * e); g.lineTo(C[j].x - dx * e, C[j].y - dy * e); g.stroke(); }
  g.restore();
  // (rules.warfare) fords and bridges, walls, truces and marriages
  WD.roads(g, s, t);
  // orders: the drag stroke, then the troops on it
  if (!o.noStreams) {
    // all the strokes first, then every marcher on the island in one sorted crowd (nearer lower on screen in front; a hero or a
    // bigger troop always over the line troops beside it), then the arrowheads, then the holds and counts over everything
    const crowd = [];
    for (const st of s.streams) drawStream(g, s, st, t, 'line');
    for (const st of s.streams) drawStream(g, s, st, t, 'troops', crowd);
    crowd.sort((a, b) => (a.z > 1.5) - (b.z > 1.5) || a.y - b.y || a.z - b.z).forEach(m => m.draw());
    for (const st of s.streams) drawStream(g, s, st, t, 'head');
  }
  // holds and their troop counts
  for (const c of C) {
    const k = owner(c), P = k >= 0 ? pal(s.K[k].key) : null;
    if (c.mimic > 0 && k < 0 && !o.counts) chestIcon(g, c, t); else holdIcon(g, c, P, t);
    const n = Math.max(0, Math.floor(o.counts ? o.counts[c.id] : c.n)), str = String(n);
    // the count pops when it changes: a little bounce as it grows, a bigger red-hot jolt when an attack knocks it down
    let cs = counts.get(c); if (!cs || t < cs.t0) { cs = { n, t: -9, hit: false, t0: t }; counts.set(c, cs); }
    if (n !== cs.n) { cs.hit = n < cs.n; cs.t = t; cs.n = n; } cs.t0 = t;
    const ca = t - cs.t, bump = ca < 0.35 ? Math.sin(Math.PI * ca / 0.35) * (cs.hit ? 0.28 : 0.1) : 0, hot = cs.hit && ca < 0.3 ? 1 - ca / 0.3 : 0;
    g.font = font(c.type === 'capital' ? 34 : 29); const w = Math.max(48, g.measureText(str).width + 26), hh = c.type === 'capital' ? 40 : 34, y0 = c.y + 14;
    g.save(); g.translate(c.x, y0 + hh / 2); g.scale(1 + bump, 1 + bump); g.translate(-c.x, -(y0 + hh / 2));
    rr(g, c.x - w / 2, y0, w, hh, hh / 2); g.fillStyle = hot ? `rgb(${Math.round(4 + 200 * hot)},${Math.round(6 + 20 * hot)},${Math.round(11 + 30 * hot)})` : 'rgba(4,6,11,0.88)'; g.fill(); g.lineWidth = 4; g.strokeStyle = P ? P.l : '#C9CED8'; g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = WHITE; g.fillText(str, c.x, y0 + hh / 2 + 1);
    g.restore();
    // a burst of the new colour and gold from the hold the moment it's taken
    const dS2 = o.owners ? null : shown.get(c), fl = dS2 && dS2.prev !== undefined ? t - dS2.at : 9;
    if (fl >= 0 && fl < 0.6 && k >= 0) { const Pk = pal(s.K[k].key); for (let q = 0; q < 12; q++) { const a = q / 12 * TAU + h01(c.id, q), r = 18 + 90 * (1 - Math.pow(1 - fl / 0.6, 2)), z = 7 * (1 - fl / 0.6);
      g.fillStyle = q % 3 ? Pk.l : GOLD; g.beginPath(); g.arc(c.x + Math.cos(a) * r, c.y - 10 + Math.sin(a) * r * 0.8, z, 0, TAU); g.fill(); } }
    if (c.type === 'capital' && k >= 0) crest(g, s.K[k].key, c.x + 40, c.y - 46, 34);
  }
  if (s.pkS && !o.noStreams) drawPicksTop(g, s, t);
  // (rules.warfare) champions, spies, rebels, the moments, the rain
  WD.top(g, s, t, WX);
  g.textBaseline = 'alphabetic';
  g.restore();
}

function streamPos(s, st, d) {
  const C = s.cells, a = C[st.from], b = C[st.to], f = Math.max(0, Math.min(1, d / st.len));
  if (!st.sea) return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  // a sea lane bows out over the water, away from the island's middle
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = mx - BOARD.cx, dy = my - BOARD.cy, L = Math.hypot(dx, dy) || 1, qx = mx + (dx / L) * 110, qy = my + (dy / L) * 110, u = 1 - f;
  return { x: u * u * a.x + 2 * u * f * qx + f * f * b.x, y: u * u * a.y + 2 * u * f * qy + f * f * b.y };
}
function drawStream(g, s, st, t, pass = 'all', crowd = null) {
  const K = s.K[st.k], P = pal(K.key), C = s.cells, a = C[st.from], b = C[st.to];
  // (Rellz, 2026-11-16: "arrows look weird touching numbers or going under it") the stroke starts clear of its own hold and
  // ends clear of the target's, so it never touches a castle or a count; it draws itself out in 0.3 s with a bright dot on
  // its tip like a finger on glass, then light chevrons flow along it towards the target
  const s0 = Math.min(st.len * 0.3, 54), s1 = Math.max(s0 + 10, st.len - 70), grow = Math.min(1, (s.t - st.t0) / 0.3), pts = [];
  for (let i = 0; i <= 24; i++) pts.push(streamPos(s, st, s0 + ((s1 - s0) * grow * i) / 24));
  const line = () => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); };
  const tip = pts[pts.length - 1], pre = pts[pts.length - 4] || pts[0], ang = Math.atan2(tip.y - pre.y, tip.x - pre.x);
  if (pass === 'all' || pass === 'line') {
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  line(); g.lineWidth = 30; g.strokeStyle = rgba(P.c, 0.18); g.stroke();
  line(); g.lineWidth = 19; g.strokeStyle = rgba(INK, 0.7); g.stroke();
  line(); g.lineWidth = 12; g.strokeStyle = st.sea ? rgba(P.c, 0.7) : P.c; g.stroke();
  line(); g.setLineDash([2, 22]); g.lineDashOffset = -t * 70; g.lineWidth = 6; g.strokeStyle = rgba(P.l, 0.95); g.stroke(); g.setLineDash([]);
  g.restore();
  }
  if (pass === 'all' || pass === 'head') {
  g.save();
  if (grow >= 1) {
    const pop = back(Math.min(1, (s.t - st.t0 - 0.3) / 0.25));
    g.save(); g.translate(tip.x, tip.y); g.rotate(ang); g.scale(pop, pop);
    g.beginPath(); g.moveTo(22, 0); g.lineTo(-14, -19); g.lineTo(-6, 0); g.lineTo(-14, 19); g.closePath();
    g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 8; g.shadowOffsetY = 3; g.fillStyle = P.c; g.fill(); g.shadowColor = 'transparent';
    g.lineWidth = 5; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.moveTo(16, -1); g.lineTo(-9, -14); g.lineTo(-4, -2); g.closePath(); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fill();
    g.restore();
  } else {
    const gl = g.createRadialGradient(tip.x, tip.y, 2, tip.x, tip.y, 30); gl.addColorStop(0, 'rgba(255,255,255,0.95)'); gl.addColorStop(0.4, rgba(P.l, 0.7)); gl.addColorStop(1, rgba(P.c, 0)); g.fillStyle = gl; g.beginPath(); g.arc(tip.x, tip.y, 30, 0, TAU); g.fill();
  }
  g.restore();
  }
  // the troops (upright, in the kingdom's colour), or boats on a sea lane. (Rellz, 2026-11-21: "sometimes they spread apart too
  // much", "sometimes characters should walk side by side", "bigger troops should cover smaller") Single file most of the time,
  // held close to the road; some orders march two or three abreast in ranks. Each troop is handed to the caller's crowd list so
  // all marchers on the island are drawn together, the lower (nearer) first behind, the bigger on top of the smaller.
  if (pass !== 'all' && pass !== 'troops') return;
  const ps = st.packets.slice(0, 90), nx = -Math.sin(ang), ny = Math.cos(ang), hw = h01(st.id, 77), wide = st.sea ? 1 : hw < 0.5 ? 1 : hw < 0.82 ? 2 : 3;
  const list = crowd || [];
  for (let i = ps.length - 1; i >= 0; i--) {
    const r0 = i - (i % wide), rank = ps.slice(r0, r0 + wide), dm = rank.reduce((a, b) => a + b, 0) / rank.length, j = i - r0;
    const p = streamPos(s, st, wide > 1 ? dm : ps[i]);
    const side0 = wide > 1 ? (j - (rank.length - 1) / 2) * 14 + (h01(st.id, i) - 0.5) * 2 : (h01(st.id, i) - 0.5) * 4;
    // (Rellz, 2026-11-22: "sometimes they overshoot, the army should march straight towards the tower") every man walks the
    // road's own line to the target (ranks close up into single file over the last stretch) and fades into the gate as he
    // reaches the hold, instead of walking on through the castle
    const dd = wide > 1 ? dm : ps[i], toGo = st.len - dd, gate = Math.max(0, Math.min(1, (toGo - 34) / 30)), side = side0 * Math.min(1, toGo / 90);
    if (gate <= 0.02) continue;
    const step = Math.sin(t * 9 + (wide > 1 ? r0 : i) * 0.9), x = p.x + nx * side, y = p.y + ny * side - Math.abs(step) * 3;
    if (st.sea) { list.push({ y: p.y + ny * side, z: 1, draw: () => {
      g.save(); g.translate(x, y); g.beginPath(); g.moveTo(-14, 0); g.lineTo(14, 0); g.lineTo(9, 8); g.lineTo(-9, 8); g.closePath(); g.fillStyle = '#8A6A49'; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -20); g.lineTo(12, -4); g.closePath(); g.fillStyle = P.l; g.fill(); g.stroke(); g.restore(); } }); continue; }
    // (rules.picks) the hero at the front of an order (a golem's halves, a pack of rats: every troop), a ghost walking through
    const hero = st.hero && (st.allHero || i === 0) ? st.hero : null, ghost = st.phaseT > s.t, type = hero || K.line, U = (E && E.UNIT[type]) || { r: 10 };
    list.push({ y: p.y + ny * side, z: (hero ? 2 : 1) + (U.r || 10) / 100, draw: () => {
      // a soft shadow under each marcher grounds the column
      g.beginPath(); g.ellipse(x, p.y + ny * side + 10, 9, 3.2, 0, 0, TAU); g.fillStyle = 'rgba(0,0,0,0.22)'; g.fill();
      g.globalAlpha = (ghost ? 0.55 : 1) * gate;
      g.save(); g.translate(x, y); const tz = hero ? 1.45 : 1.2; g.scale(tz, tz); troop(g, type, K.key, 0, 0); g.restore();   // bigger soldiers read better on a phone
      if (st.frozeT > s.t) { g.beginPath(); g.arc(x, y - 4, 15, 0, TAU); g.fillStyle = 'rgba(190,235,255,0.5)'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#DCEFFF'; g.stroke(); }
      g.globalAlpha = 1;
      if (st.merc) WD.mercMark(g, x, y, t, i);
    } });
  }
  if (!crowd) { list.sort((a, b) => a.z - b.z || a.y - b.y); list.forEach(m => m.draw()); }
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
    g.fillStyle = lg; g.fillRect(0, 0, W, H); g.fillStyle = `rgba(8,14,44,${0.32 * k2})`; g.fillRect(0, 0, W, H);
    // the holds light their lamps as night comes
    if (k2 > 0) for (const c of s.cells) if (c.owner >= 0) { const gl = g.createRadialGradient(c.x, c.y - 10, 4, c.x, c.y - 10, 60); gl.addColorStop(0, `rgba(255,200,110,${0.35 * k2})`); gl.addColorStop(1, 'rgba(255,200,110,0)'); g.fillStyle = gl; g.beginPath(); g.arc(c.x, c.y - 10, 60, 0, TAU); g.fill(); }
  }
  const W0 = sky.wx; if (!W0) return;
  g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip();
  if (W0 === 'rain') { g.fillStyle = 'rgba(30,45,80,0.08)'; g.fillRect(0, 0, W, H); g.beginPath(); for (let i = 0; i < 90; i++) { const sp = 0.6 + h01(i, 3) * 0.8, x = (h01(i, 1) * W + t * 120 * sp) % W, y = (h01(i, 2) * H + t * 1100 * sp) % H; g.moveTo(x, y); g.lineTo(x - 5 * sp, y - 26 * sp); } g.lineWidth = 1.8; g.strokeStyle = 'rgba(200,220,255,0.42)'; g.stroke(); }
  else if (W0 === 'fog') { g.fillStyle = 'rgba(214,222,232,0.08)'; g.fillRect(0, 0, W, H); for (let i = 0; i < 7; i++) { const x = ((h01(i, 4) * (W + 500) + t * 16 * (0.6 + h01(i, 5))) % (W + 500)) - 250, y = 400 + h01(i, 6) * 1080; g.beginPath(); g.ellipse(x, y, 260, 100, 0, 0, TAU); g.fillStyle = 'rgba(230,236,244,0.1)'; g.fill(); } }
  else { for (let i = 0; i < 90; i++) { const sp = 0.6 + h01(i, 3) * 0.8, x = ((h01(i, 1) * W + Math.sin(t * 0.9 + i) * 24 + t * 18) % W + W) % W, y = (h01(i, 2) * H + t * 70 * sp) % H; g.beginPath(); g.arc(x, y, 1.6 + 1.8 * sp, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fill(); } }
  g.restore();
}

// ----- the scoreboard: clock, crests with counts, the land bar, and the one notice on screen -----
function drawHUD(g, s, t, notice, smooth) {
  // (Rellz, 2026-11-21: "remove anything in the ui that is covered by the camera on top") nothing in the top 190 px, where a
  // phone's notch or camera island and YouTube's own top bar sit: the whole scoreboard, clock and notices sit HUD_DY lower
  g.save(); g.translate(0, HUD_DY);
  const K = s.K, n = K.length, total = s.cells.length;
  // clock
  const left = Math.max(0, FIGHT - s.t), clock = `0:${String(Math.ceil(left)).padStart(2, '0')}`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  // the last five seconds: the clock beats once a second (a smooth swell and settle, never a jump)
  const beat = left > 0 && left <= 5 ? Math.max(0, 1 - (Math.ceil(left) - left) / 0.35) : 0, cz = 1 + 0.16 * Math.sin(Math.PI * Math.min(1, (Math.ceil(left) - left) / 0.35)) * (left > 0 && left <= 5 ? 1 : 0);
  g.save(); g.translate(W / 2, 101); g.scale(cz, cz); g.translate(-W / 2, -101);
  // (Rellz, 2026-11-21: "make the ui look better") one royal panel behind the whole scoreboard: dark glass, a gold rim, a sheen
  // drifting along it; the clock sits on its top edge like a seal
  g.save();
  rr(g, 40, 140, 1000, 190, 30); const pg = g.createLinearGradient(0, 140, 0, 330); pg.addColorStop(0, 'rgba(22,18,30,0.86)'); pg.addColorStop(1, 'rgba(6,6,12,0.9)'); g.fillStyle = pg;
  const pf = g.fillStyle; rr(g, 40, 148, 1000, 190, 30); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fill(); rr(g, 40, 140, 1000, 190, 30); g.fillStyle = pf; g.fill();
  g.lineWidth = 4; const rg = g.createLinearGradient(40, 0, 1040, 0); rg.addColorStop(0, '#8A6A2A'); rg.addColorStop(0.5, '#F5D27A'); rg.addColorStop(1, '#8A6A2A'); g.strokeStyle = rg; g.stroke();
  g.save(); rr(g, 40, 140, 1000, 190, 30); g.clip(); const sx = ((t * 120) % 1600) - 300, sh = g.createLinearGradient(sx, 0, sx + 260, 0); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,240,200,0.07)'); sh.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(40, 140, 1000, 190); g.restore();
  g.restore();
  rr(g, W / 2 - 82, 70, 164, 62, 31); const cg = g.createLinearGradient(0, 70, 0, 132); cg.addColorStop(0, left <= 10 ? '#5A0E18' : '#26203A'); cg.addColorStop(1, left <= 10 ? '#2A0509' : '#0B0A14'); g.fillStyle = cg; g.fill(); g.lineWidth = 5; g.strokeStyle = left <= 10 ? '#FF3149' : '#E9C46A'; g.stroke();
  if (beat > 0) { g.save(); g.globalAlpha = 0.35 * beat; g.shadowColor = '#FF3149'; g.shadowBlur = 30; g.stroke(); g.restore(); }
  g.font = font(48); text(g, clock, W / 2, 103, left <= 10 ? '#FFB0BA' : WHITE, INK, 6);
  g.restore();
  // crests and counts
  const colW = 940 / n;
  const lead = K.map((_, i) => s.score(i)), top = Math.max(...lead), leaders = lead.filter(v => v === top).length;
  K.forEach((k, i) => {
    const cx = 70 + colW * (i + 0.5), cnt = s.score(i), out = cnt === 0 && s.t > 3, big = n <= 2;
    // the leader (alone at the top) wears a small crown over its crest and a soft glow in its colour behind it
    if (leaders === 1 && cnt === top && s.t > 1) {
      const lx = cx - colW / 2 + (big ? 76 : 62) / 2 + 6, gl = g.createRadialGradient(lx, 206, 10, lx, 206, 80); gl.addColorStop(0, rgba(pal(k.key).l, 0.35)); gl.addColorStop(1, rgba(pal(k.key).l, 0));
      g.fillStyle = gl; g.fillRect(lx - 80, 140, 160, 150);
      g.save(); g.translate(lx, 160 + Math.sin(t * 3) * 2); g.beginPath(); g.moveTo(-16, 8); g.lineTo(-16, -6); g.lineTo(-8, 2); g.lineTo(0, -10); g.lineTo(8, 2); g.lineTo(16, -6); g.lineTo(16, 8); g.closePath();
      g.fillStyle = GOLD; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke(); g.restore();
    }
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
  rr(g, bx - 5, by - 5, bw + 10, bh + 10, 25); g.fillStyle = INK; g.fill(); g.lineWidth = 2.5; g.strokeStyle = 'rgba(233,196,106,0.75)'; g.stroke();
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
      // a royal ribbon: folded tails behind each end, the band in front (red for the big moments, dark with gold otherwise)
      const bx0 = W / 2 - w / 2, bx1 = W / 2 + w / 2, col = hot ? '#C81E34' : '#1A1626', dark = hot ? '#7A0F1E' : '#0A0910';
      for (const sd of [-1, 1]) { const ex = sd < 0 ? bx0 : bx1; g.beginPath(); g.moveTo(ex, y - 20); g.lineTo(ex + sd * 46, y - 20); g.lineTo(ex + sd * 30, y + 4); g.lineTo(ex + sd * 46, y + 28); g.lineTo(ex, y + 28); g.closePath(); g.fillStyle = dark; g.fill(); g.lineWidth = 4; g.strokeStyle = INK; g.stroke(); }
      rr(g, bx0, y - 32, w, 64, 10); const ng = g.createLinearGradient(0, y - 32, 0, y + 32); ng.addColorStop(0, hot ? '#EF3B52' : '#2C2540'); ng.addColorStop(1, col); g.fillStyle = ng; g.fill(); g.lineWidth = 5; g.strokeStyle = hot ? '#FFC2C9' : GOLD; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(bx0 + 8, y - 26, w - 16, 10);
      g.textAlign = 'center'; fit(g, notice.text, 44, 940); text(g, notice.text, W / 2, y + 2, WHITE, INK, 7);
      g.globalAlpha = 1;
    }
  }
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  g.restore();
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
  g.font = font(44); if ('letterSpacing' in g) g.letterSpacing = '6px'; text(g, 'TERRITORY CLASH', W / 2, 230, WHITE, INK, 9); if ('letterSpacing' in g) g.letterSpacing = '0px';
  fit(g, hook, 84, 980); g.save(); g.translate(W / 2, 306); g.rotate(-0.03); text(g, hook, 0, 0, GOLD, INK, 13); g.restore();
  g.textBaseline = 'alphabetic';
}

// ----- the thumbnail (Tower Clash's layout: logo, the question, the battle framed, the sides below; y 200..1720 only) -----
function drawThumb(g, s, theme, meta) {
  // (2026-11-23, Territory Clash's own thumbnail look: the royal war map) an old parchment chart with the real island in a
  // gilded frame (at a moment where nobody is clearly winning: thumbMoment in pick.js), a gold crown on the frame, each
  // kingdom's champion on a seal at the map's corners, the mode on a red ribbon across the bottom of the frame, and the
  // question on top in big letters. So it never looks like Army Clash's war poster or Tower Clash's burning siege. Nothing that
  // matters below y 1500 (YouTube lays the title over the bottom of the picture in the feed). Never the result.
  const K = s.K, n = K.length;
  g.save();
  // 1) parchment: warm paper, darker burnt edges, faint chart lines
  const pg = g.createLinearGradient(0, 0, 0, H); pg.addColorStop(0, '#EBD9AA'); pg.addColorStop(0.55, '#DCC28A'); pg.addColorStop(1, '#BE9C5E');
  g.fillStyle = pg; g.fillRect(0, 0, W, H);
  g.save(); g.strokeStyle = 'rgba(110,72,30,0.16)'; g.lineWidth = 2;
  for (let x = 60; x < W; x += 120) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 60; y < H; y += 120) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  for (let i = 0; i < 260; i++) { const hx = ((i * 2654435761) >>> 0) / 4294967296, hy = ((i * 1597334677 + 31) >>> 0) / 4294967296, hz = ((i * 3812015801 + 5) >>> 0) / 4294967296;
    g.fillStyle = `rgba(95,60,20,${0.04 + hz * 0.08})`; g.beginPath(); g.arc(hx * W, hy * H, 3 + hz * 16, 0, TAU); g.fill(); }
  g.restore();
  const burn = g.createRadialGradient(W / 2, H * 0.45, W * 0.42, W / 2, H * 0.45, H * 0.7); burn.addColorStop(0, 'rgba(60,30,5,0)'); burn.addColorStop(1, 'rgba(60,30,5,0.72)');
  g.fillStyle = burn; g.fillRect(0, 0, W, H);
  const big = (txt, x, y, maxW, size, fill, lw, rot = 0) => {
    let z = size; g.font = font(z); while (z > 20 && g.measureText(txt).width > maxW) { z -= 2; g.font = font(z); }
    g.save(); g.translate(x, y); g.rotate(rot); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.lineWidth = lw * z / size; g.strokeStyle = INK; g.strokeText(txt, 0, 0); g.fillStyle = fill; g.fillText(txt, 0, 0); g.restore(); return z;
  };
  // 2) the logo (small, on a dark plate) and the question (big)
  g.save(); g.font = font(54); const lw0 = g.measureText('TERRITORY CLASH').width + 70; g.translate(W / 2, 205); g.rotate(-0.03);
  rr(g, -lw0 / 2, -38, lw0, 76, 14); g.fillStyle = '#2A1A0C'; g.fill(); g.lineWidth = 5; g.strokeStyle = GOLD; g.stroke(); g.restore();
  big('TERRITORY CLASH', W / 2, 207, lw0 - 40, 54, GOLD, 8, -0.03);
  const q = (meta.thumbQ || 'WHO RULES THE MAP?').toUpperCase(); g.font = font(150);
  if (g.measureText(q).width < W - 120) big(q, W / 2, 340, W - 110, 150, WHITE, 22, -0.04);
  else {
    const ws = q.split(' '); let bi = 1, bd = 1e9;
    for (let i = 1; i < ws.length; i++) { const d = Math.abs(g.measureText(ws.slice(0, i).join(' ')).width - g.measureText(ws.slice(i).join(' ')).width); if (d < bd) { bd = d; bi = i; } }
    const a = ws.slice(0, bi).join(' '), b = ws.slice(bi).join(' ');
    const z = Math.min(big(a, W / 2, -999, W - 120, 118, WHITE, 18), big(b, W / 2, -999, W - 120, 118, WHITE, 18));
    big(a, W / 2, 296, W - 120, z, WHITE, 18, -0.04); big(b, W / 2, 296 + z * 0.98, W - 120, z, GOLD, 18, -0.04);
  }
  // 3) the island itself, sharp and in full colour, in a gilded frame (BOARD: x 60-1020, y 420-1500 in the world)
  const bg = createCanvas(W, H); drawWorld(bg.getContext('2d'), s, theme, s.t);
  const sx = 30, sy = 400, sw = 1020, sh = 1120, fw = 780, fh = Math.round(fw * sh / sw), fx = (W - fw) / 2, fy = 578;
  g.save(); g.translate(fx + fw / 2, fy + fh / 2); g.rotate(0.018);
  g.save(); g.shadowColor = 'rgba(40,20,0,0.6)'; g.shadowBlur = 40; g.shadowOffsetY = 14; rr(g, -fw / 2 - 26, -fh / 2 - 26, fw + 52, fh + 52, 10); g.fillStyle = '#7A4F1C'; g.fill(); g.restore();
  const fg = g.createLinearGradient(-fw / 2, -fh / 2, fw / 2, fh / 2); fg.addColorStop(0, '#FFE08A'); fg.addColorStop(0.5, '#C8921E'); fg.addColorStop(1, '#FFD36A');
  rr(g, -fw / 2 - 20, -fh / 2 - 20, fw + 40, fh + 40, 8); g.fillStyle = fg; g.fill(); g.lineWidth = 5; g.strokeStyle = INK; g.stroke();
  rr(g, -fw / 2 - 7, -fh / 2 - 7, fw + 14, fh + 14, 4); g.lineWidth = 4; g.strokeStyle = '#7A4F1C'; g.stroke();
  g.save(); rr(g, -fw / 2, -fh / 2, fw, fh, 4); g.clip(); g.drawImage(bg, sx, sy, sw, sh, -fw / 2, -fh / 2, fw, fh);
  const iv = g.createRadialGradient(0, 0, fw * 0.4, 0, 0, fw * 0.78); iv.addColorStop(0, 'rgba(0,0,0,0)'); iv.addColorStop(1, 'rgba(40,20,0,0.35)'); g.fillStyle = iv; g.fillRect(-fw / 2, -fh / 2, fw, fh);
  g.restore();
  for (const [cx, cy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.save(); g.translate(cx * (fw / 2 + 13), cy * (fh / 2 + 13)); g.rotate(Math.PI / 4); g.fillStyle = '#B91C1C'; g.fillRect(-13, -13, 26, 26); g.lineWidth = 4; g.strokeStyle = INK; g.strokeRect(-13, -13, 26, 26); g.restore(); }
  g.restore();
  // a gold crown sitting on the top of the frame
  g.save(); g.translate(W / 2, fy - 18); g.rotate(0.018);
  g.beginPath(); g.moveTo(-95, 30); g.lineTo(-110, -50); g.lineTo(-55, -8); g.lineTo(0, -78); g.lineTo(55, -8); g.lineTo(110, -50); g.lineTo(95, 30); g.closePath();
  const cg = g.createLinearGradient(0, -78, 0, 30); cg.addColorStop(0, '#FFF1B0'); cg.addColorStop(0.5, '#F6C445'); cg.addColorStop(1, '#B9831A');
  g.fillStyle = cg; g.fill(); g.lineWidth = 9; g.lineJoin = 'round'; g.strokeStyle = INK; g.stroke();
  rr(g, -100, 22, 200, 30, 8); g.fillStyle = '#E2A92B'; g.fill(); g.lineWidth = 7; g.stroke();
  for (const [x, y, c] of [[-110, -50, '#3B82F6'], [0, -78, '#DC2626'], [110, -50, '#16A34A'], [0, 37, '#DC2626'], [-55, 37, '#3B82F6'], [55, 37, '#16A34A']]) { g.beginPath(); g.arc(x, y, 11, 0, TAU); g.fillStyle = c; g.fill(); g.lineWidth = 4; g.stroke(); }
  g.restore();
  // 4) each kingdom's champion on a wax seal at a corner of the map, its name on a plate under it
  const seal = (kk, x, y, r) => {
    const C = pal(kk.key);
    g.save(); g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 18; g.shadowOffsetY = 6;
    g.beginPath(); for (let k = 0; k < 24; k++) { const a = k / 24 * TAU, q2 = r + 12 + (k % 2 ? 6 : -2); g.lineTo(Math.cos(a) * q2 + x, Math.sin(a) * q2 + y); } g.closePath();
    g.fillStyle = C.d; g.fill(); g.restore(); g.lineWidth = 6; g.strokeStyle = INK; g.stroke();
    const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r); gr.addColorStop(0, C.l); gr.addColorStop(0.55, C.c); gr.addColorStop(1, C.d);
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = gr; g.fill();
    g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip(); g.translate(x, y + r * 0.06); portrait(g, kk.champion, kk.key, r * 0.88); g.restore();
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.lineWidth = 7; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.arc(x, y, r - 7, 0, TAU); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.6)'; g.stroke();
    crest(g, kk.key, x + r * 0.72, y + r * 0.66, r * 0.48);
    const nm = (kk.short || kk.name).toUpperCase(); g.font = font(44); const pw = Math.min(380, g.measureText(nm).width + 50), py = y + r + 44;
    rr(g, x - pw / 2, py - 30, pw, 60, 14); const pgr = g.createLinearGradient(0, py - 30, 0, py + 30); pgr.addColorStop(0, C.c); pgr.addColorStop(1, C.d);
    g.fillStyle = pgr; g.fill(); g.lineWidth = 6; g.strokeStyle = INK; g.stroke();
    big(nm, x, py + 2, pw - 30, 44, WHITE, 9);
  };
  const r0 = n <= 2 ? 116 : n === 3 ? 106 : 100, L = fx + 24, R = fx + fw - 24, T = fy + 70, B = fy + fh - 112;
  const at = n <= 2 ? [[L + 20, B - 20], [R - 20, B - 20]] : n === 3 ? [[L + 10, T + 40], [R - 10, T + 40], [R - 10, B]] : [[L + 20, T + 30], [R - 20, T + 30], [L + 20, B], [R - 20, B]];
  K.forEach((kk, i) => seal(kk, at[i][0], at[i][1], r0));
  // 5) the mode on a red ribbon across the bottom edge of the frame
  if (meta.tag) {
    g.font = font(50); const tw = Math.min(W - 260, g.measureText(meta.tag).width + 90), ty = fy + fh + 26;
    g.save(); g.translate(W / 2, ty); g.rotate(0.018);
    g.fillStyle = '#7F1D1D'; for (const sgn of [-1, 1]) { g.beginPath(); g.moveTo(sgn * (tw / 2 - 10), -26); g.lineTo(sgn * (tw / 2 + 60), -26); g.lineTo(sgn * (tw / 2 + 38), 4); g.lineTo(sgn * (tw / 2 + 60), 34); g.lineTo(sgn * (tw / 2 - 10), 34); g.closePath(); g.fill(); g.lineWidth = 5; g.strokeStyle = INK; g.stroke(); }
    rr(g, -tw / 2, -38, tw, 76, 6); g.fillStyle = '#B91C1C'; g.fill(); g.lineWidth = 6; g.strokeStyle = INK; g.stroke();
    g.restore();
    big(meta.tag, W / 2, ty + 2, tw - 40, 50, '#FFE8A3', 8, 0.018);
  }
  g.restore(); g.textBaseline = 'alphabetic'; g.textAlign = 'left';
}

module.exports = { init, setScale, drawWorld, drawHUD, drawCrownSplit, drawThumb, crest, portrait, holdIcon, drawSky, skyOf, streamPos, mapPt, MAPZ, HUD_DY, W, H, canvas: (w, h) => { init(); return createCanvas(w, h); } };
