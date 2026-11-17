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
const FO = require('./faceoff.js');
const TSFX = require('./tc-sfx.js');
const rules = require('./rules.json');

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
    const line = s.how === 'bell' && s.margin === 0 ? 'LEVEL ON LAND: WON ON TROOPS' : plan.mode === 'ember' ? (s.underdogSurvived ? `${K[0].short || K[0].name} SURVIVED!` : `${K[0].short || K[0].name} FELL`) : s.how === 'conquest' ? 'THE WHOLE ISLAND' : '';
    if (line) { g.font = font(40); g.lineWidth = 8; g.strokeText(line, W / 2, 1450); g.fillStyle = WHITE; g.fillText(line, W / 2, 1450); }
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
    }
  }
  return ev;
}

async function main() {
  const t0 = Date.now();
  fs.mkdirSync(OUT, { recursive: true });
  const plan = choosePlan();
  const ks = plan.kingdoms, M = D.MODES[plan.mode];
  console.log(`${plan.date} ${plan.hour}:00 · ${M.name} · ${ks.join(', ')} · seed ${plan.seed} · tempo x${plan.tempo} · "${plan.title}"`);
  const newSim = () => new TCSim(plan.seed, { kingdoms: ks, mode: plan.mode, tempo: plan.tempo, underdogPower: plan.underdogPower });
  const stills = process.env.STILLS === '1', stillAt = (process.env.STILL_AT || '1,4,8,20,40,62,66.5').split(',').map(Number);
  const SECS = process.env.SECS ? Number(process.env.SECS) : Infinity;

  // the thumbnail, from a headless copy of the same battle
  if ((rules.thumbnail || {}).on !== false) {
    const st = newSim().runTo(plan.thumbT), cv = createCanvas(W, H);
    DR.setScale(1); DR.drawThumb(cv.getContext('2d'), st, plan.theme, { thumbQ: M.hook, tag: (D.MODES[plan.mode] || {}).name ? D.MODES[plan.mode].name.toUpperCase() : '' }); DR.setScale(RS);
    fs.writeFileSync(path.join(OUT, 'thumb.jpg'), cv.toBuffer('image/jpeg', { quality: 0.92 }));
  }

  const s = newSim();
  const canvas = createCanvas(W * RS, H * RS), ctx = canvas.getContext('2d');
  const synth = new RVB.Synth(SR, INTRO_S + WAKE_S + FIGHT + OUTRO_S + 6), SX = TSFX.make(synth);
  const MU = rules.music || {}, muOn = MU.on !== false;
  const styles = MU.styles || ['epic', 'ancient'];
  // the style turns with the slot and the day, so every slot hears each medieval style in turn
  const day = Math.floor(Date.parse((plan.date || '2026-11-17') + 'T00:00:00Z') / 864e5) || 0, style = styles[((plan.slot || 0) + day) % styles.length];
  const mp = muOn ? Music.plan(plan.seed, style) : null, mtr = muOn ? Music.tracker() : null;
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

  // ----- 1. the face-off -----
  const nIntro = Math.round(INTRO_S * FPS);
  if (nIntro) {
    // (Rellz, 2026-11-16: "the intro should be electric like the other two games") the electric face-off for every line-up:
    // two, three or four kingdoms in bands split by lightning seams, each champion alive in its ring, taunting the next
    const sides = s.K.map((k, i) => ({ col: E.PALETTES[k.colour], name: k.short || k.name, sub: k.motto, count: plan.mode === 'ember' ? `${s.cellsOf(i).length} ${s.cellsOf(i).length === 1 ? 'TERRITORY' : 'TERRITORIES'}` : '',
      portrait: (c, r, pose) => { c.rotate(pose.lean || 0); c.translate(0, -r * 0.04 - (pose.lunge || 0) * r * 0.05); DR.portrait(c, k.champion, k.key, r * 0.92); } }));
    const fo = { W, H, RS, seed: plan.seed, dur: INTRO_S, title: 'TERRITORY CLASH', tag: ((D.MODES[plan.mode] || {}).name || '').toUpperCase(), question: M.hook, sides, bg: bg1, battle0: b0 };
    FO.faceoffSounds(synth, INTRO_S, 0);
    for (let j = 0; j < nIntro && frameNo / FPS < SECS; j++) { ctx.setTransform(1, 0, 0, 1, 0, 0); FO.drawFaceoff(ctx, j / FPS, fo); await emit(); if (mtr) mtr.frame((j + 1) / FPS, { phase: 'intro', sfx: [] }); }
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
    if (!mixWav(synth, path.join(__dirname, 'sfx', `march-${cry + 1}.wav`), at - 0.04, 0.95)) synth.play({ type: 'roar' }, at);
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
      drawBars(ctx, kk < 0 ? t / atL : 1 - clamp01((t - (WAKE_S - 0.4)) / 0.4));
      drawWake(ctx, t, atL, WAKE_S, CRIES[cry], ks);
      await emit(); if (mtr) mtr.frame(frameNo / FPS, { phase: 'intro', sfx: [] });
    }
  }
  // ----- 3. the war: two fixed ticks a frame -----
  const fight0 = frameNo / FPS, ticksPerFrame = Math.round(1 / FPS / DT);
  let logAt = 0, firstKo = false, lastTick = 99;
  const shares = s.K.map((_, i) => s.cellsOf(i).length);
  while (!s.done && frameNo / FPS < SECS) {
    for (let q = 0; q < ticksPerFrame && !s.done; q++) s.tick();
    const tv = frameNo / FPS;
    const ev = sounds(synth, s, logAt, tv, SX); logAt = s.log.length;
    // the last five seconds: a clock tick each second, rising in pitch (drawn as the clock's beat in the HUD)
    { const left = FIGHT - s.t, sec = Math.ceil(left); if (left > 0 && sec <= 5 && sec !== lastTick) { lastTick = sec; SX.tick(tv, sec); } }
    if (!firstKo && ev.some(e => e.type === 'ko')) firstKo = true;
    s.K.forEach((_, i) => { shares[i] += (s.cellsOf(i).length - shares[i]) * 0.12; });
    let notice = null; for (const n of plan.notices) if (n.t <= s.t && s.t < n.t + ((rules.ui || {}).noticeSeconds || 2.2)) notice = { at: n.t, text: n.text, kind: n.kind };
    ctx.setTransform(RS, 0, 0, RS, 0, 0);
    DR.drawWorld(ctx, s, plan.theme, s.t); DR.drawHUD(ctx, s, s.t, notice, shares);
    await emit();
    if (mtr) mtr.frame(frameNo / FPS, { phase: 'fight', sfx: ev });
    if ((frameNo) % (FPS * 6) === 0) console.log(`${(frameNo / FPS).toFixed(0)} s of video after ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  if (!s.done) s.run();
  // ----- 4. the bell and the result, then the crossfade into the first frame (the loop) -----
  const nOut = Math.round(OUTRO_S * FPS), out0 = frameNo / FPS;
  // the end: a horn chord and falling stone for a conquest, the great church bell at the bell; then the victory sting
  if (s.how === 'conquest') SX.conquest(out0); else { SX.bell(out0, 131, 0.14); SX.bell(out0 + 0.02, 196, 0.06); }
  synth.play({ type: 'win' }, out0 + 0.4);
  const last = createCanvas(W * RS, H * RS), lc = last.getContext('2d'); lc.setTransform(RS, 0, 0, RS, 0, 0); DR.drawWorld(lc, s, plan.theme, s.t); DR.drawHUD(lc, s, s.t, null, s.K.map((_, i) => s.cellsOf(i).length));
  for (let j = 0; j < nOut && frameNo / FPS < SECS + OUTRO_S; j++) {
    const f = j / FPS;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(last, 0, 0); ctx.setTransform(RS, 0, 0, RS, 0, 0);
    drawResult(ctx, s, f, plan);
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
    const L = new Float32Array(frames), R = new Float32Array(frames);
    for (let i = 0; i < frames; i++) { L[i] = Math.tanh(synth.L[i] * gain); R[i] = Math.tanh(synth.R[i] * gain); }
    let mixed = { L, R };
    if (muOn) {
      const mus = Music.render(mp, { sr: SR, dur: DUR, cues: mtr.cues() });
      mixed = Music.mix(L, R, mus, { sr: SR, volume: MU.volume ?? 0.62, duck: MU.duck ?? 0.45, levels: MU.levels || null });
      console.log(`Music: ${mp.style}, ${mp.bpm} bpm`);
    }
    const wav = path.join(OUT, 'sound.wav'), final = path.join(OUT, 'territory-clash.mp4');
    writeWav(wav, mixed.L, mixed.R, frames);
    await ffmpeg(['-i', silent, '-i', wav, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-t', DUR.toFixed(3), '-movflags', '+faststart', final]).done;
    fs.rmSync(silent); fs.rmSync(wav);
  }
  // ----- title, description and tags (from the plan: true, never the result) -----
  const meta = { title: plan.title, description: plan.description, tags: plan.tags, planDate: plan.date, hour: plan.hour, slot: plan.slot, mode: plan.mode, kingdoms: ks,
    seed: plan.seed, tempo: plan.tempo, underdogPower: plan.underdogPower, theme: plan.theme, titleKind: plan.titleKind, winner: s.K[s.winner].name, winnerKey: s.K[s.winner].key,
    how: s.how, margin: s.margin, drama: plan.drama, seconds: +DUR.toFixed(1), music: mp ? mp.style : null };
  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 2));
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(0)} s: "${meta.title}"`);
}

main().catch(e => { console.error(e); process.exit(1); });
