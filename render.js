// Territory Clash: makes one Short. The slot's battle (the same one its review package describes), filmed at 60 fps in 4K:
// the face-off, the map waking and MARCH!, sixty seconds of war, the bell and the result, then a crossfade into the first
// frame so the replay loops; with music.js's soundtrack and the battle's sounds.
// Output: out/territory-clash.mp4, out/thumb.jpg and out/meta.json (title, description and tags for the upload).
// SEED=<n> MODE=<mode> pick a battle by hand; SCALE=1 renders at 1080x1920; SECS=<n> stops after n seconds of video;
// STILLS=1 writes still frames to out/ instead of a video (STILL_AT=1,5,30 for video seconds).
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { once } = require('events');

const D = require('./tc-data.js');
const P = require('./pick.js');
const DR = require('./tc-draw.js');
const { TCSim, FIGHT, DT } = require('./tc-sim.js');
const { daySlots, readJsonl } = require('./plan-day.js');
const Music = require('./music.js');
const Commentary = require('./commentary.js');
const Holiday = require('./holiday.js'), HOL = Holiday.of();
// Rellz's picks (rules.picks, 2026-11-16, tc-picks.js): the battle reads them itself; here the looks, the replay, the MVP and the sound
// a holiday's look for the island (looks only: Christmas snow on the Frostwild, Halloween's Duskfen...)
const HOL_THEME = { christmas: 'frostwild', newyear: 'frostwild', newyearseve: 'frostwild', halloween: 'duskfen', easter: 'thornvale', stpatrick: 'thornvale', summer: 'saltreach', eidfitr: 'goldmarch', eidadha: 'goldmarch', bonfire: 'ashen' };
const FO = require('./faceoff.js');
const CO = require('./coldopen.js');
const TSFX = require('./tc-sfx.js');
const rules = require('./rules.json');
const PK = rules.picks && rules.picks.on && process.env.PICKS !== '0' ? rules.picks : null;

DR.init();
const RVB = require('./engine.js'), E = RVB._;
const VID = rules.video || {};
const FPS = 60, W = 1080, H = 1920, SR = 48000, RS = Math.max(1, Math.min(2, Number(process.env.SCALE || VID.scale || 1)));
RVB.RS = RS; DR.setScale(RS);
const INTRO_S = (rules.intro || {}).on !== false ? ((rules.intro || {}).seconds || 2.6) : 0;
const WAKE_S = (rules.wake || {}).on !== false ? ((rules.wake || {}).seconds || 2.0) : 0;
const OUTRO_S = VID.outroSeconds || 3;
const OUT = path.join(__dirname, 'out');
const { createCanvas } = require('canvas');
const TAU = Math.PI * 2;
const clamp01 = x => Math.max(0, Math.min(1, x));
const ease = x => 1 - Math.pow(1 - clamp01(x), 3);
const back = x => { x = clamp01(x); const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const INK = '#04060B', GOLD = '#FFD23F', WHITE = '#F4F6FB';
const { Cliff } = require('./cliffhanger.js');
const font = (s, w = 800) => `italic ${w} ${s}px "Barlow Condensed", "DejaVu Sans", sans-serif`;

// ----- which battle: the slot's (from the London date and the slot that has just started), or SEED/MODE by hand -----
function londonNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) };
}
function choosePlan() {
  const gap = (a, b) => E.colourGap(a, b);
  if (process.env.SEED) {
    const posted = readJsonl('videos.jsonl');
    const mode = process.env.MODE || 'war', kingdoms = process.env.KINGDOMS ? process.env.KINGDOMS.split(',') : undefined;
    return Object.assign(P.makeShort({ seed: Number(process.env.SEED) >>> 0, mode, kingdoms, past: posted, gap, slot: posted.length, palettes: E.PALETTES }), { date: londonNow().date, hour: londonNow().hour, slot: posted.length });
  }
  const now = londonNow(), hours = rules.schedule.hours;
  // the slot that has started most recently today (before the first one: the first one)
  const hour = hours.filter(h => h <= now.hour).pop() ?? hours[0];
  const day = daySlots(now.date), sl = day.find(x => x.hour === hour);
  // the earlier slots of the day count as "past" so the line-ups rotate exactly as the packages did
  const before = day.filter(x => x.hour < hour);
  const prev = [];
  for (const b of before) { const pl = P.makeShort({ seed: b.seed, mode: b.mode, past: sl.past.concat(prev), gap, slot: b.slot, palettes: E.PALETTES }); prev.push({ mode: b.mode, kingdoms: pl.kingdoms, titleKind: pl.titleKind }); }
  const plan = P.makeShort({ seed: sl.seed, mode: sl.mode, past: sl.past.concat(prev), gap, slot: sl.slot, palettes: E.PALETTES });
  return Object.assign(plan, { date: now.date, hour, slot: sl.slot });
}

function ffmpeg(args) {
  const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve, reject) => { p.on('error', reject); p.on('close', code => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`)))); });
  return { p, done };
}
function writeWav(file, L, R, frames) {
  const buf = Buffer.alloc(44 + frames * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + frames * 4, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(frames * 4, 40);
  for (let i = 0; i < frames; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(file, buf);
}
function mixWav(synth, file, at, gain) {
  try {
    const wav = fs.readFileSync(file);
    let o = 12; while (o < wav.length - 8 && wav.toString('ascii', o, o + 4) !== 'data') o += 8 + wav.readUInt32LE(o + 4);
    const ch = wav.readUInt16LE(22), n = wav.readUInt32LE(o + 4) / 2 / ch, s0 = Math.round(at * SR);
    for (let i = 0; i < n && s0 + i < synth.len; i++) { synth.L[s0 + i] += (wav.readInt16LE(o + 8 + i * 2 * ch) / 32768) * gain; synth.R[s0 + i] += (wav.readInt16LE(o + 8 + (i * ch + ch - 1) * 2) / 32768) * gain; }
    return true;
  } catch (e) { return false; }
}


// Territory Clash's own cinematic look (Rellz, 2026-11-21: "remove black bars and add your own cinematic effect"): no bars, but a
// candle-warm vignette pulling the eye to the middle, a soft golden grade, light falling in shafts from the top and dust drifting
// through it, like a scene lit through a castle window. a: 0..1 strength, t: the video clock (looks only)
function drawVignette(g, a, t) {
  if (a <= 0.01) return;
  g.save();
  const v = g.createRadialGradient(W / 2, H * 0.5, H * 0.22, W / 2, H * 0.5, H * 0.78); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.65, `rgba(0,0,0,${0.28 * a})`); v.addColorStop(1, `rgba(0,0,0,${0.7 * a})`);
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  g.restore();
}
function drawCinema(g, a, t, focus) {
  if (a <= 0.01) return;
  drawVignette(g, a, t);
  g.save(); g.globalCompositeOperation = 'lighter';
  // shafts of light from the upper left, swaying slowly
  for (let i = 0; i < 4; i++) {
    const x0 = 120 + i * 210 + Math.sin(t * 0.6 + i) * 30, w0 = 70 + 40 * ((i * 37) % 3);
    const lg = g.createLinearGradient(x0, 0, x0 + 520, H); lg.addColorStop(0, `rgba(255,250,235,${0.07 * a})`); lg.addColorStop(0.7, `rgba(255,250,235,${0.015 * a})`); lg.addColorStop(1, 'rgba(255,200,120,0)');
    g.fillStyle = lg; g.beginPath(); g.moveTo(x0, -10); g.lineTo(x0 + w0, -10); g.lineTo(x0 + w0 + 560, H); g.lineTo(x0 + 520, H); g.closePath(); g.fill();
  }
  // dust motes drifting in the light
  for (let i = 0; i < 46; i++) {
    const h1 = ((i * 7919) % 1000) / 1000, h2 = ((i * 104729) % 1000) / 1000, x = (h1 * W + t * (12 + 20 * h2)) % W, y = (h2 * H - t * (8 + 10 * h1) + H * 4) % H;
    const tw = 0.5 + 0.5 * Math.sin(t * (1 + h1 * 2) + i);
    g.fillStyle = `rgba(255,236,190,${0.5 * a * tw})`; g.beginPath(); g.arc(x, y, 1.5 + 2.5 * h2, 0, Math.PI * 2); g.fill();
  }
  g.restore();
  // a soft ring of light round the threatened capital
  if (focus) { g.save(); const r = 150 + 12 * Math.sin(t * 5); const gl = g.createRadialGradient(focus.x, focus.y, 20, focus.x, focus.y, r); gl.addColorStop(0, 'rgba(255,230,160,0)'); gl.addColorStop(0.75, `rgba(255,210,120,${0.16 * a})`); gl.addColorStop(1, 'rgba(255,210,120,0)'); g.fillStyle = gl; g.fillRect(focus.x - r, focus.y - r, r * 2, r * 2); g.restore(); }
}

// ----- the overlays drawn on top of the island -----
// the march (Rellz, 2026-11-16: "the march animation looks horrible with the rectangle lines, make it like army clash"):
// Army Clash's charge, move for move. The island holds under film bars with READY… while the camera eases in, then the war
// cry slams in with a flash, a shockwave, speed lines and each kingdom's colour slashing across behind the word, which
// trembles with the roar and rushes at the camera as the war starts. t: seconds into the wake. Looks only.
const CRIES = ['MARCH!', 'TO ARMS!', 'FOR THE CROWN!'];
function drawBars(g, a) { if (a <= 0) return; const h = 150 * ease(a); g.fillStyle = '#000'; g.fillRect(0, 0, W, h); g.fillRect(0, H - h, W, h); }
function drawWake(g, t, at, len, word, kingdoms) {
  const k = t - at, cx = W / 2, cy = 960;
  g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
  if (k < 0) {
    const a = clamp01(t / 0.35) * clamp01(-k / 0.15);
    g.globalAlpha = a; g.font = font(64); if ('letterSpacing' in g) g.letterSpacing = '12px';
    g.lineJoin = 'round'; g.lineWidth = 11; g.strokeStyle = 'rgba(8,11,20,0.92)'; g.strokeText('READY…', cx, cy + 3 * Math.sin(t * 5));
    g.fillStyle = '#F8FAFC'; g.fillText('READY…', cx, cy + 3 * Math.sin(t * 5)); if ('letterSpacing' in g) g.letterSpacing = '0px';
    g.restore(); return;
  }
  if (k < 0.16) { g.globalAlpha = 0.6 * (1 - k / 0.16); g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, H); }
  if (k < 0.7) {
    const r = 60 + ease(k / 0.7) * 620;
    g.globalAlpha = 0.75 * (1 - k / 0.7); g.beginPath(); g.ellipse(cx, cy, r, r * 0.62, 0, 0, TAU); g.lineWidth = 14 * (1 - k / 0.7) + 2; g.strokeStyle = '#FFF6D6'; g.stroke();
  }
  if (k < 0.9) {
    g.globalAlpha = 0.5 * (1 - k / 0.9); g.strokeStyle = '#FFFFFF'; g.lineCap = 'round';
    for (let i = 0; i < 28; i++) {
      const an = i * 2.399 + 0.3, r0 = 150 + ease(Math.min(1, k * 2.2)) * 260 + (i % 4) * 30, r1 = r0 + 90 + (i % 3) * 50;
      g.lineWidth = 2 + (i % 3); g.beginPath(); g.moveTo(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0 * 0.7); g.lineTo(cx + Math.cos(an) * r1, cy + Math.sin(an) * r1 * 0.7); g.stroke();
    }
  }
  const out = clamp01((t - (len - 0.3)) / 0.3), aOut = 1 - out, N = kingdoms.length;
  kingdoms.forEach((key, i) => {
    const P0 = E.PALETTES[D.KINGDOMS[key].colour], dirn = i % 2 ? 1 : -1, sl = 1 - ease((k - 0.03 * i) / 0.22), y = cy - 18 + (i - (N - 1) / 2) * 34;
    g.globalAlpha = 0.95 * aOut; g.save(); g.translate(cx + dirn * sl * 900, y); g.rotate(-0.07);
    g.beginPath(); g.moveTo(-430, -16); g.lineTo(450, -16); g.lineTo(430, 16); g.lineTo(-450, 16); g.closePath();
    g.fillStyle = P0.c; g.fill(); g.lineWidth = 4; g.strokeStyle = INK; g.stroke(); g.restore();
  });
  const sIn = 2.4 + (1 - 2.4) * back(k / 0.2), sc = sIn * (1 + 0.35 * out * out), tr = k < 0.6 ? (1 - k / 0.6) * 3 : 0;
  g.globalAlpha = clamp01(k / 0.05) * aOut;
  g.translate(cx + Math.sin(t * 61) * tr, cy + Math.cos(t * 53) * tr); g.rotate(-0.07); g.scale(sc, sc);
  let fz = 176; g.font = font(fz); while (g.measureText(word).width > 900 && fz > 90) { fz -= 4; g.font = font(fz); }
  if ('letterSpacing' in g) g.letterSpacing = '4px';
  g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 24; g.shadowOffsetY = 8;
  g.lineJoin = 'round'; g.lineWidth = 20; g.strokeStyle = INK; g.strokeText(word, 0, 0); g.fillStyle = WHITE; g.fillText(word, 0, 0);
  g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
  if (k < 0.5) { g.globalAlpha *= 1 - k / 0.5; g.lineWidth = 5; g.strokeStyle = GOLD; g.strokeText(word, 0, 0); }
  if ('letterSpacing' in g) g.letterSpacing = '0px';
  g.restore();
}
function drawResult(g, s, f, plan) {
  // THE BELL! slams in, then the winner's card: its crest, its name, RULES THE ISLAND, and every kingdom's count
  const K = s.K, win = s.winner, WK = K[win], P0 = E.PALETTES[WK.colour];
  const bell = back(f / 0.18), card = ease((f - 0.35) / 0.3), head = s.how === 'conquest' ? 'CONQUEST!' : 'THE BELL!';
  g.save(); g.fillStyle = `rgba(4,6,11,${0.55 * clamp01(f / 0.3)})`; g.fillRect(0, 0, W, H); g.restore();
  g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.save(); g.translate(W / 2, 560 - 90 * card); g.rotate(-0.04); g.scale(bell, bell); g.font = font(150); g.lineJoin = 'round'; g.lineWidth = 18; g.strokeStyle = INK; g.strokeText(head, 0, 0); g.fillStyle = s.how === 'conquest' ? GOLD : '#FF5A6E'; g.fillText(head, 0, 0); g.restore();
  if (card > 0) {
    g.globalAlpha = card; g.save(); g.translate(0, (1 - card) * 60);
    const rg = g.createRadialGradient(W / 2, 860, 20, W / 2, 860, 330); rg.addColorStop(0, `rgba(255,255,255,0.35)`); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 500, W, 700);
    DR.crest(g, WK.key, W / 2, 840, 230);
    g.font = font(WK.name.length > 12 ? 92 : 112); g.lineWidth = 14; g.strokeStyle = INK; g.strokeText(WK.name, W / 2, 1060); g.fillStyle = P0.l; g.fillText(WK.name, W / 2, 1060);
    g.font = font(64); g.lineWidth = 10; g.strokeText('RULES THE ISLAND', W / 2, 1150); g.fillStyle = GOLD; g.fillText('RULES THE ISLAND', W / 2, 1150);
    const order = s.rank, cw = Math.min(250, 940 / order.length);
    order.forEach((k, i) => {
      const x = W / 2 + (i - (order.length - 1) / 2) * cw, kk = K[k];
      g.globalAlpha = card * (k === win ? 1 : 0.8);
      DR.crest(g, kk.key, x, 1265, 70);
      // each count ticks up from nothing, the winner's last (the beat sheet's "tick up one by one")
      const sc = s.score(k), up = Math.round(sc * ease((f - 0.55 - (k === win ? 0.25 : 0)) / 0.9));
      g.font = font(54); g.lineWidth = 9; g.strokeText(String(up), x, 1345); g.fillStyle = WHITE; g.fillText(String(up), x, 1345);
      g.font = font(26, 700); g.lineWidth = 6; const nm = kk.short || kk.name; g.strokeText(nm, x, 1388, cw - 12); g.fillStyle = E.PALETTES[kk.colour].l; g.fillText(nm, x, 1388, cw - 12);
    });
    // confetti in the winner's colours, falling and turning (hashed, so the same battle always looks the same)
    g.globalAlpha = card;
    for (let i = 0; i < 70; i++) {
      const h = (n) => { let x = Math.sin((i + 1) * 127.1 + n * 311.7 + plan.seed % 1000) * 43758.5453; return x - Math.floor(x); };
      const x = h(1) * W + Math.sin(f * (1.5 + h(2) * 2) + h(3) * 6) * 40, y = -40 + (f - 0.4 - h(4) * 0.5) * (420 + h(5) * 380);
      if (y < -30 || y > H) continue;
      g.save(); g.translate(x, y); g.rotate(f * (3 + h(6) * 5) + h(7) * 6); g.scale(1, Math.cos(f * (4 + h(8) * 4) + h(9) * 6));
      g.fillStyle = [P0.l, P0.c, GOLD, WHITE][i % 4]; g.fillRect(-9, -5, 18, 10); g.restore();
    }
    const line = s.hillWin != null ? 'HELD THE HILL: KING OF THE HILL!' : s.how === 'bell' && s.margin === 0 ? 'LEVEL ON LAND: WON ON TROOPS' : plan.mode === 'ember' ? (s.underdogSurvived ? `${K[0].short || K[0].name} SURVIVED!` : `${K[0].short || K[0].name} FELL`) : s.how === 'conquest' ? 'THE WHOLE ISLAND' : '';
    if (line) { g.font = font(40); g.lineWidth = 8; g.strokeText(line, W / 2, 1450); g.fillStyle = WHITE; g.fillText(line, W / 2, 1450); }
    // (rules.picks.mvp) the MVP: the winner's hold that launched the most captures (then the most troops; no dice)
    if (PK && PK.mvp !== false) {
      const mv = s.cells.filter(c => c.owner === win && (c.pkCaps || 0) > 0).sort((a, b) => b.pkCaps - a.pkCaps || b.n - a.n || a.id - b.id)[0];
      const mk = ease((f - 0.9) / 0.35);
      if (mv && mk > 0) {
        g.save(); g.globalAlpha = card * mk; g.translate(0, (1 - mk) * 20);
        const label = `MVP · ${mv.name} · ${mv.pkCaps} CAPTURE${mv.pkCaps === 1 ? '' : 'S'}`; g.font = font(34); const w = Math.min(900, g.measureText(label).width + 60);
        g.beginPath(); { const x0 = W / 2 - w / 2, x1 = W / 2 + w / 2; g.moveTo(x0 + 28, 322); g.lineTo(x1 - 28, 322); g.arc(x1 - 28, 350, 28, -Math.PI / 2, Math.PI / 2); g.lineTo(x0 + 28, 378); g.arc(x0 + 28, 350, 28, Math.PI / 2, Math.PI * 1.5); g.closePath(); } g.fillStyle = 'rgba(4,6,11,0.9)'; g.fill(); g.lineWidth = 4; g.strokeStyle = GOLD; g.stroke();
        g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = 5; g.strokeStyle = INK; g.strokeText(label, W / 2, 352, 860); g.fillStyle = GOLD; g.fillText(label, W / 2, 352, 860); g.textBaseline = 'middle';
        g.restore();
      }
    }
    g.restore();
  }
  g.restore();
}

// the battle's sounds, from what happened since the last frame
function sounds(synth, s, from, t0, SX) {
  // Territory Clash's own medieval sounds (tc-sfx.js); the music still hears every event by its usual name
  const ev = [];
  for (let i = from; i < s.log.length; i++) {
    const e = s.log[i], at = t0, c = e.cell != null ? s.cells[e.cell] : e.to != null ? s.cells[e.to] : null, pan = c ? (c.x - 540) / 600 : 0;
    const tell = type => ev.push({ type, pan });
    switch (e.kind) {
      case 'order': SX.order(at, pan, i); tell('swish'); break;
      case 'capture': SX.capture(at, pan, i, e.k); tell('clang'); if (e.k2 >= 0) tell('ko'); break;
      case 'capital': SX.capital(at, pan); tell('boom'); tell('crush'); break;
      case 'clash': SX.clash(at, pan); tell('clash'); break;
      case 'event': synth.play({ type: 'thunder', pan }, at); tell('thunder'); break;
      case 'pact': SX.bell(at, 262, 0.07, pan); tell('bell'); break;
      case 'betrayal': synth.play({ type: 'shing', pan }, at); SX.clash(at + 0.05, pan); tell('stab'); break;
      case 'landless': SX.mourn(at, pan); tell('groan'); break;
      case 'mercs': synth.play({ type: 'coin', pan }, at); tell('coin'); break;
      case 'dawn': SX.call(at, pan); tell('powerup'); break;
      case 'lastOrders': SX.roll(at); tell('drum'); break;
      case 'lead': SX.herald(at, pan); tell('pop'); break;
      // (rules.warfare, tc-war.js)
      case 'ambush': synth.play({ type: 'swish', pan }, at); synth.play({ type: 'hit', pan }, at + 0.12); tell('stab'); break;
      case 'bridge': synth.play({ type: 'crush', pan }, at); synth.play({ type: 'boom', pan, gain: 0.6 }, at + 0.05); tell('crush'); break;
      case 'shipwreck': synth.play({ type: 'crush', pan }, at); tell('crush'); break;
      case 'duel': synth.play({ type: 'shing', pan }, at); SX.clash(at + 0.04, pan); tell('clash'); break;
      case 'mutiny': SX.mourn(at, pan); tell('groan'); break;
      case 'dynasty': SX.bell(at, 196, 0.08, pan); synth.play({ type: 'evolve', pan }, at + 0.2); tell('powerup'); break;
      case 'hostage': synth.play({ type: 'clang', pan }, at); tell('clang'); break;
      case 'rescue': synth.play({ type: 'shing', pan }, at); tell('powerup'); break;
      case 'ransom': case 'hire': synth.play({ type: 'coin', pan }, at); tell('coin'); break;
      case 'fortify': synth.play({ type: 'chop', pan, quiet: true }, at); break;
      case 'plague': SX.mourn(at, pan); break;
      case 'field': case 'harvestWon': synth.play({ type: 'evolve', pan }, at); break;
      case 'retreat': case 'help': SX.call(at, pan); break;
      case 'truce': case 'marriage': SX.bell(at, 262, 0.07, pan); SX.bell(at + 0.3, 330, 0.05, pan); tell('bell'); break;
    }
  }
  return ev;
}

async function main() {
  const t0 = Date.now();
  fs.mkdirSync(OUT, { recursive: true });
  const plan = choosePlan();
  const ks = plan.kingdoms, M = D.MODES[plan.mode];
  if (HOL && HOL_THEME[HOL.key] && D.THEMES[HOL_THEME[HOL.key]]) plan.theme = HOL_THEME[HOL.key];
  console.log(`${plan.date} ${plan.hour}:00 · ${M.name} · ${ks.join(', ')} · seed ${plan.seed} · tempo x${plan.tempo} · "${plan.title}"`);
  const newSim = () => new TCSim(plan.seed, { kingdoms: ks, mode: plan.mode, tempo: plan.tempo, underdogPower: plan.underdogPower });
  const stills = process.env.STILLS === '1', stillAt = (process.env.STILL_AT || '1,4,8,20,40,62,66.5').split(',').map(Number);
  const SECS = process.env.SECS ? Number(process.env.SECS) : Infinity;

  // the thumbnail, from a headless copy of the same battle
  let thumbCv = null;
  if ((rules.thumbnail || {}).on !== false) {
    const st = newSim().runTo(plan.thumbT), cv = createCanvas(W, H);
    DR.setScale(1); DR.drawThumb(cv.getContext('2d'), st, plan.theme, { thumbQ: M.hook, tag: (D.MODES[plan.mode] || {}).name ? D.MODES[plan.mode].name.toUpperCase() : '' }); DR.setScale(RS);
    fs.writeFileSync(path.join(OUT, 'thumb.jpg'), cv.toBuffer('image/jpeg', { quality: 0.92 }));
    thumbCv = cv;
  }

  const s = newSim();
  const canvas = createCanvas(W * RS, H * RS), ctx = canvas.getContext('2d');
  const synth = new RVB.Synth(SR, INTRO_S + WAKE_S + FIGHT + OUTRO_S + 12), SX = TSFX.make(synth);
  const MU = rules.music || {}, muOn = MU.on !== false;
  const styles = MU.styles || ['epic', 'ancient'];
  // the style turns with the slot and the day, so every slot hears each medieval style in turn; the island's look adds its
  // own instruments (rules.picks.mapMusic, festive at Christmas)
  // (Rellz, 2026-11-21: "make the music match the theme of the map") the medieval style comes from the island's look: two that
  // suit each map, the seed choosing between them, so a frozen island always sounds like the highlands and an ashen one like a crusade
  const MAP_STYLE = { ashen: ['crusade', 'highland'], frostwild: ['highland', 'court'], thornvale: ['tavern', 'highland'], goldmarch: ['court', 'crusade'], duskfen: ['court', 'crusade'], saltreach: ['tavern', 'court'] };
  const day = Math.floor(Date.parse((plan.date || '2026-11-17') + 'T00:00:00Z') / 864e5) || 0, ms = MAP_STYLE[plan.theme];
  const style = ms ? ms[plan.seed % 2] : styles[((plan.slot || 0) + day) % styles.length];
  const mp = muOn ? Music.plan(plan.seed, style, Object.assign({ human: MU.human !== false }, PK && PK.mapMusic !== false ? { map: plan.theme, festive: !!(HOL && HOL.key === 'christmas') } : {})) : null, mtr = muOn ? Music.tracker() : null;
  const silent = path.join(OUT, 'video-only.mp4');
  const enc = stills ? null : ffmpeg([
    '-f', 'rawvideo', '-pix_fmt', 'bgra', '-s', `${W * RS}x${H * RS}`, '-r', String(FPS), '-i', '-',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', RS > 1 ? '19' : '18', '-maxrate', RS > 1 ? '34M' : '12M', '-bufsize', RS > 1 ? '68M' : '24M',
    '-profile:v', 'high', '-level', RS > 1 ? '5.2' : '4.2', '-g', String(FPS * 2), '-fps_mode', 'cfr',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-r', String(FPS), silent,
  ]);
  let frameNo = 0, firstCv = null;
  const emit = async () => {
    const tv = frameNo / FPS;
    if (stills) { if (stillAt.some(x => Math.abs(tv - x) < 0.5 / FPS)) fs.writeFileSync(path.join(OUT, `still-${tv.toFixed(1).padStart(5, '0')}.png`), canvas.toBuffer('image/png')); }
    else { const fr = canvas.toBuffer('raw'); if (!enc.p.stdin.write(fr)) await once(enc.p.stdin, 'drain'); }
    if (frameNo === 0) { firstCv = createCanvas(W * RS, H * RS); firstCv.getContext('2d').drawImage(canvas, 0, 0); }
    frameNo++;
  };
  // the battle's first frame (behind the face-off, and its flash)
  const b0 = createCanvas(W * RS, H * RS), b0c = b0.getContext('2d'); b0c.setTransform(RS, 0, 0, RS, 0, 0); DR.drawWorld(b0c, s, plan.theme, 0); DR.drawHUD(b0c, s, 0, null);
  const bg1 = createCanvas(W, H); bg1.getContext('2d').drawImage(b0, 0, 0, W, H);

  // ----- 00. the thumbnail as the video's opening frames (Rellz, 2026-11-22: "thumbnails stopped working"). YouTube accepts the
  // uploaded thumbnail, but where it shows a Short (the Shorts shelf and feed, and any channel without custom Shorts thumbnails
  // yet) it uses a frame of the video, and since the cold open the first frame was a dark moment of the battle. So the video now
  // opens on the thumbnail itself for a blink (rules.thumbnail.leadSeconds, 0.25 s), then flashes white into the cold open. -----
  const LEAD = (rules.thumbnail || {}).leadSeconds ?? 0.25;
  if (thumbCv && LEAD > 0) {
    const nL = Math.round(LEAD * FPS), nF = Math.round(0.08 * FPS);
    for (let j = 0; j < nL + nF; j++) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(thumbCv, 0, 0, W * RS, H * RS);
      if (j >= nL) { ctx.fillStyle = `rgba(255,255,255,${(j - nL + 1) / nF})`; ctx.fillRect(0, 0, W * RS, H * RS); }
      await emit();
    }
    synth.play({ type: 'whoosh', gain: 0.6 }, (nL - 2) / FPS);
  }
  // ----- 0. the cold open (rules.coldOpen, coldopen.js: the same file in Army Clash, Tower Clash and Territory Clash; Rellz
  // 2026-11-17: "make an improved intro system for all 3 games"): the best few seconds of this very war, full screen with no
  // scoreboard or words. A headless copy scores every moment (captures, fallen capitals, mid-road clashes, betrayals, lead
  // changes, armies on the roads); the busiest stretch that doesn't give the winner away is played on a third copy, the camera
  // close on the action, then slowed, frozen on the hit, rewound to the start and flashed into the face-off. -----
  const CO_R = rules.coldOpen || {};
  if (CO_R.on !== false && SECS === Infinity) {
    const ct0 = Date.now(), h = newSim(), heat = [];
    let at = 0, lead = h.leader;
    while (!h.done) {
      h.tick(); h.tick();
      let v = 0;
      for (; at < h.log.length; at++) { const e = h.log[at]; v += { capture: 3, capital: 12, clash: 5, betrayal: 10, lead: 4, event: 6, landless: 8, order: e.n >= 30 ? 2 : 0.5 }[e.kind] || 0; }
      let fly = 0; for (const st of h.streams) fly += st.packets.length;
      heat.push([h.t, v + fly * 0.012]);
    }
    const W0 = h.winner, endT = h.endT;
    // never a moment where the eventual winner is clearly ahead (the cold open mustn't hint at the result)
    const spoil = t => { const p = h.snaps.filter(q => q.t <= t).pop(); if (!p) return false; return p.sc[W0] >= Math.max(...p.sc.filter((_, k) => k !== W0)) + 2; };
    const peakT = CO.pick(heat, { endT, minT: 6, tail: 4, spoil });
    if (peakT != null) {
      const CT = CO.make({ fps: FPS, seconds: CO_R.seconds || 3.4, rewind: CO_R.rewind !== false });
      const g3 = newSim(), t0 = Math.max(1, peakT - CT.lead);
      g3.runTo(t0);
      // where the action is: the armies on the roads (weighted to the busiest), and the holds that just changed hands
      const hot = sm => { let x = 0, y = 0, w = 0;
        for (const st of sm.streams) for (const d of st.packets) { const p = DR.streamPos(sm, st, d); x += p.x; y += p.y; w++; }
        for (const c of sm.cells) { const a = sm.t - c.flipT; if (a >= 0 && a < 1.2) { x += c.x * 12; y += c.y * 12; w += 12; } }
        return w ? DR.mapPt({ x: x / w, y: y / w }) : { x: 540, y: 960 }; };
      // the place the peak happens (a fourth copy run up to it), so the camera is already heading there
      const pk = hot(newSim().runTo(peakT));
      const KS = CO_R.sharp || 1.5, big = createCanvas(Math.round(W * RS * KS), Math.round(H * RS * KS)), bx = big.getContext('2d');
      const cold = new CO.ColdOpen(ctx, { fps: FPS, seconds: CT.seconds, rewind: CT.rewind, seed: plan.seed });
      // (Rellz, 2026-11-21: "remove black bars ... it doesn't look good for the cinematic effect, add your own") Territory Clash's
      // cold open keeps the shared camera work but drops the film bars, the colour split and the inverted frame for its own
      // castle-window light: the warm grade, shafts of light and dust (drawCinema), stronger in the slow motion
      cold.bars = () => {}; cold.split = () => {}; cold.impactFrame = () => {};
      cold.grade = f => { ctx.save(); ctx.setTransform(RS, 0, 0, RS, 0, 0); drawCinema(ctx, 0.55 + 0.45 * Math.exp(-(((f - CO.PEAK) / 0.12) ** 2)), f * CT.seconds, null); ctx.restore(); };
      let cam = hot(g3), acc = 0, logAt = g3.log.length;
      const SXc = TSFX.make(synth);
      for (let j = 0; j < CT.n; j++) {
        const f = j / CT.n;
        if (CT.live(j)) {
          const a = hot(g3), w = clamp01(1 - Math.abs(f - CO.PEAK) / 0.5) * 0.6 + 0.4, tx = a.x + (pk.x - a.x) * w, ty = a.y + (pk.y - a.y) * w;
          cam.x += (tx - cam.x) * 0.07; cam.y += (ty - cam.y) * 0.07;
          // a 9:16 window round the action, closer as it goes in (1.75x to 2.3x), kept on the board
          const zh = 1920 / (1.75 + 0.55 * ease(Math.min(1, f / 0.5))), zw = zh * 9 / 16;
          const cx = Math.max(zw / 2, Math.min(1080 - zw / 2, cam.x)), cy = Math.max(380 + zh / 2, Math.min(1540 - zh / 2, cam.y));
          bx.setTransform(RS * KS, 0, 0, RS * KS, 0, 0); bx.save(); bx.beginPath(); bx.rect(cx - zw / 2 - 40, cy - zh / 2 - 40, zw + 80, zh + 80); bx.clip(); DR.drawWorld(bx, g3, plan.theme, g3.t); bx.restore();
          const k = RS * KS; cold.frame(j, big, { sx: (cx - zw / 2) * k, sy: (cy - zh / 2) * k, sw: zw * k, sh: zh * k });
        } else cold.frame(j, null, null);
        await emit();
        if (CT.live(j)) { acc += CT.speed(f) * 2; while (acc >= 1 && !g3.done) { g3.tick(); acc -= 1; } sounds(synth, g3, logAt, frameNo / FPS, SXc); logAt = g3.log.length; }
        if (mtr) mtr.frame(frameNo / FPS, { phase: 'intro', sfx: [] });
      }
      CO.sounds(synth, 0, CT);
      console.log(`cold open: ${CT.seconds.toFixed(1)} s, peak ${peakT.toFixed(1)} s into the war, made in ${((Date.now() - ct0) / 1000).toFixed(0)} s`);
      if (process.env.COLD_ONLY) process.exit(0);
    }
  }
  const CO_S = frameNo / FPS;
  // ----- 1. the face-off -----
  const nIntro = Math.round(INTRO_S * FPS);
  if (nIntro) {
    // (Rellz, 2026-11-16: "the intro should be electric like the other two games") the electric face-off for every line-up:
    // two, three or four kingdoms in bands split by lightning seams, each champion alive in its ring, taunting the next
    const sides = s.K.map((k, i) => ({ col: E.PALETTES[k.colour], name: k.short || k.name, sub: k.motto, count: plan.mode === 'ember' ? `${s.cellsOf(i).length} ${s.cellsOf(i).length === 1 ? 'TERRITORY' : 'TERRITORIES'}` : '',
      portrait: (c, r, pose) => { c.rotate(pose.lean || 0); c.translate(0, -r * 0.04 - (pose.lunge || 0) * r * 0.05); DR.portrait(c, k.champion, k.key, r * 0.92); } }));
    const fo = { W, H, RS, seed: plan.seed, dur: INTRO_S, question: M.hook, sides, bg: bg1, battle0: b0 };
    FO.faceoffSounds(synth, INTRO_S, CO_S);
    for (let j = 0; j < nIntro && frameNo / FPS < SECS; j++) { ctx.setTransform(1, 0, 0, 1, 0, 0); FO.drawFaceoff(ctx, j / FPS, fo); await emit(); if (mtr) mtr.frame(frameNo / FPS, { phase: 'intro', sfx: [] }); }
  }
  // ----- 2. the map wakes: READY..., then MARCH! with the war cry -----
  const nWake = Math.round(WAKE_S * FPS), wake0 = frameNo / FPS;
  if (nWake) {
    for (const [f, t, d] of [[98, 0.05, 0.75], [147, 0.4, 0.5]]) synth.voice(wake0 + t, { dur: d + 0.5, gain: 0.11, attack: 0.09, partials: [1, 2, 3, 4, 5, 6].map(h => ({ f: f * h, f2: f * h * 1.012, a: 1 / h, decay: d * 0.9 })) });
    const at = wake0 + WAKE_S * 0.55;
    for (let tr = wake0 + 0.15; tr < at - 0.02; tr += Math.max(0.035, 0.16 - (tr - wake0) * 0.11)) synth.voice(tr, { dur: 0.08, gain: 0.05 + 0.13 * ((tr - wake0) / (at - wake0)), noise: { a: 1, decay: 0.025, lp: 0.45, hp: true } });
    synth.play({ type: 'boom', gain: 1.1 }, at);
    // the herald's cry (sfx/march-N.wav, picked by the seed) and the word on screen always match
    const cry = plan.seed % 3;
    if (!mixWav(synth, path.join(__dirname, 'sfx', `march-${cry + 1}.wav`), at - 0.04, 0.78)) synth.play({ type: 'roar' }, at);
    synth.play({ type: 'whoosh' }, wake0 + WAKE_S - 0.3);
    const atL = at - wake0, sm = x => x * x * (3 - 2 * x);
    for (let j = 0; j < nWake && frameNo / FPS < SECS; j++) {
      const t = j / FPS, kk = t - atL;
      // the camera: a slow push in on the island, a punch on the shout, a little shake with the roar
      const punch = kk > 0 ? 0.085 * Math.exp(-kk * 6) * Math.cos(kk * 14) + 0.03 * sm(Math.min(1, kk / 0.4)) * (1 - clamp01((t - (WAKE_S - 0.35)) / 0.35)) : 0;
      const z = 1 + 0.05 * sm(Math.min(1, t / atL)) * (kk > 0 ? 1 - sm(clamp01((t - (WAKE_S - 0.35)) / 0.35)) : 1) + punch;
      const sh = kk > 0 ? 7 * Math.exp(-kk * 4) : 0, sx = Math.sin(t * 57) * sh, sy = Math.cos(t * 49) * sh;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#04070D'; ctx.fillRect(0, 0, W * RS, H * RS);
      ctx.save(); ctx.translate(W * RS / 2 + sx * RS, H * RS / 2 + sy * RS); ctx.scale(z, z); ctx.drawImage(b0, -W * RS / 2, -H * RS / 2); ctx.restore();
      ctx.setTransform(RS, 0, 0, RS, 0, 0);
      // (Rellz, 2026-11-21: "remove black bars") no film bars: a warm vignette closes in on READY… instead
      drawVignette(ctx, (kk < 0 ? ease(t / atL) : 1 - clamp01((t - (WAKE_S - 0.4)) / 0.4)) * 0.8, t);
      drawWake(ctx, t, atL, WAKE_S, CRIES[cry], ks);
      await emit(); if (mtr) mtr.frame(frameNo / FPS, { phase: 'intro', sfx: [] });
    }
  }
  // ----- 3. the war: two fixed ticks a frame -----
  const fight0 = frameNo / FPS, ticksPerFrame = Math.round(1 / FPS / DT);
  let logAt = 0, firstKo = false, lastTick = 99;
  // (rules.picks) the commentator's cues and the crowd's swells, from the battle's log; the frames kept for the replay
  const pkCalls = [], pkCrowd = [], PKC = { split: 'split', traitor: 'traitor', ghost: 'spell', spell: 'spell', plague: 'spell', mimic: 'bighit', walls: 'gate', laststand: 'last', matchpoint: 'last', rats: 'bighit' };
  let pkFirst = false;
  const RP = PK && PK.replay !== false && !stills ? { n: Math.round((PK.replaySecs ?? 0.8) * FPS), ring: [] } : null;
  const shares = s.K.map((_, i) => s.cellsOf(i).length);
  // (Rellz, 2026-11-21: "if the base is getting attacked sometimes make a cinematic zoom to the base") from a headless copy, the
  // moments a capital falls; one or two of them (at least 12 s apart, never in the first 6 s or the last 4) get the cinema: the
  // camera glides in on the capital, the light goes warm and golden with dust in it, the blow lands in slow motion, then the war
  // runs a little fast while the camera pulls back, so the video's length and the battle itself never change.
  const CINE = [];
  if ((rules.cinema || {}).on !== false) {
    const hc = newSim(); hc.run();
    for (const e of hc.log) if (e.kind === 'capital' && e.t > 6 && e.t < FIGHT - 4 && (!CINE.length || e.t - CINE[CINE.length - 1].t >= 12)) CINE.push({ t: e.t, cell: e.cell });
    const keep = ((plan.seed >>> 3) % 4) === 0 ? 0 : ((plan.seed >>> 5) % 2) + 1;   // sometimes none, usually one, sometimes two
    CINE.splice(keep);
  }
  let camZ = 1, camX = W / 2, camY = H / 2, debt = 0, cineA = 0, cineFocus = null, cineIn = false;
  // ----- the cliffhanger ending (rules.cliffhanger, cliffhanger.js, the same in all three games; Rellz 2026-11-21: "instead of
  // fully ending and saying game over just end at the cliff hanger and say subscribe"): a headless copy finds when the war ends;
  // just before it (in the last seconds of the clock, or the moment before a conquest) the picture freezes and the Short ends on
  // WHO RULES THE ISLAND?! and SUBSCRIBE TO SEE THE ENDING. The war is then run to its end without drawing, for the records. -----
  const CLR = rules.cliffhanger || {};
  let cliffAt = Infinity, cliffed = false;
  if (CLR.on !== false && !stills || (CLR.on !== false && process.env.CLIFF === '1')) { const pre = newSim().run(); cliffAt = pre.t - (pre.how === 'conquest' ? (CLR.lead ?? 1.0) : (CLR.leadTime ?? 2.0)); }
  while (!s.done && frameNo / FPS < SECS) {
    const cn = CINE.find(c => s.t > c.t - 1.6 && s.t < c.t + 0.9), slow = CINE.some(c => s.t > c.t - 0.5 && s.t < c.t + 0.35);
    if (cn && !cineIn) { synth.play({ type: 'whoosh', gain: 0.8 }, frameNo / FPS); SX.roll(frameNo / FPS + 0.2); }
    cineIn = !!cn;
    let nt = ticksPerFrame; if (slow) nt = 1;   // the slow motion adds under a second to the video; no fast-forward after it (Rellz, 2026-11-22: "they go too fast")
    for (let q = 0; q < nt && !s.done; q++) s.tick();
    const tv = frameNo / FPS;
    if (PK) for (let i = logAt; i < s.log.length; i++) {
      const e = s.log[i];
      if (e.kind === 'capture' || e.kind === 'capital') { pkCrowd.push({ t: tv, k: e.kind === 'capital' ? 2 : 1 }); if (!pkFirst && e.k2 != null) { pkFirst = true; pkCalls.push({ t: tv, kind: 'first' }); } }
      if (e.kind === 'capital') pkCalls.push({ t: tv, kind: 'titan' });
      if (e.kind === 'betrayal') pkCalls.push({ t: tv, kind: 'traitor' });
      if (e.kind === 'lead' && e.t > 20) pkCalls.push({ t: tv, kind: 'streak' });
      if (e.kind === 'pk' && PKC[e.what]) { pkCalls.push({ t: tv, kind: PKC[e.what] }); if (['split', 'walls', 'mimic'].includes(e.what)) pkCrowd.push({ t: tv, k: 2 }); }
    }
    const ev = sounds(synth, s, logAt, tv, SX); logAt = s.log.length;
    // the last five seconds: a clock tick each second, rising in pitch (drawn as the clock's beat in the HUD)
    { const left = FIGHT - s.t, sec = Math.ceil(left); if (left > 0 && sec <= 5 && sec !== lastTick) { lastTick = sec; SX.tick(tv, sec); } }
    if (!firstKo && ev.some(e => e.type === 'ko')) firstKo = true;
    s.K.forEach((_, i) => { shares[i] += (s.cellsOf(i).length - shares[i]) * 0.12; });
    let notice = null; for (const n of plan.notices) if (n.t <= s.t && s.t < n.t + ((rules.ui || {}).noticeSeconds || 2.2)) notice = { at: n.t, text: n.text, kind: n.kind };
    // the camera: eases towards the capital (1.6x) during a cinema, back to the whole island after, kept on the picture
    if (cn) cineFocus = DR.mapPt(s.cells[cn.cell]);
    const zT = cn ? 1.6 : 1, fx = cn ? cineFocus.x : W / 2, fy = cn ? cineFocus.y : H / 2;
    camZ += (zT - camZ) * (cn ? 0.06 : 0.05); camX += (fx - camX) * 0.08; camY += (fy - camY) * 0.08; cineA += ((cn ? 1 : 0) - cineA) * 0.07;
    const vx = Math.max(W / (2 * camZ), Math.min(W - W / (2 * camZ), camX)), vy = Math.max(H / (2 * camZ), Math.min(H - H / (2 * camZ), camY));
    ctx.setTransform(RS * camZ, 0, 0, RS * camZ, RS * (W / 2 - vx * camZ), RS * (H / 2 - vy * camZ));
    DR.drawWorld(ctx, s, plan.theme, s.t);
    ctx.setTransform(RS, 0, 0, RS, 0, 0);
    // defensive reset: clear any leaked canvas state from drawWorld() so overlays are never invisible
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (cineA > 0.01) drawCinema(ctx, cineA, frameNo / FPS, cineFocus ? { x: W / 2 + (cineFocus.x - vx) * camZ, y: H / 2 + (cineFocus.y - vy) * camZ } : null);
    DR.drawSky(ctx, s, plan.theme, s.t, HOL && HOL.key); DR.drawHUD(ctx, s, s.t, notice, shares);
    if (RP && s.t > FIGHT * 0.5) { const c = RP.ring.length >= RP.n ? RP.ring.shift() : createCanvas(W * RS / 2, H * RS / 2); c.getContext('2d').drawImage(canvas, 0, 0, W * RS / 2, H * RS / 2); RP.ring.push(c); }
    await emit();
    if (mtr) mtr.frame(frameNo / FPS, { phase: 'fight', sfx: ev });
    if (s.t >= cliffAt) {
      cliffed = true;
      const still = createCanvas(W * RS, H * RS); still.getContext('2d').drawImage(canvas, 0, 0);
      const C = new Cliff({ W, H, RS, fps: FPS, seed: plan.seed, seconds: CLR.seconds || 3.4, question: 'WHO RULES?!', cta: ['SUBSCRIBE', 'TO SEE THE ENDING'], font });
      C.sounds(synth, frameNo / FPS);
      for (let j = 0; j < C.n; j++) { C.frame(ctx, j, still); if (stills && [40, 110, C.n - 2].includes(j)) fs.writeFileSync(path.join(OUT, `still-cliff-${j}.png`), canvas.toBuffer('image/png')); await emit(); if (mtr) mtr.frame(frameNo / FPS, { phase: 'fight', sfx: [] }); }
      s.run();
      console.log(`cliffhanger: froze at ${cliffAt.toFixed(1)} s (${s.K[s.winner].name} wins, ${s.how})`);
      break;
    }
    if ((frameNo) % (FPS * 6) === 0) console.log(`${(frameNo / FPS).toFixed(0)} s of video after ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  if (!s.done) s.run();
  // ----- 4. the bell and the result, then the crossfade into the first frame (the loop) -----
  const nOut = cliffed ? 0 : Math.round(OUTRO_S * FPS), out0 = frameNo / FPS;
  // the end: a horn chord and falling stone for a conquest, the great church bell at the bell; then the victory sting
  if (!cliffed) { if (s.how === 'conquest') SX.conquest(out0); else { SX.bell(out0, 131, 0.14); SX.bell(out0 + 0.02, 196, 0.06); }
  synth.play({ type: 'win' }, out0 + 0.4); }
  const last = createCanvas(W * RS, H * RS), lc = last.getContext('2d'); lc.setTransform(RS, 0, 0, RS, 0, 0); DR.drawWorld(lc, s, plan.theme, s.t); DR.drawSky(lc, s, plan.theme, s.t, HOL && HOL.key); DR.drawHUD(lc, s, s.t, null, s.K.map((_, i) => s.cellsOf(i).length));
  if (PK && !cliffed) pkCalls.push({ t: out0, kind: 'end' });
  // the replay (rules.picks.replay): the last moments at half speed over the start of the outro (1.2 s at most), then the result
  const RPN = RP && RP.ring.length >= 4 ? Math.min(RP.ring.length * 2, Math.round(1.2 * FPS)) : 0, RPF = 8;
  if (RPN) synth.play({ type: 'whoosh' }, out0);
  for (let j = 0; j < nOut && frameNo / FPS < SECS + OUTRO_S; j++) {
    const f = j / FPS;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(last, 0, 0); ctx.setTransform(RS, 0, 0, RS, 0, 0);
    const fr = RPN ? Math.max(0, f - (RPN - RPF / 2) / FPS) : f;
    if (!RPN || j >= RPN - RPF) drawResult(ctx, s, fr, plan);
    if (RPN && j < RPN + RPF) {
      // half speed (each kept frame twice) with a slow push in, film bars and a REPLAY tag, fading back into the result
      const st = RP.ring.length - RPN / 2, fi = RP.ring[Math.max(0, Math.min(RP.ring.length - 1, Math.floor(st + j / 2)))], a = j < RPN - RPF ? 1 : Math.max(0, 1 - (j - (RPN - RPF)) / (RPF * 2)), z = 1 + 0.06 * Math.min(1, j / RPN);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a;
      ctx.drawImage(fi, (W * RS - W * RS * z) / 2, (H * RS - H * RS * z) / 2, W * RS * z, H * RS * z);
      ctx.fillStyle = 'rgba(40,20,10,0.14)'; ctx.fillRect(0, 0, W * RS, H * RS);
      ctx.setTransform(RS, 0, 0, RS, 0, 0); drawVignette(ctx, 0.9, f); ctx.font = font(54); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#E11D48'; ctx.beginPath(); ctx.arc(70, 560, 13 * (0.75 + 0.25 * Math.cos(j * 0.35)), 0, Math.PI * 2); ctx.fill();
      ctx.lineJoin = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(8,11,20,0.9)'; ctx.strokeText('REPLAY', 100, 560); ctx.fillStyle = '#FFFFFF'; ctx.fillText('REPLAY', 100, 560);
      ctx.globalAlpha = 1; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    }
    const left = OUTRO_S - f;
    if (firstCv && left < 0.45 && MU.loop !== false) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = Math.min(1, (0.45 - left) / 0.4); ctx.drawImage(firstCv, 0, 0); ctx.globalAlpha = 1; }
    await emit();
    if (mtr) mtr.frame(frameNo / FPS, { phase: 'outro', sfx: [], outroLen: OUTRO_S, outroT: f });
  }
  const DUR = frameNo / FPS;
  console.log(`${frameNo} frames (${DUR.toFixed(1)} s) in ${((Date.now() - t0) / 1000).toFixed(0)} s; ${s.K[s.winner].name} wins (${s.how}, margin ${s.margin})`);
  if (!stills) {
    enc.p.stdin.end(); await enc.done;
    const frames = Math.round(SR * DUR), gain = (rules.sound || {}).sfx ?? 0.7;
    // the commentator and the crowd (rules.picks), into the effects before they're limited (music.levels matches them after)
    // (rules.picks.blend, all three games, Rellz 2026-11-23: "the narrator speaks too much it should be rare and blended into the
    // music ... mix it into the game music a bit more and maybe add some reverb") the voice on a bus of its own: faded, rounded
    // off, sent into a hall, landed on the beat, with the music dipping a little under it and the bus set from the music's level
    // (music.js levels.voice). Off: the voice goes into the effects as before.
    const BL = PK && PK.blend && PK.blend.on !== false ? PK.blend : null, vBus = BL ? { L: new Float32Array(synth.L.length), R: new Float32Array(synth.R.length) } : null, vDips = BL ? [] : null;
    if (PK && (PK.commentator !== false || PK.crowd !== false)) {
      const said = Commentary.mix(synth.L, synth.R, { sr: SR, cues: PK.commentator !== false ? pkCalls : [], crowd: pkCrowd, seed: plan.seed, startAt: fight0 + 1, endAt: Math.min(DUR, out0 + 2.5),
        bed: PK.crowd !== false ? (PK.crowdBed ?? 0.075) / gain : 0, voice: (PK.voice ?? 0.62) / gain, max: PK.maxCalls ?? 8, gap: PK.callGap ?? 6 ,
        ...(BL ? { bus: vBus, fade: BL.fade || [0.06, 0.35], wet: BL.wet ?? 0.4, soft: BL.soft !== false, beat: mp && BL.onBeat !== false ? mp.beat : 0, dips: vDips } : {}) });
      console.log(`Commentator: ${said.length ? said.join(', ') : 'quiet'}; crowd ${PK.crowd !== false ? `on, ${pkCrowd.length} swells` : 'off'}`);
    }
    const L = new Float32Array(frames), R = new Float32Array(frames);
    for (let i = 0; i < frames; i++) { L[i] = Math.tanh(synth.L[i] * gain); R[i] = Math.tanh(synth.R[i] * gain); }
    if (vBus && !muOn) for (let i = 0; i < frames; i++) { L[i] = Math.tanh(L[i] + (vBus.L[i] || 0) * gain); R[i] = Math.tanh(R[i] + (vBus.R[i] || 0) * gain); }
    let mixed = { L, R };
    if (muOn) {
      const mus = Music.render(mp, { sr: SR, dur: DUR, cues: mtr.cues() });
      mixed = Music.mix(L, R, mus, { sr: SR, volume: MU.volume ?? 0.62, duck: MU.duck ?? 0.45, levels: MU.levels || null,
        ...(vBus ? { voice: { L: vBus.L.map(v => v * gain), R: vBus.R.map(v => v * gain) }, dips: vDips, dipDb: BL.dipDb ?? -3 } : {}) });
      if (cliffed) { const fo = Math.round(SR * 0.9); for (let k = 0; k < fo; k++) { const f = frames - fo + k, g = 1 - k / fo; if (f >= 0) { mixed.L[f] *= g * g; mixed.R[f] *= g * g; } } }
      console.log(`Music: ${mp.style}, ${mp.bpm} bpm`);
    }
    const wav = path.join(OUT, 'sound.wav'), final = path.join(OUT, 'territory-clash.mp4');
    writeWav(wav, mixed.L, mixed.R, frames);
    await ffmpeg(['-i', silent, '-i', wav, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-t', DUR.toFixed(3), '-movflags', '+faststart', final]).done;
    fs.rmSync(silent); fs.rmSync(wav);
  }
  // ----- title, description and tags (from the plan: true, never the result) -----
  const meta = { title: Holiday.title(HOL, plan.title), description: HOL ? `${HOL.emoji} ${HOL.line}\n\n${plan.description}`.slice(0, 4900) : plan.description, tags: HOL ? [...new Set(plan.tags.concat(HOL.tags))] : plan.tags, holiday: HOL ? HOL.key : undefined, planDate: plan.date, hour: plan.hour, slot: plan.slot, mode: plan.mode, kingdoms: ks,
    seed: plan.seed, tempo: plan.tempo, underdogPower: plan.underdogPower, theme: plan.theme, titleKind: plan.titleKind, winner: s.K[s.winner].name, winnerKey: s.K[s.winner].key,
    how: s.how, margin: s.margin, drama: plan.drama, seconds: +DUR.toFixed(1), music: mp ? mp.style : null };
  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 2));
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(0)} s: "${meta.title}"`);
}

main().catch(e => { console.error(e); process.exit(1); });
