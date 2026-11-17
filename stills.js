// Territory Clash: still frames and the thumbnail for one planned Short (no video: Rellz checks with stills).
// writeStills(plan, dir) -> { thumb, sheet }: out/<slot>-thumb.jpg (1080x1920, upload-ready) and a contact sheet of five
// review stills (the face-off, the opening, the thumbnail moment, last orders, the bell).
'use strict';
const fs = require('fs');
const path = require('path');
const { TCSim } = require('./tc-sim.js');
const DR = require('./tc-draw.js');
const D = require('./tc-data.js');

function frameAt(plan, t) {
  const s = new TCSim(plan.seed, { kingdoms: plan.kingdoms, mode: plan.mode, tempo: plan.tempo, underdogPower: plan.underdogPower }).runTo(t);
  return s;
}
function noticeAt(plan, t) { let n = null; for (const x of plan.notices) if (x.t <= t && t < x.t + 2.2) n = { at: x.t, text: x.text, kind: x.kind }; return n; }

function writeStills(plan, dir, name) {
  fs.mkdirSync(dir, { recursive: true });
  const W = DR.W, H = DR.H;
  // the thumbnail: the battle at its most even busy moment, never the result
  const st = frameAt(plan, plan.thumbT);
  const tcv = DR.canvas(W, H); DR.drawThumb(tcv.getContext('2d'), st, plan.theme, { thumbQ: plan.thumbQ, tag: (require('./tc-data.js').MODES[plan.mode] || {}).name ? require('./tc-data.js').MODES[plan.mode].name.toUpperCase() : '' });
  const thumb = path.join(dir, `${name}-thumb.jpg`);
  fs.writeFileSync(thumb, tcv.toBuffer('image/jpeg', { quality: 0.92 }));
  // review stills
  const shots = [];
  { const c = DR.canvas(W, H), g = c.getContext('2d'), s0 = frameAt(plan, 0.01);
    if (plan.kingdoms.length > 2) DR.drawCrownSplit(g, s0, D.MODES[plan.mode].hook, 1);
    else drawDuelCard(g, s0, D.MODES[plan.mode].hook);
    shots.push(['0:00 face-off', c]); }
  for (const [label, t] of [['opening', 1.6], ['thumbnail moment', plan.thumbT], ['last orders', 56.5], ['the bell', 60]]) {
    const s = label === 'the bell' ? frameAt(plan, 99) : frameAt(plan, t), c = DR.canvas(W, H), g = c.getContext('2d');
    DR.drawWorld(g, s, plan.theme, s.t); DR.drawHUD(g, s, s.t, label === 'the bell' ? { at: s.t - 0.5, text: `THE BELL! ${(s.K[s.winner].short || s.K[s.winner].name)} RULES THE ISLAND`, kind: 'last' } : noticeAt(plan, s.t));
    shots.push([`${(s.t + 4.6).toFixed(1)} s · ${label}`, c]);
  }
  const sw = 324, sh = 576, pad = 14, sheet = DR.canvas(pad + shots.length * (sw + pad), sh + 2 * pad + 40), sg = sheet.getContext('2d');
  sg.fillStyle = '#0B0F1A'; sg.fillRect(0, 0, sheet.width, sheet.height);
  shots.forEach(([label, c], i) => { const x = pad + i * (sw + pad); sg.drawImage(c, x, pad, sw, sh); sg.font = 'italic 800 24px "Barlow Condensed"'; sg.fillStyle = '#E9EEF6'; sg.fillText(label.toUpperCase(), x + 4, pad + sh + 30); });
  const sheetPath = path.join(dir, `${name}-stills.jpg`);
  fs.writeFileSync(sheetPath, sheet.toBuffer('image/jpeg', { quality: 0.88 }));
  return { thumb, sheet: sheetPath };
}
// two kingdoms: a still of what faceoff.js (shared with Army Clash and Tower Clash) shows, top and bottom halves
function drawDuelCard(g, s, hook) {
  const FO = require('./faceoff.js');
  const W = DR.W, H = DR.H, K = s.K;
  const pic = kk => { const c = DR.canvas(420, 420), cg = c.getContext('2d'); cg.translate(210, 225); DR.portrait(cg, kk.champion, kk.key, 190); return c; };
  const E = require('./engine.js')._;
  const sides = K.map(kk => ({ col: E.PALETTES[D.KINGDOMS[kk.key].colour], name: kk.short || kk.name, sub: kk.motto, count: `${s.cellsOf(K.indexOf(kk)).length} TERRITORIES`, portrait: pic(kk) }));
  const bg = DR.canvas(W, H); DR.drawWorld(bg.getContext('2d'), s, 'thornvale', 0);
  const fo = { W, H, RS: 1, seed: s.seed, dur: 2.6, title: 'TERRITORY CLASH', tag: '', question: hook, sides, bg, battle0: bg };
  try { FO.drawFaceoff(g, 1.2, fo); } catch (e) { DR.drawCrownSplit(g, s, hook, 1); }
}
module.exports = { writeStills, frameAt };
