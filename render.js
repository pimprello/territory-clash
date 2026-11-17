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
function drawWake(g, s, f, kingdoms) {
  // READY... while the capitals' crests rise, then MARCH! slams in with every kingdom's colour slashing across
  const at = 0.55;
  if (f < at) {
    const a = clamp01(f / 0.15) * (1 - clamp01((f - at + 0.08) / 0.08));
    g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(110);
    g.translate(W / 2, 960); g.scale(1 + 0.05 * f, 1 + 0.05 * f);
    g.lineJoin = 'round'; g.lineWidth = 14; g.strokeStyle = INK; g.strokeText('READY...', 0, 0); g.fillStyle = WHITE; g.fillText('READY...', 0, 0); g.restore();
  } else {
    const k = (f - at) / (1 - at), sl = back(k / 0.35), fade = 1 - clamp01((k - 0.8) / 0.2);
    kingdoms.forEach((key, i) => {
      const P0 = E.PALETTES[D.KINGDOMS[key].colour], y = 860 + (i - (kingdoms.length - 1) / 2) * 70, x = -1200 + 2600 * ease(k / 0.6) + (i % 2 ? 120 : 0);
      g.save(); g.globalAlpha = 0.85 * fade; g.translate(x, y); g.rotate(-0.08); g.fillStyle = P0.c; g.fillRect(-900, -18, 1800, 36); g.fillStyle = P0.l; g.fillRect(-900, -18, 1800, 8); g.restore();
    });
    g.save(); g.globalAlpha = fade; g.textAlign = 'center'; g.textBaseline = 'middle'; g.translate(W / 2, 960); g.rotate(-0.05); g.scale(sl * 1.05, sl * 1.05);
    g.font = font(190); g.lineJoin = 'round'; g.lineWidth = 22; g.strokeStyle = INK; g.strokeText('MARCH!', 0, 0); g.fillStyle = GOLD; g.fillText('MARCH!', 0, 0); g.restore();
  }
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
function sounds(synth, s, from, t0) {
  const ev = [];
  for (let i = from; i < s.log.length; i++) {
    const e = s.log[i], at = t0 + 0, c = e.cell != null ? s.cells[e.cell] : e.to != null ? s.cells[e.to] : null, pan = c ? (c.x - 540) / 600 : 0;
    const play = (type, extra) => { const x = Object.assign({ type, pan }, extra || {}); synth.play(x, at); ev.push(x); };
    switch (e.kind) {
      case 'order': play('swish'); break;
      case 'capture': play('clang'); if (e.k2 >= 0) play('ko'); break;
      case 'capital': play('boom', { gain: 1 }); play('crush'); break;
      case 'clash': play('clash'); break;
      case 'event': play('thunder'); break;
      case 'pact': play('bell'); break;
      case 'betrayal': play('shing'); play('stab'); break;
      case 'landless': play('groan'); break;
      case 'mercs': play('coin'); break;
      case 'dawn': play('powerup'); break;
      case 'lastOrders': play('drum'); break;
      case 'lead': play('pop'); break;
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
  if ((rules.thumbnail || {}).on !== false) {
    const st = newSim().runTo(plan.thumbT), cv = createCanvas(W, H);
    DR.setScale(1); DR.drawThumb(cv.getContext('2d'), st, plan.theme, { thumbQ: M.hook }); DR.setScale(RS);
    fs.writeFileSync(path.join(OUT, 'thumb.jpg'), cv.toBuffer('image/jpeg', { quality: 0.92 }));
  }

  const s = newSim();
  const canvas = createCanvas(W * RS, H * RS), ctx = canvas.getContext('2d');
  const synth = new RVB.Synth(SR, INTRO_S + WAKE_S + FIGHT + OUTRO_S + 6);
  const MU = rules.music || {}, muOn = MU.on !== false;
  const styles = MU.styles || ['epic', 'ancient'];
  const mp = muOn ? Music.plan(plan.seed, styles[plan.slot % styles.length], PK && PK.mapMusic !== false ? { map: plan.theme, festive: !!(HOL && HOL.key === 'christmas') } : {}) : null, mtr = muOn ? Music.tracker() : null;
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
    if (ks.length === 2) {
      const keepRS = RVB.RS; RVB.RS = 1;
      const sides = s.K.map((k, i) => ({ col: E.PALETTES[k.colour], name: k.short || k.name, sub: k.motto, count: `${s.cellsOf(i).length} TERRITORIES`,
        portrait: FO.portraitCanvas((c, r) => DR.portrait(c, k.champion, k.key, r), 210 * RS, 1) }));
      RVB.RS = keepRS;
      const fo = { W, H, RS, seed: plan.seed, dur: INTRO_S, title: 'TERRITORY CLASH', tag: '', question: M.hook, sides, bg: bg1, battle0: b0 };
      FO.faceoffSounds(synth, INTRO_S, 0);
      for (let j = 0; j < nIntro && frameNo / FPS < SECS; j++) { ctx.setTransform(1, 0, 0, 1, 0, 0); FO.drawFaceoff(ctx, j / FPS, fo); await emit(); if (mtr) mtr.frame((j + 1) / FPS, { phase: 'intro', sfx: [] }); }
    } else {
      FO.faceoffSounds(synth, INTRO_S, 0);
      // the crown-split face-off: the wedges slide in from the corners, then a white flash into the island
      const still = createCanvas(W * RS, H * RS), sc = still.getContext('2d');
      for (let j = 0; j < nIntro && frameNo / FPS < SECS; j++) {
        const t = j / FPS, k = ease(t / 0.45);
        ctx.setTransform(RS, 0, 0, RS, 0, 0);
        if (k < 1 || j === Math.ceil(0.45 * FPS)) { sc.setTransform(RS, 0, 0, RS, 0, 0); DR.drawCrownSplit(sc, s, M.hook, k); }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const z = 1 + 0.03 * clamp01(t / INTRO_S);
        ctx.save(); ctx.translate(W * RS / 2, H * RS / 2); ctx.scale(z, z); ctx.drawImage(still, -W * RS / 2, -H * RS / 2); ctx.restore();
        const fl = clamp01((t - (INTRO_S - 0.3)) / 0.3);
        if (fl > 0) { ctx.globalAlpha = fl; ctx.drawImage(b0, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = `rgba(255,255,255,${0.85 * Math.sin(fl * Math.PI)})`; ctx.fillRect(0, 0, W * RS, H * RS); }
        await emit(); if (mtr) mtr.frame((j + 1) / FPS, { phase: 'intro', sfx: [] });
      }
    }
  }
  // ----- 2. the map wakes: READY..., then MARCH! with the war cry -----
  const nWake = Math.round(WAKE_S * FPS), wake0 = frameNo / FPS;
  if (nWake) {
    for (const [f, t, d] of [[98, 0.05, 0.75], [147, 0.4, 0.5]]) synth.voice(wake0 + t, { dur: d + 0.5, gain: 0.11, attack: 0.09, partials: [1, 2, 3, 4, 5, 6].map(h => ({ f: f * h, f2: f * h * 1.012, a: 1 / h, decay: d * 0.9 })) });
    const at = wake0 + WAKE_S * 0.55;
    for (let tr = wake0 + 0.15; tr < at - 0.02; tr += Math.max(0.035, 0.16 - (tr - wake0) * 0.11)) synth.voice(tr, { dur: 0.08, gain: 0.05 + 0.13 * ((tr - wake0) / (at - wake0)), noise: { a: 1, decay: 0.025, lp: 0.45, hp: true } });
    synth.play({ type: 'boom', gain: 1.1 }, at);
    if (!mixWav(synth, path.join(__dirname, 'sfx', `charge-${1 + (plan.seed % 3)}.wav`), at - 0.04, 0.95)) synth.play({ type: 'roar' }, at);
    synth.play({ type: 'whoosh' }, wake0 + WAKE_S - 0.3);
    for (let j = 0; j < nWake && frameNo / FPS < SECS; j++) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(b0, 0, 0); ctx.setTransform(RS, 0, 0, RS, 0, 0);
      drawWake(ctx, s, j / nWake, ks);
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
  while (!s.done && frameNo / FPS < SECS) {
    for (let q = 0; q < ticksPerFrame && !s.done; q++) s.tick();
    const tv = frameNo / FPS;
    if (PK) for (let i = logAt; i < s.log.length; i++) {
      const e = s.log[i];
      if (e.kind === 'capture' || e.kind === 'capital') { pkCrowd.push({ t: tv, k: e.kind === 'capital' ? 2 : 1 }); if (!pkFirst && e.k2 != null) { pkFirst = true; pkCalls.push({ t: tv, kind: 'first' }); } }
      if (e.kind === 'capital') pkCalls.push({ t: tv, kind: 'titan' });
      if (e.kind === 'betrayal') pkCalls.push({ t: tv, kind: 'traitor' });
      if (e.kind === 'lead' && e.t > 20) pkCalls.push({ t: tv, kind: 'streak' });
      if (e.kind === 'pk' && PKC[e.what]) { pkCalls.push({ t: tv, kind: PKC[e.what] }); if (['split', 'walls', 'mimic'].includes(e.what)) pkCrowd.push({ t: tv, k: 2 }); }
    }
    const ev = sounds(synth, s, logAt, tv); logAt = s.log.length;
    // the last five seconds: a clock tick each second, rising in pitch (drawn as the clock's beat in the HUD)
    { const left = FIGHT - s.t, sec = Math.ceil(left); if (left > 0 && sec <= 5 && sec !== lastTick) { lastTick = sec; const fq = 1400 + (5 - sec) * 120; synth.voice(tv, { dur: 0.12, gain: 0.16, partials: [{ f: fq, decay: 0.03 }, { f: fq * 2.7, a: 0.3, decay: 0.015 }] }); } }
    if (!firstKo && ev.some(e => e.type === 'ko')) firstKo = true;
    s.K.forEach((_, i) => { shares[i] += (s.cellsOf(i).length - shares[i]) * 0.12; });
    let notice = null; for (const n of plan.notices) if (n.t <= s.t && s.t < n.t + ((rules.ui || {}).noticeSeconds || 2.2)) notice = { at: n.t, text: n.text, kind: n.kind };
    ctx.setTransform(RS, 0, 0, RS, 0, 0);
    DR.drawWorld(ctx, s, plan.theme, s.t); DR.drawSky(ctx, s, plan.theme, s.t, HOL && HOL.key); DR.drawHUD(ctx, s, s.t, notice, shares);
    if (RP && s.t > FIGHT * 0.5) { const c = RP.ring.length >= RP.n ? RP.ring.shift() : createCanvas(W * RS / 2, H * RS / 2); c.getContext('2d').drawImage(canvas, 0, 0, W * RS / 2, H * RS / 2); RP.ring.push(c); }
    await emit();
    if (mtr) mtr.frame(frameNo / FPS, { phase: 'fight', sfx: ev });
    if ((frameNo) % (FPS * 6) === 0) console.log(`${(frameNo / FPS).toFixed(0)} s of video after ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  if (!s.done) s.run();
  // ----- 4. the bell and the result, then the crossfade into the first frame (the loop) -----
  const nOut = Math.round(OUTRO_S * FPS), out0 = frameNo / FPS;
  if (s.how === 'conquest') { synth.play({ type: 'boom', gain: 1.1 }, out0); synth.play({ type: 'crush' }, out0 + 0.05); } else synth.play({ type: 'bell' }, out0);
  synth.play({ type: 'win' }, out0 + 0.4);
  const last = createCanvas(W * RS, H * RS), lc = last.getContext('2d'); lc.setTransform(RS, 0, 0, RS, 0, 0); DR.drawWorld(lc, s, plan.theme, s.t); DR.drawSky(lc, s, plan.theme, s.t, HOL && HOL.key); DR.drawHUD(lc, s, s.t, null, s.K.map((_, i) => s.cellsOf(i).length));
  if (PK) pkCalls.push({ t: out0, kind: 'end' });
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
      const bar = 120 * RS; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W * RS, bar); ctx.fillRect(0, H * RS - bar, W * RS, bar);
      ctx.setTransform(RS, 0, 0, RS, 0, 0); ctx.font = font(54); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#E11D48'; ctx.beginPath(); ctx.arc(70, 66, 13 * (0.75 + 0.25 * Math.cos(j * 0.35)), 0, Math.PI * 2); ctx.fill();
      ctx.lineJoin = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(8,11,20,0.9)'; ctx.strokeText('REPLAY', 100, 66); ctx.fillStyle = '#FFFFFF'; ctx.fillText('REPLAY', 100, 66);
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
    if (PK && (PK.commentator !== false || PK.crowd !== false)) {
      const said = Commentary.mix(synth.L, synth.R, { sr: SR, cues: PK.commentator !== false ? pkCalls : [], crowd: pkCrowd, seed: plan.seed, startAt: fight0 + 1, endAt: Math.min(DUR, out0 + 2.5),
        bed: PK.crowd !== false ? (PK.crowdBed ?? 0.075) / gain : 0, voice: (PK.voice ?? 0.62) / gain, max: PK.maxCalls ?? 8, gap: PK.callGap ?? 6 });
      console.log(`Commentator: ${said.length ? said.join(', ') : 'quiet'}; crowd ${PK.crowd !== false ? `on, ${pkCrowd.length} swells` : 'off'}`);
    }
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
  const meta = { title: Holiday.title(HOL, plan.title), description: HOL ? `${HOL.emoji} ${HOL.line}\n\n${plan.description}`.slice(0, 4900) : plan.description, tags: HOL ? [...new Set(plan.tags.concat(HOL.tags))] : plan.tags, holiday: HOL ? HOL.key : undefined, planDate: plan.date, hour: plan.hour, slot: plan.slot, mode: plan.mode, kingdoms: ks,
    seed: plan.seed, tempo: plan.tempo, underdogPower: plan.underdogPower, theme: plan.theme, titleKind: plan.titleKind, winner: s.K[s.winner].name, winnerKey: s.K[s.winner].key,
    how: s.how, margin: s.margin, drama: plan.drama, seconds: +DUR.toFixed(1), music: mp ? mp.style : null };
  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 2));
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(0)} s: "${meta.title}"`);
}

main().catch(e => { console.error(e); process.exit(1); });
