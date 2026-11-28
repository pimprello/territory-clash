// The fun layer (Rellz, 2026-11-28: "make the videos funnier, add prompts with context ... incorporate clickbait and viewer
// retention ... make some want to watch the same short and longs 100 times because of how funny and engaging"). The same file in
// all three Clash games. Looks and sound only: it reads the commentator's cues (the same list commentary.js gets) and the video
// clock, and never touches a battle. Everything rolls its own dice (seed ^ 0xF00D).
//   captions   on a big moment a comic caption pops over the battle ("BONK", "TIMBER!", "PLOT TWIST"), tilted, with a burst
//              behind it and a cartoon sting under it (sfx/fun/*.wav, mixed by commentary.js); at most `maxCaps` a video, `capGap`
//              seconds apart, never two at once
//   reactions  each caption sends a few cartoon reaction faces (laughing, skull, shocked, fire) up the left edge, like a live chat
//   the duck   every video hides one small golden rubber duck somewhere on the battlefield for about 1.5 s (rewatch bait: the
//              description asks viewers to comment the time they spotted it)
//   prompts    context prompts in their own lane, one at a time: "FIND THE HIDDEN GOLDEN DUCK" just after the fight starts, a like
//              prompt with a beating heart about a third in ("LIKE IF YOU'RE ENJOYING THE BATTLE"), and "STILL SURE ABOUT YOUR PICK?" about two thirds in (a re-hook
//              where viewers tend to drop off)
// Layout: in 1080x1920 units, inside YouTube's safe area (y 190-1560, 90 px from the sides, clear of the like/comment column right
// of x 860 below y 900).
'use strict';

const WORDS = {
  first: ['AND SO IT BEGINS', 'HERE WE GO', 'FIRST BLOOD', 'IT\'S ON'],
  streak: ['NO CHILL', 'ON A ROLL', 'ON FIRE', 'SPEEDRUN', 'RAMPAGE', 'CALCULATED', 'COMBO TIME'],   // (nothing that says how close the battle is)
  titan: ['TIMBER!', 'BIG GUY DOWN', 'HE WAS SO BIG', 'THE BIGGER THEY ARE...', 'RIP BIG GUY', 'GG BIG GUY'],
  bighit: ['BONK', 'OOF', 'CRITICAL HIT', 'THAT HAD TO HURT', 'SIT DOWN', 'YIKES'],
  last: ['IT\'S GETTING SWEATY', 'NO PRESSURE', 'CLUTCH TIME', 'MAIN CHARACTER', 'NOT LIKE THIS'],
  split: ['WAIT WHAT', 'DOUBLE TROUBLE', 'BUY ONE GET ONE', 'TWO FOR ONE'],
  traitor: ['SNAKE!', 'BETRAYAL ARC', 'TRUST NO ONE', 'PLOT TWIST', 'HE SWITCHED SIDES'],
  gate: ['KNOCK KNOCK', 'WHO LEFT THE DOOR OPEN', 'BREACHED', 'DOOR: DELETED'],
  spell: ['MAGIC?!', 'SORCERY', 'ABRA-KA-BOOM', 'NERF THIS', 'SPELL SPAM'],
  void: ['DELETED', 'WHERE DID THEY GO', 'YEET', 'POOF'],
  end: ['GG', 'WHAT A GAME', 'CERTIFIED CLASSIC', 'INSTANT REPLAY?'],   // (long-form battles only: a Short ends on the cliffhanger)
};
// (2026-11-28, "make things make sense") when a cue says what exactly happened (`what`), the caption fits that event, not just
// its kind: a mimic chest never gets "CRITICAL HIT"
const WHAT = {
  mimic: ['IT WAS A MIMIC', 'NEVER TRUST A CHEST', 'CHEST: HUNGRY'], rats: ['RATS!', 'WHO LET THE RATS IN', 'SQUEAK SQUEAK'],
  ghost: ['SPOOKY', 'GHOST ARMY', 'BOO!'], plague: ['ACHOO!', 'NOT THE PLAGUE', 'WASH YOUR HANDS'], walls: ['KNOCK KNOCK', 'BREACHED', 'DOOR: DELETED'],
  split: ['WAIT WHAT', 'TORN IN TWO', 'DOUBLE TROUBLE'], laststand: ['LAST STAND', 'NO PRESSURE', 'CLUTCH TIME'], matchpoint: ['MATCH POINT', 'NO PRESSURE', 'IT\'S GETTING SWEATY'],
  spell: ['MAGIC?!', 'SORCERY', 'ABRA-KA-BOOM'], traitor: ['SNAKE!', 'BETRAYAL ARC', 'TRUST NO ONE'],
};
const STING = { first: ['boing'], streak: ['tada', 'sparkle'], titan: ['slide', 'bonk'], bighit: ['bonk', 'pop', 'boing'], last: ['dundun'], split: ['boing', 'pop'], traitor: ['scratch', 'dundun'], gate: ['knock'], spell: ['sparkle', 'pop'], void: ['pop', 'slide'], end: ['tada'] };
const BURST = { end: '#FFD23F', first: '#38BDF8', streak: '#FBBF24', titan: '#F97316', bighit: '#F43F5E', last: '#A855F7', split: '#22D3EE', traitor: '#84CC16', gate: '#F59E0B', spell: '#C084FC', void: '#64748B' };
const RANK = { end: 6, titan: 5, last: 5, traitor: 4, split: 4, gate: 4, void: 4, spell: 3, streak: 3, bighit: 2, first: 1 };

function rng(s) { s = s >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function stir(x) { let h = x >>> 0; h = Math.imul(h ^ (h >>> 16), 0x85EBCA6B) >>> 0; h = Math.imul(h ^ (h >>> 13), 0xC2B2AE35) >>> 0; return (h ^ (h >>> 16)) >>> 0; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
const back = k => { k = clamp(k, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// a small golden rubber duck, facing right, about 44 px long at s = 1
function drawDuck(g, x, y, s, t, rainbow = false) {
  g.save(); g.translate(x, y + Math.sin(t * 6) * 2 * s); g.scale(s, s); g.rotate(Math.sin(t * 3) * 0.08);
  g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = '#2A1A05';
  const body = rainbow ? `hsl(${Math.round((t * 220) % 360)},95%,62%)` : '#FFC93C';
  g.beginPath(); g.ellipse(0, 4, 20, 13, 0, 0, Math.PI * 2); g.fillStyle = body; g.fill(); g.stroke();                 // body
  g.beginPath(); g.moveTo(-18, 0); g.quadraticCurveTo(-27, -8, -21, 6); g.closePath(); g.fill(); g.stroke();                 // tail
  g.beginPath(); g.arc(9, -10, 10, 0, Math.PI * 2); g.fill(); g.stroke();                                                    // head
  g.beginPath(); g.moveTo(17, -11); g.quadraticCurveTo(28, -10, 26, -5); g.quadraticCurveTo(21, -3, 17, -6); g.closePath(); g.fillStyle = '#FB923C'; g.fill(); g.stroke();
  g.beginPath(); g.arc(11, -12, 2.2, 0, Math.PI * 2); g.fillStyle = '#2A1A05'; g.fill();
  g.beginPath(); g.ellipse(-4, 2, 9, 5, -0.3, 0, Math.PI * 2); g.fillStyle = 'rgba(255,240,170,0.8)'; g.fill();               // wing shine
  // a glint, so it reads as golden
  const k = (t * 1.3) % 1, a = Math.max(0, Math.sin(k * Math.PI));
  g.globalAlpha *= a; g.fillStyle = '#FFFFFF'; g.beginPath();
  for (let i = 0; i < 8; i++) { const r = i % 2 ? 2 : 7, an = i / 8 * Math.PI * 2; g.lineTo(4 + Math.cos(an) * r, -20 + Math.sin(an) * r); }
  g.closePath(); g.fill();
  g.restore();
}

// cartoon reaction faces (no emoji fonts needed)
function drawFace(g, kind, x, y, r) {
  g.save(); g.translate(x, y); g.lineWidth = 3; g.strokeStyle = '#1F1300'; g.lineJoin = 'round'; g.lineCap = 'round';
  if (kind === 'skull') {
    g.beginPath(); g.arc(0, -3, r * 0.85, Math.PI * 0.9, Math.PI * 2.1); g.lineTo(r * 0.5, r * 0.75); g.lineTo(-r * 0.5, r * 0.75); g.closePath();
    g.fillStyle = '#F8FAFC'; g.fill(); g.stroke();
    g.fillStyle = '#1F1300'; g.beginPath(); g.arc(-r * 0.33, -r * 0.1, r * 0.22, 0, Math.PI * 2); g.arc(r * 0.33, -r * 0.1, r * 0.22, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(0, r * 0.2); g.lineTo(-r * 0.1, r * 0.38); g.lineTo(r * 0.1, r * 0.38); g.closePath(); g.fill();
  } else if (kind === 'fire') {
    g.beginPath(); g.moveTo(0, -r); g.bezierCurveTo(r * 0.9, -r * 0.2, r * 0.9, r, 0, r); g.bezierCurveTo(-r * 0.9, r, -r * 0.9, -r * 0.1, -r * 0.2, -r * 0.4);
    g.quadraticCurveTo(-r * 0.1, 0, 0, -r); g.closePath(); g.fillStyle = '#F97316'; g.fill(); g.stroke();
    g.beginPath(); g.moveTo(0, -r * 0.2); g.bezierCurveTo(r * 0.45, r * 0.2, r * 0.4, r * 0.85, 0, r * 0.85); g.bezierCurveTo(-r * 0.4, r * 0.85, -r * 0.4, r * 0.3, 0, -r * 0.2); g.fillStyle = '#FDE047'; g.fill();
  } else {
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fillStyle = '#FFD43B'; g.fill(); g.stroke();
    if (kind === 'laugh') {
      g.beginPath(); g.arc(-r * 0.36, -r * 0.2, r * 0.18, Math.PI * 1.1, Math.PI * 1.9); g.moveTo(r * 0.54, -r * 0.2); g.arc(r * 0.36, -r * 0.2, r * 0.18, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
      g.beginPath(); g.arc(0, r * 0.12, r * 0.5, 0, Math.PI); g.closePath(); g.fillStyle = '#7C2D12'; g.fill(); g.stroke();
      g.fillStyle = '#60A5FA'; g.beginPath(); g.ellipse(-r * 0.8, r * 0.05, r * 0.16, r * 0.3, 0.3, 0, Math.PI * 2); g.ellipse(r * 0.8, r * 0.05, r * 0.16, r * 0.3, -0.3, 0, Math.PI * 2); g.fill();
    } else {   // shocked
      g.fillStyle = '#1F1300'; g.beginPath(); g.arc(-r * 0.33, -r * 0.2, r * 0.13, 0, Math.PI * 2); g.arc(r * 0.33, -r * 0.2, r * 0.13, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(0, r * 0.38, r * 0.2, r * 0.3, 0, 0, Math.PI * 2); g.fillStyle = '#7C2D12'; g.fill(); g.stroke();
      g.fillStyle = '#93C5FD'; g.beginPath(); g.arc(-r * 0.7, -r * 0.65, r * 0.18, 0, Math.PI * 2); g.fill();
    }
  }
  g.restore();
}

function create(o = {}) {
  const on = o.on !== false, seed = o.seed >>> 0, R = rng(stir(seed ^ 0xF00D)), font = o.font || ((s, w = 800) => `${w} ${s}px sans-serif`);
  const box = Object.assign({ x0: 120, y0: 520, x1: 960, y1: 1320 }, o.box || {});
  const words = Object.assign({}, WORDS, o.words || {}), maxCaps = o.maxCaps ?? 4, capGap = o.capGap ?? 7, minRank = o.minRank ?? 2;
  const cues = o.cues || [], caps = [], bubbles = [];
  let seen = 0, lastCap = -99, quiet = false;
  const used = {};
  // the duck: a time and a place, fixed by the seed; clear of the like/comment column and the very edges
  const dFrom = o.duck && o.duck.from != null ? o.duck.from : 9, dTo = o.duck && o.duck.to != null ? o.duck.to : 40;
  const duck = { t: dFrom + R() * Math.max(1, dTo - dFrom), x: 0, y: 0, dur: 1.5 };
  duck.x = box.x0 + 40 + R() * (box.x1 - box.x0 - 80); duck.y = box.y0 + 40 + R() * (box.y1 - box.y0 - 80);
  if (duck.y > 880) duck.x = Math.min(duck.x, 820);
  duck.flip = R() < 0.5;
  duck.rainbow = R() < 0.1;   // one video in ten hides a rare rainbow duck instead
  const prompts = (o.prompts || []).filter(p => p && p.at != null).sort((a, b) => a.at - b.at);
  // (a rare rainbow duck: the prompt says so, so what's asked matches what's hidden)
  if (duck.rainbow) for (const p of prompts) if (p.icon === 'duck') p.text = p.text.replace('GOLDEN', 'RAINBOW');
  for (let i = 1; i < prompts.length; i++) prompts[i].at = Math.max(prompts[i].at, prompts[i - 1].at + (prompts[i - 1].dur || 3) + 0.6);
  const laneY = o.laneY ?? 1225;

  function take(c) {
    const rank = RANK[c.kind] || 0;
    // (at most two captions of one kind a video: an army with four titans shouldn't get four titan jokes)
    if (quiet || !words[c.kind] || rank < minRank || caps.length >= maxCaps || c.t - lastCap < capGap || caps.filter(x => x.kind === c.kind).length >= 2) return;
    const pool = (c.what && WHAT[c.what]) || words[c.kind], free = pool.filter(w => !used[w]), list = free.length ? free : pool, text = list[Math.floor(R() * list.length)];
    used[text] = 1; lastCap = c.t;
    const y = box.y0 + (box.y1 - box.y0) * (0.28 + R() * 0.3), rot = (R() < 0.5 ? -1 : 1) * (0.06 + R() * 0.07);
    const sl = STING[c.kind] || [], sting = sl.length ? sl[Math.floor(R() * sl.length)] : null;
    caps.push({ t: c.t, kind: c.kind, text, y, rot, col: BURST[c.kind] || '#FBBF24', sting });
    const kinds = c.kind === 'titan' || c.kind === 'void' ? ['skull', 'shock', 'skull', 'laugh'] : c.kind === 'streak' || c.kind === 'spell' ? ['fire', 'shock', 'fire', 'laugh'] : ['laugh', 'skull', 'laugh', 'shock'];
    const n = 3 + Math.floor(R() * 3);
    for (let i = 0; i < n; i++) bubbles.push({ t: c.t + 0.1 + i * 0.22 + R() * 0.1, kind: kinds[i % kinds.length], x: 118 + R() * 46, sway: R() * 6.28, r: 21 + R() * 7 });
  }

  function drawCaption(g, c, tv) {
    const k = tv - c.t, life = 1.7;
    if (k < 0 || k > life) return;
    const a = clamp(Math.min(k / 0.08, (life - k) / 0.25), 0, 1), s = k < 0.28 ? 0.3 + 0.7 * back(k / 0.28) : k > life - 0.25 ? 1 - 0.3 * ease((k - life + 0.25) / 0.25) : 1;
    g.save(); g.globalAlpha = a; g.font = font(66, 800); g.textAlign = 'center'; g.textBaseline = 'middle';
    const tw = Math.min(g.measureText(c.text).width, 700), z = Math.min(1, 700 / g.measureText(c.text).width);
    // centred, but kept clear of the like/comment column when it sits low
    const cx = c.y > 860 ? Math.min(540, 860 - tw / 2 - 20) : 540;
    g.translate(cx, c.y); g.rotate(c.rot + 0.03 * Math.sin(k * 18) * Math.max(0, 1 - k * 2)); g.scale(s * z, s * z);
    // the burst
    const n = 14, rb = tw / 2 + 50;
    g.beginPath();
    for (let i = 0; i < n * 2; i++) { const an = i / (n * 2) * Math.PI * 2 + k * 0.6, r = i % 2 ? rb * 0.62 : rb; g.lineTo(Math.cos(an) * r, Math.sin(an) * r * 0.42); }
    g.closePath(); g.fillStyle = c.col; g.globalAlpha = a * 0.82; g.fill(); g.lineWidth = 6; g.strokeStyle = '#0B0E18'; g.stroke(); g.globalAlpha = a;
    g.lineJoin = 'round'; g.lineWidth = 14; g.strokeStyle = '#0B0E18'; g.strokeText(c.text, 0, 4);
    g.fillStyle = '#FFFFFF'; g.fillText(c.text, 0, 2);
    g.restore();
  }

  function drawPrompt(g, p, tv) {
    const dur = p.dur || 3, k = tv - p.at;
    if (k < 0 || k > dur) return;
    const a0 = clamp(Math.min(k / 0.3, (dur - k) / 0.35), 0, 1), a = a0 * a0 * (3 - 2 * a0), slide = (1 - ease(k / 0.35)) * -40;
    g.save(); g.globalAlpha = a; g.font = font(32, 800); g.textAlign = 'left'; g.textBaseline = 'middle';
    const icon = p.icon === 'duck' ? 46 : p.icon === 'heart' ? 40 : 0, tw = Math.min(g.measureText(p.text).width, 640 - icon), w = tw + 44 + icon, h = 62, x = 100 + slide, y = laneY - h / 2;
    rr(g, x, y, w, h, h / 2); g.fillStyle = 'rgba(8,11,20,0.9)'; g.fill(); g.lineWidth = 4; g.strokeStyle = p.col || '#FFC93C'; g.stroke();
    if (p.icon === 'duck') drawDuck(g, x + 36, laneY + 3, 0.72, tv, duck.rainbow);
    else if (p.icon === 'heart') {
      const hx = x + 34, hy = laneY + 1, z = 1 + 0.12 * Math.max(0, Math.sin(tv * 9));
      g.save(); g.translate(hx, hy); g.scale(z, z); g.beginPath(); g.moveTo(0, 10); g.bezierCurveTo(-18, -2, -12, -18, 0, -8); g.bezierCurveTo(12, -18, 18, -2, 0, 10);
      g.closePath(); g.fillStyle = '#FB3B5C'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#0B0E18'; g.stroke(); g.restore();
    }
    g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = '#0B0E18'; g.strokeText(p.text, x + 22 + icon, laneY + 2, 640 - icon);
    g.fillStyle = p.col || '#FFC93C'; g.fillText(p.text, x + 22 + icon, laneY + 2, 640 - icon);
    g.restore();
  }

  return {
    duck, caps, prompts,
    // `quiet`: no new captions now (the last seconds before a cliffhanger freeze, so the frozen frame stays clean)
    draw(g, tv, opt = {}) {
      if (!on) return;
      quiet = !!opt.quiet;
      while (seen < cues.length) take(cues[seen++]);
      g.save();
      // the duck (under everything else of this layer)
      const dk = tv - duck.t;
      if (dk >= 0 && dk <= duck.dur && !(quiet && dk < 0.05)) {
        const a = clamp(Math.min(dk / 0.25, (duck.dur - dk) / 0.3), 0, 1);
        g.globalAlpha = a; g.save(); g.translate(duck.x, duck.y); if (duck.flip) g.scale(-1, 1); drawDuck(g, 0, 0, 0.8, tv, duck.rainbow); g.restore(); g.globalAlpha = 1;
      }
      for (const p of prompts) drawPrompt(g, p, tv);
      for (const b of bubbles) {
        const k = (tv - b.t) / 1.8;
        if (k < 0 || k > 1) continue;
        g.globalAlpha = clamp(Math.min(k * 8, (1 - k) * 3), 0, 1);
        drawFace(g, b.kind, b.x + Math.sin(b.sway + k * 7) * 12, 1290 - 400 * ease(k), b.r * (0.7 + 0.3 * back(Math.min(1, k * 5))));
      }
      g.globalAlpha = 1;
      for (const c of caps) drawCaption(g, c, tv);
      g.restore();
    },
    // the stings for commentary.js: [{ t, file }]
    // the stings for commentary.js: [{ t, file }], with a soft quack as the duck appears (a clue for anyone listening)
    stings() { return on ? caps.filter(c => c.sting).map(c => ({ t: c.t, file: `fun/${c.sting}.wav` })).concat([{ t: duck.t + 0.15, file: 'fun/quack.wav', gain: 0.6 }]) : []; },
    // a prompt raised by the game when its moment comes (e.g. "LAST CHANCE TO LOCK IN YOUR PICK" a few seconds before the end);
    // it waits for the lane if another prompt is still up
    trigger(p, tv) { if (!on || !p) return; const last = prompts[prompts.length - 1], at = last ? Math.max(tv, last.at + (last.dur || 3) + 0.6) : tv; prompts.push(Object.assign({}, p, { at })); },
    duckLine() { return duck.rainbow ? '🌈 A RARE rainbow duck is hidden somewhere in this video. Spotted it? Comment the time!' : DUCK_LINE; },
    meta() { return on ? { duckAt: Math.round(duck.t * 10) / 10, rainbow: duck.rainbow || undefined, captions: caps.map(c => `${c.t.toFixed(1)}s ${c.text}`), prompts: prompts.map(p => `${p.at.toFixed(1)}s ${p.text}`) } : null; },
  };
}

// the line for the description (rewatch bait)
const DUCK_LINE = '🦆 A tiny golden duck is hidden somewhere in this video. Spotted it? Comment the time!';

module.exports = { create, drawDuck, drawFace, WORDS, WHAT, STING, DUCK_LINE };
