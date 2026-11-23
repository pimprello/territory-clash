// Clash family channel art (node brand.js [territory|army|tower]): a profile picture (1024x1024) and a banner (2560x1440)
// for each channel, all made by one set of rules: a ray burst in the channel's colour; one shiny character standing upright
// in the middle of the profile picture; on the banner, six characters evenly spaced and faded behind the channel name (same
// font, size and spacing), small enough to sit inside the strip YouTube shows on every screen (1546x423 in the middle).
'use strict';
const fs = require('fs');
const path = require('path');
const DR = require('./tc-draw.js');

const INK = '#04060B', WHITE = '#F4F6FB';
const THEMES = {
  territory: { name: 'TERRITORY CLASH', bg: ['#1FA977', '#36C190', '#8FE3C1'], shadow: 'rgba(5,40,30,0.35)', hero: ['sunking', 'AMBER'],
    row: [['pyro', 'CRIMSON'], ['frostwitch', 'WHITE'], ['druid', 'GREEN'], ['assassin', 'INDIGO'], ['knight', 'NAVY'], ['paladin', 'ORANGE']] },
  army: { name: 'ARMY CLASH', bg: ['#6FB2EA', '#86C3F0', '#B4DDF8'], shadow: 'rgba(10,30,60,0.35)', hero: ['knight', 'RED'],
    row: [['rifleman', 'RED'], ['grenadier', 'BLUE'], ['knight', 'RED'], ['musketeer', 'BLUE'], ['samurai', 'RED'], ['bannerman', 'BLUE']] },
  tower: { name: 'TOWER CLASH', bg: ['#8B6CF0', '#A58BF5', '#C9B8FB'], shadow: 'rgba(30,10,60,0.35)', hero: ['frostwitch', 'GOLD'], heroHead: 'thorncrown',
    row: [['longbow', 'GOLD'], ['engineer', 'PURPLE'], ['crossbowman', 'GOLD'], ['royalguard', 'PURPLE'], ['wizard', 'GOLD'], ['shieldbearer', 'PURPLE']] },
};

function outline(g, t, x, y, fill, lw) { g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = INK; g.strokeText(t, x, y); g.fillStyle = fill; g.fillText(t, x, y); }
function burst(g, T, W, H, cx, cy) {
  const lg = g.createLinearGradient(0, 0, W * 0.3, H); lg.addColorStop(0, T.bg[0]); lg.addColorStop(0.55, T.bg[1]); lg.addColorStop(1, T.bg[2]);
  g.fillStyle = lg; g.fillRect(0, 0, W, H);
  g.save(); g.translate(cx, cy); g.fillStyle = 'rgba(255,255,255,0.13)'; const r = Math.hypot(W, H);
  for (let k = 0; k < 36; k++) { const a = (k / 36) * Math.PI * 2; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, a, a + (Math.PI / 36) * 0.9); g.closePath(); g.fill(); }
  g.restore();
  const rg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7); rg.addColorStop(0, 'rgba(255,255,255,0.14)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
}

function channelArt(key, out) {
  const T = THEMES[key], pre = key === 'territory' ? '' : key + '-';
  {
    const S = 1024, c = DR.canvas(S, S), g = c.getContext('2d');
    burst(g, T, S, S, S / 2, S / 2);
    // the profile picture's finish (same for all three): a soft spotlight behind the character, a darker rim so the eye goes
    // to the middle, a thin glowing ring just inside YouTube's round crop, and four sparkles
    const cx = S / 2, cy = S / 2;
    const spot = g.createRadialGradient(cx, cy - 20, 0, cx, cy - 20, 360); spot.addColorStop(0, 'rgba(255,255,255,0.55)'); spot.addColorStop(0.55, 'rgba(255,255,255,0.18)'); spot.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = spot; g.fillRect(0, 0, S, S);
    const vig = g.createRadialGradient(cx, cy, 330, cx, cy, 520); vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, T.shadow.replace('0.35', '0.42'));
    g.fillStyle = vig; g.fillRect(0, 0, S, S);
    g.beginPath(); g.arc(cx, cy, 478, 0, Math.PI * 2); g.lineWidth = 22; g.strokeStyle = 'rgba(255,255,255,0.12)'; g.stroke();
    g.lineWidth = 7; g.strokeStyle = 'rgba(255,255,255,0.55)'; g.stroke();
    // every channel's character drawn at the same scale from the same point, so heads and bodies are the same size in the
    // same place in all three pictures (hats, crowns and weapons stick out as they are), body centred left to right
    g.save(); g.shadowColor = T.shadow; g.shadowBlur = 34; g.shadowOffsetY = 14;
    // (Rellz, 2026-11-23: Tower Clash's wizard hat was too big and touched the white ring) its profile picture uses a crown of
    // thorns instead of the tall wizard hat (T.heroHead); everything else stays at the same place and scale as the other two
    const HU = require('./engine.js')._.HUMAN[T.hero[0]], head0 = HU && HU.head; if (HU && T.heroHead) HU.head = T.heroHead;
    g.translate(S / 2 + 11, S / 2 + 52); DR.portrait(g, T.hero[0], T.hero[1], 276); g.restore();
    if (HU) HU.head = head0;
    const star = (x, y, r) => { g.save(); g.translate(x, y); g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, rr = i % 2 ? r * 0.22 : r; g.lineTo(Math.cos(a - Math.PI / 2) * rr, Math.sin(a - Math.PI / 2) * rr); } g.closePath();
      g.shadowColor = 'rgba(255,255,255,0.9)'; g.shadowBlur = 18; g.fillStyle = '#FFFFFF'; g.fill(); g.restore(); };
    star(250, 300, 34); star(790, 250, 26); star(800, 760, 22); star(225, 720, 18);
    fs.writeFileSync(path.join(out, pre + 'profile.png'), c.toBuffer('image/png'));
  }
  {
    const W = 2560, H = 1440, c = DR.canvas(W, H), g = c.getContext('2d'), cx = W / 2, cy = H / 2;
    burst(g, T, W, H, cx, cy);
    // the banner's finish (same for all three, matching the profile pictures): a wide spotlight behind the name, darker
    // edges, two thin glowing lines framing the strip every screen shows, with a diamond in the middle of each, and sparkles
    g.save(); g.translate(cx, cy); g.scale(2.6, 1);
    const spot = g.createRadialGradient(0, 0, 0, 0, 0, 520); spot.addColorStop(0, 'rgba(255,255,255,0.5)'); spot.addColorStop(0.5, 'rgba(255,255,255,0.16)'); spot.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = spot; g.fillRect(-600, -600, 1200, 1200); g.restore();
    g.save(); g.translate(cx, cy); g.scale(1.9, 1);
    const vig = g.createRadialGradient(0, 0, 420, 0, 0, 900); vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, T.shadow.replace('0.35', '0.42'));
    g.fillStyle = vig; g.fillRect(-1400, -800, 2800, 1600); g.restore();
    for (const y of [cy - 150, cy + 150]) {
      const lg = g.createLinearGradient(cx - 760, 0, cx + 760, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,0.75)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = lg; g.fillRect(cx - 760, y - 3, 1520, 6);
      g.save(); g.translate(cx, y); g.rotate(Math.PI / 4); g.shadowColor = 'rgba(255,255,255,0.9)'; g.shadowBlur = 16; g.fillStyle = '#FFFFFF'; g.fillRect(-11, -11, 22, 22); g.restore();
    }
    // everything (the name and three characters each side) fits inside the strip a phone shows (1546 px wide in the
    // middle), on every banner: the name's size is worked out from the widest name so the three banners match, and the
    // same gap sits between every character and the next, and between the nearest one and the name
    const cw = 104, gp = 26, half = T.row.length / 2, fit = 1500, side = half * (cw + gp);
    g.textAlign = 'center'; g.textBaseline = 'middle'; if ('letterSpacing' in g) g.letterSpacing = '4px';
    g.font = 'italic 800 100px "Barlow Condensed"';
    const widest100 = Math.max(...Object.values(THEMES).map(t => g.measureText(t.name).width));
    const fsz = Math.floor((100 * (fit - 2 * side - 20)) / widest100);
    g.font = `italic 800 ${fsz}px "Barlow Condensed"`;
    const tw = g.measureText(T.name).width + 20;
    T.row.forEach(([type, col], i) => {
      const j = i < half ? half - 1 - i : i - half, sd = i < half ? -1 : 1;
      const x = cx + sd * (tw / 2 + gp + cw / 2 + j * (cw + gp));
      g.save(); g.globalAlpha = 0.6; g.translate(x, cy - 2); DR.portrait(g, type, col, 74); g.restore();
    });
    g.font = `italic 800 ${fsz}px "Barlow Condensed"`;
    g.shadowColor = T.shadow; g.shadowBlur = 30; g.shadowOffsetY = 10;
    outline(g, T.name, cx, cy, WHITE, Math.round(fsz * 0.14));
    g.shadowColor = 'transparent';
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    const star = (x, y, r) => { g.save(); g.translate(x, y); g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, rr = i % 2 ? r * 0.22 : r; g.lineTo(Math.cos(a - Math.PI / 2) * rr, Math.sin(a - Math.PI / 2) * rr); } g.closePath();
      g.shadowColor = 'rgba(255,255,255,0.9)'; g.shadowBlur = 18; g.fillStyle = '#FFFFFF'; g.fill(); g.restore(); };
    star(cx - 690, cy - 112, 20); star(cx + 690, cy - 116, 17); star(cx + 700, cy + 108, 13); star(cx - 700, cy + 106, 12); star(cx - 230, cy - 128, 12); star(cx + 260, cy + 128, 12);
    fs.writeFileSync(path.join(out, pre + 'banner.png'), c.toBuffer('image/png'));
  }
}

const out = path.join(__dirname, 'out');
fs.mkdirSync(out, { recursive: true });
for (const k of process.argv[2] ? [process.argv[2]] : Object.keys(THEMES)) channelArt(k, out);
console.log('Channel art written to out/ (profile.png, banner.png, army-*, tower-*)');
