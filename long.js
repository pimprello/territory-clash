// Long-form videos (2026-11-28, Rellz: "make longs that are posted once every 3 days with cool thumbnail ... for all three").
// The same file in all three games; the game is told by the folder (or LONG_GAME). One long video = BATTLES brand-new battles
// played to their REAL endings (the Shorts stop on the cliffhanger, so this is where the answers are), one after another, in
// 16:9 (1920x1080): the vertical battle sharp in the middle, a blurred, darkened copy of it filling the sides, and two panels:
//   left   BATTLE 3/7, who fights, "PAUSE & PICK A WINNER", a tally to keep in the comments
//   right  the results of the battles already shown (never the current one) and a subscribe pill
// then a 12-second outro card laid out for YouTube's end screen (two video tiles left and right, subscribe in the middle: the
// end-screen elements themselves are set in YouTube Studio, the upload API can't). Chapters (0:00 Battle 1 ...) go in the
// description. A 1280x720 thumbnail in the channel's own look (Army Clash: war poster, Tower Clash: siege, Territory Clash:
// royal map) from three of the battles' own thumbnails. Writes out/<game>.mp4, out/thumb.jpg and out/meta.json, the same
// files the Shorts use, so upload.js uploads it unchanged; out/long.json has the record for longs.jsonl.
// BATTLES=<n> (default rules.long.battles or 7), SECS=<n> for a quick test with short battles, LONG_N=<n> picks the rotation.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { createCanvas, loadImage, registerFont } = require('canvas');
registerFont(path.join(__dirname, 'fonts/BarlowCondensed-ExtraBoldItalic.ttf'), { family: 'Barlow Condensed', weight: '800', style: 'italic' });
registerFont(path.join(__dirname, 'fonts/BarlowCondensed-Bold.ttf'), { family: 'Barlow Condensed', weight: '700', style: 'normal' });

const ROOT = __dirname, OUT = path.join(ROOT, 'out'), WORK = path.join(ROOT, 'out', 'long');
const rules = JSON.parse(fs.readFileSync(path.join(ROOT, 'rules.json'), 'utf8')), L = rules.long || {};
const GAME = process.env.LONG_GAME || ['army-clash', 'tower-clash', 'territory-clash'].find(g => path.basename(ROOT).includes(g) || (require('./package.json').name || '').startsWith(g)) || 'army-clash';
const readJsonl = f => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean); } catch (e) { return []; } };
const LONGS = readJsonl('longs.jsonl'), NLONG = process.env.LONG_N ? Number(process.env.LONG_N) : LONGS.length, POSTED = readJsonl('videos.jsonl').length;
const N = Number(process.env.BATTLES || L.battles || 7);
const FONT = '"Barlow Condensed", "Arial Narrow", Arial, sans-serif';
const font = (size, weight = 800, italic = true) => `${italic ? 'italic ' : ''}${weight} ${size}px ${FONT}`;
const INK = '#05070D', WHITE = '#F4F6FB', GOLD = '#FFD23F';
const hash = (n, k = 0) => (((n * 2654435761) ^ (k * 1597334677)) >>> 0);

// ----- each game: its look, its battles, its words -----
const GAMES = {
  'army-clash': {
    name: 'ARMY CLASH', file: 'army-clash.mp4', a: '#E0263C', b: '#2563EB', accent: GOLD, bg: ['#1A0B12', '#0B1230'],
    // a mix of dream specials, invented match-ups, the hand-made line-ups and a three-way war
    battles: n => {
      const SP = (() => { try { return require('./specials.js'); } catch (e) { return []; } })();
      const out = [];
      for (let i = 0; i < n; i++) {
        const kind = ['special', 'wild', 'list', 'special', 'three', 'wild', 'special'][i % 7];
        if (kind === 'special' && SP.length) out.push({ SPECIAL: SP[(NLONG * 3 + out.filter(x => x.SPECIAL).length + 5) % SP.length].id });
        else if (kind === 'wild') out.push({ WILD: '1' });
        else if (kind === 'three') out.push({ THREE: '1' });
        else out.push({ MATCHUP: String(POSTED + 11 + i * 7 + NLONG * 13) });
      }
      return out;
    },
    titles: n => [`${n} INSANE Army Battles... Can You Guess Every Winner? 🤯`, `${n} Battles, ${n} Endings You WON'T Predict 😱`, `I Made ${n} Armies Fight... Who Won? ⚔️ (Full Endings)`, `Guess The Winner: ${n} EPIC Army Battles 🏆`],
    hook: 'Every battle from the channel, played to the very end this time. Pause before each one and pick a winner; keep score in the comments!',
    tags: ['army battle', 'battle simulation', 'army simulation', 'who wins', 'army clash', 'epic battle', 'full battle', 'battle compilation', 'guess the winner', 'strategy game', 'clash game', 'clash universe'],
    hashtags: '#armyclash #battlesimulation #whowins #epicbattle #clashuniverse',
  },
  'tower-clash': {
    name: 'TOWER CLASH', file: 'tower-clash.mp4', a: '#FF7A1F', b: '#22D3EE', accent: '#FFB347', bg: ['#2A0606', '#0C0404'],
    battles: n => Array.from({ length: n }, (_, i) => ({ SLOT: String(POSTED + 17 + i * 5 + NLONG * 11) })),
    titles: n => [`${n} Bases. ${n} Bosses. How Many Survive? 🏰`, `Can The Base Survive? ${n} Sieges With FULL Endings 😱`, `${n} Tower Defense Battles... Guess Which Bases Fall 🤔`, `Survive Or Fall? ${n} EPIC Sieges 🏰🔥`],
    hook: 'Every siege played to the very end this time. Pause before each one: will the base survive or fall? Keep score in the comments!',
    tags: ['tower defense', 'tower defence', 'will the base survive', 'tower clash', 'battle simulation', 'strategy game', 'tower defense compilation', 'boss battle', 'full battle', 'clash game', 'clash universe'],
    hashtags: '#towerdefense #towerclash #willthebasesurvive #strategygame #clashuniverse',
  },
  'territory-clash': {
    name: 'TERRITORY CLASH', file: 'territory-clash.mp4', a: '#C8921E', b: '#B91C1C', accent: '#FFE08A', bg: ['#3A2810', '#140C04'], parchment: true,
    battles: n => { const M = ['war', 'three', 'feud', 'pact', 'crown', 'ember', 'war']; return Array.from({ length: n }, (_, i) => ({ MODE: M[(i + NLONG) % M.length], SLOT: String(POSTED + 13 + i * 3 + NLONG * 7) })); },
    titles: n => [`${n} Kingdom Wars... Who Rules The Map? 👑 (Full Endings)`, `${n} Wars For The Same Island 🗺️ Guess Every Winner!`, `Only ONE Kingdom Wins Each War... ${n} Wars 👑`, `${n} Map Wars With Endings You WON'T Predict 😱`],
    hook: 'Every war played to the very end this time. Pause before each one and pick the kingdom that rules the island; keep score in the comments!',
    tags: ['territory war', 'territory clash', 'map game', 'kingdom war', 'conquest', 'who wins', 'strategy game', 'map conquest', 'full battle', 'clash game', 'clash universe'],
    hashtags: '#territoryclash #mapgame #kingdoms #whowins #clashuniverse',
  },
};
const G = GAMES[GAME];

const sh = (cmd, args, opts = {}) => { const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts }); return r.status === 0; };
const probe = f => Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout.trim()) || 0;
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function fit(g, text, max, size, weight = 800, italic = true) { let z = size; g.font = font(z, weight, italic); while (z > 14 && g.measureText(text).width > max) { z -= 2; g.font = font(z, weight, italic); } return z; }
function out(g, text, x, y, fill, lw, align = 'center') { g.textAlign = align; g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = INK; g.strokeText(text, x, y); g.fillStyle = fill; g.fillText(text, x, y); }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function wrap(g, text, max) { const ws = text.split(' '), lines = []; let cur = ''; for (const w of ws) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > max && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines; }

// ----- 1) the battles -----
function renderBattles() {
  fs.mkdirSync(WORK, { recursive: true });
  const plan = G.battles(N), done = [];
  plan.forEach((env0, i) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const seed = hash(NLONG * 1000 + i * 37 + attempt * 7919 + 12345) % 2147483647;
      const env = { ...process.env, ...env0, SEED: String(seed), LONG: '1', SCALE: '1' };
      console.log(`\n=== battle ${i + 1}/${plan.length}: ${JSON.stringify(env0)} seed ${seed}${attempt ? ' (retry)' : ''} ===`);
      for (const f of [G.file, 'meta.json', 'thumb.jpg']) fs.rmSync(path.join(OUT, f), { force: true });
      if (sh('node', ['render.js'], { cwd: ROOT, env }) && fs.existsSync(path.join(OUT, G.file)) && fs.existsSync(path.join(OUT, 'meta.json'))) {
        const k = done.length;
        fs.renameSync(path.join(OUT, G.file), path.join(WORK, `b${k}.mp4`));
        fs.renameSync(path.join(OUT, 'meta.json'), path.join(WORK, `m${k}.json`));
        if (fs.existsSync(path.join(OUT, 'thumb.jpg'))) fs.renameSync(path.join(OUT, 'thumb.jpg'), path.join(WORK, `t${k}.jpg`));
        done.push(JSON.parse(fs.readFileSync(path.join(WORK, `m${k}.json`), 'utf8')));
        break;
      }
      console.log(`::warning title=Long-form::battle ${i + 1} failed${attempt ? ', skipped' : ', trying another seed'}`);
    }
  });
  if (done.length < Math.min(4, N)) throw new Error(`only ${done.length} battles rendered`);
  return done;
}

// ----- 2) the panels round each battle -----
function backdrop(g, W, H) {
  const lg = g.createLinearGradient(0, 0, W, H); lg.addColorStop(0, G.bg[0]); lg.addColorStop(1, G.bg[1]); g.fillStyle = lg; g.fillRect(0, 0, W, H);
}
// the battle's window: the vertical video cropped to the part that has the game in it (y 170-1610: the strips kept clear for
// YouTube's buttons on a phone are empty here) and scaled to the full height
const CROP_Y = 170, CROP_H = 1440, WIN_W = Math.round(1080 * 1080 / CROP_H / 2) * 2, WIN_X = Math.round((1920 - WIN_W) / 4) * 2;
function panel(metas, i) {
  const W = 1920, H = 1080, c = createCanvas(W, H), g = c.getContext('2d'), n = metas.length, m = metas[i];
  const PW = WIN_X - 60, LX = 30, RX = WIN_X + WIN_W + 30, LC = LX + PW / 2, RC = RX + PW / 2;
  const card = (x, y, w, h) => { rr(g, x, y, w, h, 22); g.fillStyle = 'rgba(6,8,14,0.8)'; g.fill(); g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,0.14)'; g.stroke(); };
  // a glowing frame round the battle's window
  g.save(); g.shadowColor = G.a; g.shadowBlur = 30; g.lineWidth = 6; g.strokeStyle = G.accent; g.strokeRect(WIN_X - 3, -10, WIN_W + 6, H + 20); g.restore();
  // left: which battle, who fights, the call to pick
  card(LX, 60, PW, 960);
  g.textBaseline = 'middle';
  fit(g, G.name, PW - 120, 50); spacedText(g, G.name, LC, 125, G.accent);
  fit(g, `BATTLE ${i + 1} / ${n}`, PW - 60, 100); out(g, `BATTLE ${i + 1} / ${n}`, LC, 235, WHITE, 14);
  const parts = (m.matchup || '').toUpperCase().split(' VS ');
  let y = 350;
  parts.forEach((p, k) => {
    g.font = font(50); const lines = wrap(g, p, PW - 70);
    for (const ln of lines.slice(0, 2)) { fit(g, ln, PW - 60, 50); out(g, ln, LC, y, ['#FCA5A5', '#93C5FD', '#86EFAC', '#FDE68A'][k % 4], 9); y += 54; }
    if (k < parts.length - 1) { g.font = font(42); out(g, 'VS', LC, y, G.accent, 9); y += 54; }
  });
  y = Math.max(y + 30, 720);
  rr(g, LX + 30, y, PW - 60, 104, 18); g.fillStyle = G.a; g.fill(); g.lineWidth = 5; g.strokeStyle = INK; g.stroke();
  fit(g, 'PAUSE & PICK A WINNER!', PW - 100, 50); out(g, 'PAUSE & PICK A WINNER!', LC, y + 53, WHITE, 9);
  fit(g, 'Keep your score in the comments', PW - 60, 30, 700, false); g.fillStyle = 'rgba(244,246,251,0.85)'; g.textAlign = 'center';
  g.fillText('Keep your score in the comments', LC, y + 160);
  // right: the results of the battles already shown (never this one's)
  card(RX, 60, PW, 960);
  fit(g, 'RESULTS SO FAR', PW - 80, 54); out(g, 'RESULTS SO FAR', RC, 125, WHITE, 10);
  const shown = metas.slice(0, i), rowH = Math.min(112, 690 / Math.max(1, n - 1));
  if (!shown.length) { fit(g, 'The first one starts now...', PW - 60, 38, 700, false); g.fillStyle = 'rgba(244,246,251,0.6)'; g.textAlign = 'center'; g.fillText('The first one starts now...', RC, 230); }
  shown.forEach((p, k) => {
    const ry = 185 + k * rowH, rh = rowH - 12;
    rr(g, RX + 20, ry, PW - 40, rh, 14); g.fillStyle = 'rgba(255,255,255,0.07)'; g.fill();
    g.font = font(30); g.fillStyle = G.accent; g.textAlign = 'left'; g.fillText(`${k + 1}`, RX + 38, ry + rh / 2);
    const tx = (p.result || '').toUpperCase(); fit(g, tx, PW - 110, 32); g.fillStyle = WHITE; g.fillText(tx, RX + 74, ry + rh / 2);
  });
  rr(g, RX + 30, 922, PW - 60, 72, 36); g.fillStyle = '#E0262B'; g.fill(); g.lineWidth = 5; g.strokeStyle = INK; g.stroke();
  fit(g, 'SUBSCRIBE FOR DAILY BATTLES', PW - 110, 34); out(g, 'SUBSCRIBE FOR DAILY BATTLES', RC, 959, WHITE, 7);
  return c.toBuffer('image/png');
}
function spacedText(g, text, x, y, fill) { g.textAlign = 'center'; if ('letterSpacing' in g) g.letterSpacing = '8px'; out(g, text, x, y, fill, 8); if ('letterSpacing' in g) g.letterSpacing = '0px'; }

function outroCard(metas) {
  const W = 1920, H = 1080, c = createCanvas(W, H), g = c.getContext('2d');
  backdrop(g, W, H);
  g.save(); g.globalAlpha = 0.12; g.fillStyle = '#FFFFFF'; g.translate(W / 2, H / 2);
  for (let k = 0; k < 28; k++) { g.rotate(Math.PI * 2 / 28); g.beginPath(); g.moveTo(0, 0); g.lineTo(-70, -1400); g.lineTo(70, -1400); g.closePath(); g.fill(); }
  g.restore();
  g.textBaseline = 'middle';
  fit(g, 'HOW MANY DID YOU GET RIGHT?', 1500, 96); out(g, 'HOW MANY DID YOU GET RIGHT?', W / 2, 140, WHITE, 16);
  fit(g, `Comment your score out of ${metas.length} ⬇`, 1200, 48, 700, false); g.fillStyle = G.accent; g.textAlign = 'center'; g.fillText(`Comment your score out of ${metas.length} ⬇`, W / 2, 230);
  // room for YouTube's end screen: two video tiles (left, right) and the subscribe button (middle)
  for (const x of [120, 1180]) { rr(g, x, 380, 620, 349, 18); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fill(); g.lineWidth = 5; g.setLineDash([18, 12]); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.stroke(); g.setLineDash([]); }
  g.font = font(40, 700, false); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillText('WATCH NEXT', 430, 555); g.fillText('BEST BATTLE', 1490, 555);
  g.beginPath(); g.arc(W / 2, 555, 120, 0, Math.PI * 2); g.fillStyle = '#E0262B'; g.fill(); g.lineWidth = 8; g.strokeStyle = INK; g.stroke();
  fit(g, 'SUBSCRIBE', 200, 50); out(g, 'SUBSCRIBE', W / 2, 555, WHITE, 8);
  fit(g, 'New battles every day on Army Clash · Tower Clash · Territory Clash', 1600, 40, 700, false); g.fillStyle = 'rgba(244,246,251,0.85)'; g.fillText('New battles every day on Army Clash · Tower Clash · Territory Clash', W / 2, 860);
  fit(g, G.name, 600, 70); spacedText(g, G.name, W / 2, 960, G.accent);
  return c.toBuffer('image/png');
}

// ----- 3) the thumbnail (1280x720), in the channel's own look -----
async function thumbnail(metas) {
  const W = 1280, H = 720, c = createCanvas(W, H), g = c.getContext('2d'), n = metas.length;
  if (G.parchment) {
    const pg = g.createLinearGradient(0, 0, 0, H); pg.addColorStop(0, '#EBD9AA'); pg.addColorStop(1, '#BE9C5E'); g.fillStyle = pg; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(110,72,30,0.18)'; g.lineWidth = 2; for (let x = 40; x < W; x += 80) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 40; y < H; y += 80) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    const bn = g.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 780); bn.addColorStop(0, 'rgba(60,30,5,0)'); bn.addColorStop(1, 'rgba(60,30,5,0.7)'); g.fillStyle = bn; g.fillRect(0, 0, W, H);
  } else if (GAME === 'army-clash') {
    g.fillStyle = G.a; g.fillRect(0, 0, W, H);
    g.beginPath(); g.moveTo(W * 0.56, 0); g.lineTo(W, 0); g.lineTo(W, H); g.lineTo(W * 0.44, H); g.closePath(); g.fillStyle = G.b; g.fill();
    g.save(); g.globalAlpha = 0.12; g.fillStyle = '#FFF'; g.translate(W / 2, H / 2); for (let k = 0; k < 30; k++) { g.rotate(Math.PI * 2 / 30); g.beginPath(); g.moveTo(0, 0); g.lineTo(-40, -1000); g.lineTo(40, -1000); g.closePath(); g.fill(); } g.restore();
    g.fillStyle = 'rgba(5,7,13,0.3)'; for (let y = 8; y < H; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < W; x += 16) { const d = Math.hypot((x - W / 2) / W, (y - H / 2) / H), r = Math.max(0, Math.min(6, (d - 0.25) * 14)); if (r > 0.5) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } }
  } else {
    const lg = g.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, '#7A1712'); lg.addColorStop(0.5, '#3A0A0A'); lg.addColorStop(1, '#0C0404'); g.fillStyle = lg; g.fillRect(0, 0, W, H);
    const gl = g.createRadialGradient(W / 2, H * 0.6, 50, W / 2, H * 0.6, 700); gl.addColorStop(0, 'rgba(255,140,40,0.55)'); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) { g.globalAlpha = 0.3 + (hash(i, 3) % 100) / 160; g.fillStyle = i % 3 ? '#FF7A2A' : '#FFD27A'; g.beginPath(); g.arc(hash(i, 1) % W, hash(i, 2) % H, 2 + hash(i, 4) % 5, 0, 7); g.fill(); } g.globalAlpha = 1;
  }
  // three of the battles' own thumbnails, as tilted cards (the art from their middle, never their text)
  const picks = [0, Math.floor(n / 2), n - 1].filter((v, k, a) => a.indexOf(v) === k);
  const imgs = [];
  for (const k of picks) { const f = path.join(WORK, `t${k}.jpg`); if (fs.existsSync(f)) imgs.push(await loadImage(f)); }
  const cw = 330, ch = 440, xs = imgs.length === 3 ? [250, 640, 1030] : imgs.length === 2 ? [420, 860] : [640], rots = [-0.09, 0.02, 0.09];
  imgs.forEach((im, k) => {
    g.save(); g.translate(xs[k], 430 + (k === 1 ? -14 : 10)); g.rotate(rots[imgs.length === 3 ? k : k + 1] || 0);
    g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 26; g.shadowOffsetY = 10; rr(g, -cw / 2 - 8, -ch / 2 - 8, cw + 16, ch + 16, 18); g.fillStyle = WHITE; g.fill(); g.shadowColor = 'transparent';
    g.save(); rr(g, -cw / 2, -ch / 2, cw, ch, 12); g.clip(); g.drawImage(im, 0, 470, 1080, 1440, -cw / 2, -ch / 2, cw, ch); g.restore();
    g.lineWidth = 6; rr(g, -cw / 2 - 8, -ch / 2 - 8, cw + 16, ch + 16, 18); g.strokeStyle = INK; g.stroke();
    g.restore();
  });
  // the words: big, few, readable small
  g.textBaseline = 'middle';
  const big = `${n} BATTLES`, q = GAME === 'tower-clash' ? 'WHO SURVIVES?' : GAME === 'territory-clash' ? 'WHO RULES?' : 'WHO WINS?';
  fit(g, big, 820, 150); g.save(); g.translate(W / 2, 112); g.rotate(-0.03); out(g, big, 0, 0, G.parchment ? '#B91C1C' : GOLD, 20); g.restore();
  g.save(); g.translate(W / 2, 650); g.rotate(-0.03); rr(g, -330, -52, 660, 104, 18); g.fillStyle = INK; g.fill(); g.lineWidth = 6; g.strokeStyle = G.accent; g.stroke();
  fit(g, q, 600, 92); out(g, q, 0, 4, WHITE, 2); g.restore();
  g.save(); g.translate(1150, 230); g.rotate(0.18); rr(g, -110, -40, 220, 80, 14); g.fillStyle = '#E0262B'; g.fill(); g.lineWidth = 5; g.strokeStyle = INK; g.stroke();
  fit(g, 'FULL ENDINGS', 190, 40); out(g, 'FULL ENDINGS', 0, 2, WHITE, 6); g.restore();
  return c.toBuffer('image/jpeg', { quality: 0.9 });
}

// ----- 4) put it together -----
const ENC = ['-c:v', 'libx264', '-preset', process.env.LONG_PRESET || 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '60', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2'];
async function main() {
  const t0 = Date.now();
  const metas = process.env.LONG_REUSE ? fs.readdirSync(WORK).filter(f => /^m\d+\.json$/.test(f)).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1))).map(f => JSON.parse(fs.readFileSync(path.join(WORK, f), 'utf8'))) : renderBattles();
  const segs = [];
  for (let i = 0; i < metas.length; i++) {
    fs.writeFileSync(path.join(WORK, `p${i}.png`), panel(metas, i));
    const seg = path.join(WORK, `s${i}.mp4`);
    const fc = `[0:v]split=2[a][b];[a]scale=1920:3414,crop=1920:1080,boxblur=30:2,eq=brightness=-0.1:saturation=1.4[bg];[b]crop=1080:${CROP_H}:0:${CROP_Y},scale=${WIN_W}:1080[fg];[bg][fg]overlay=${WIN_X}:0[v1];[v1][1:v]overlay=0:0,format=yuv420p[v]`;
    if (!sh('ffmpeg', ['-v', 'error', '-y', '-i', path.join(WORK, `b${i}.mp4`), '-i', path.join(WORK, `p${i}.png`), '-filter_complex', fc, '-map', '[v]', '-map', '0:a', ...ENC, seg])) throw new Error('compose failed');
    segs.push(seg);
  }
  // the outro card (end-screen room), 12 s, with the crowd bed softly under it
  fs.writeFileSync(path.join(WORK, 'outro.png'), outroCard(metas));
  const bed = path.join(ROOT, 'sfx', 'crowd-bed.wav'), outro = path.join(WORK, 'outro.mp4');
  const aIn = fs.existsSync(bed) ? ['-stream_loop', '-1', '-i', bed] : ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo'];
  sh('ffmpeg', ['-v', 'error', '-y', '-loop', '1', '-framerate', '60', '-i', path.join(WORK, 'outro.png'), ...aIn, '-t', '12', '-filter_complex', '[0:v]zoompan=z=\'1+0.0006*on\':d=1:s=1920x1080:fps=60,format=yuv420p[v];[1:a]volume=0.35,afade=t=in:d=0.6,afade=t=out:st=10.5:d=1.5[a]', '-map', '[v]', '-map', '[a]', ...ENC, outro]);
  if (fs.existsSync(outro)) segs.push(outro);
  const list = path.join(WORK, 'list.txt'); fs.writeFileSync(list, segs.map(s => `file '${s}'`).join('\n'));
  const final = path.join(OUT, G.file);
  if (!sh('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', final])) throw new Error('concat failed');
  // chapters (YouTube needs 0:00 first, three or more, each at least 10 s)
  let at = 0; const chapters = metas.map((m, i) => { const line = `${fmt(at)} Battle ${i + 1}: ${m.matchup || ''}`; at += probe(segs[i]); return line; });
  chapters.push(`${fmt(at)} How many did you get right?`);
  const n = metas.length, titles = G.titles(n), title = titles[NLONG % titles.length];
  const description = [
    `🏆 ${G.hook}`,
    '',
    '⏱️ Chapters',
    ...chapters,
    '',
    '💬 Comment your score! How many winners did you call?',
    '',
    `All battles are simulations from the game's own rules and chance: no real footage, and every army, base and kingdom is made up.`,
    '',
    `🔔 New battle every day on Army Clash · Tower Clash · Territory Clash — subscribe and hit the bell!`,
    '',
    G.hashtags,
  ].join('\n');
  fs.writeFileSync(path.join(OUT, 'thumb.jpg'), await thumbnail(metas));
  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify({ title, description, tags: G.tags, long: true, battles: metas.map(m => ({ seed: m.seed, matchup: m.matchup, result: m.result })) }, null, 1));
  fs.writeFileSync(path.join(OUT, 'long.json'), JSON.stringify({ n: NLONG + 1, title, battles: metas.length, seconds: +probe(final).toFixed(1) }));
  console.log(`Long-form video done in ${((Date.now() - t0) / 60000).toFixed(1)} min: ${final} (${fmt(probe(final))}), "${title}"`);
}
main().catch(e => { console.error(e); process.exit(1); });
