// The commentator and the crowd (rules.picks, Rellz 2026-11-16, ideas 25 and 26). The same file in every Clash game.
// The battle only raises cues (first kill, a streak, a titan down, a big hit, the last stand, a split, a traitor, a gate, a spell,
// the finish); this turns them into lines from sfx/call-*.wav and swells the crowd bed (sfx/crowd-bed.wav) on kills. Sound only:
// it reads the battle's event timeline and never feeds anything back. Lines are picked with looks dice (seed ^ 0xC0AA7E), at most
// `max` a video and at least `gap` seconds apart, never before `startAt` (the face-off and the charge). Both are mixed into the
// effects (the buffers that music.js's levels match to -14 dB), so the music ducks under the voice and the swell shapes the effects
// rather than making the mix louder. sfx/make_kokoro.py builds the wavs (all three games).
// (2026-11-28, Rellz: "add a variety of more narrator quips for all 3 channels but also dont make it say a quip every 5 seconds
// make it only when something important happens but make sure there is a variety so every video feels unique") three to seven
// lines for every moment, a different one each video, and with `min` (rules.picks.minPrio) only moments that matter are spoken:
// a titan, the last stand, a traitor, a split, a gate, magic, a streak and the finish, never the first hit or an ordinary big hit.
'use strict';
const fs = require('fs');
const path = require('path');

const LINES = {
  first: ['first-blood', 'and-were-off', 'here-we-go'],
  streak: ['triple-kill', 'what-a-combo', 'unstoppable', 'surge', 'rising', 'no-mercy', 'rampage', 'f-chill', 'f-snack'],
  titan: ['titan-down', 'the-giant-falls', 'colossus', 'giant-slain', 'mighty-fall', 'f-timber', 'f-floor'],
  bighit: ['what-a-hit', 'ouch', 'crushed', 'devastating'],
  last: ['last-one-standing', 'hold-the-line', 'all-or-nothing', 'final-stand', 'one-more', 'f-sweaty', 'f-nervous'],
  split: ['split-in-two', 'divided', 'two-fates', 'f-two'],
  traitor: ['traitor', 'switched-sides', 'betrayed', 'backstab', 'f-snake'],
  gate: ['gate-is-down', 'breach', 'crumble', 'f-knock'],
  spell: ['what-a-spell', 'unbelievable', 'sorcery', 'did-you-see', 'curse', 'f-wizard', 'f-sparkle'],
  end: ['what-a-finish', 'theyre-finished', 'its-all-over', 'legendary', 'for-the-ages', 'never-forget', 'f-gg'],
  hook: ['hook-bets', 'hook-one', 'hook-crown', 'hook-choose', 'hook-hear', 'hook-guess', 'hook-comment', 'hook-duck', 'hook-snacks'],
};
// (Army Clash, Rellz 2026-11-21: "make the voice sound like a war general") the war general's lines, in sfx/general/gen-*.wav
// (sfx/make_general.py); used with mix(..., { lines: 'general' }). Other games keep LINES unless they ask for this set.
const GENERAL = {
  first: ['engage', 'first-blood', 'open-fire', 'trumpets'],
  streak: ['keep-pressure', 'cut-them-down', 'magnificent', 'glorious', 'relentless', 'mighty-charge', 'f-stop', 'f-snack'],
  titan: ['titan-fallen', 'beast-down', 'giant-slain', 'colossus-falls', 'f-timber', 'f-bigger'],
  bighit: ['direct-hit', 'what-a-blow', 'thats-how', 'devastating'],
  last: ['hold-the-line', 'stand-your-ground', 'make-it-count', 'last-hope', 'final-stand', 'f-sweaty', 'f-watch'],
  split: ['steady', 'divided', 'f-two'],
  traitor: ['traitor', 'turned', 'treason', 'betrayed', 'f-snake'],
  gate: ['gate-broken', 'breach', 'f-knock'],
  spell: ['brace', 'unbelievable', 'sorcery', 'did-you-see', 'f-wizard'],
  void: ['swallowed', 'nothing-left', 'vanished', 'f-poof'],
  end: ['victory', 'battle-won', 'stand-down', 'glory', 'history', 'long-live', 'f-gg'],
  comeback: ['f-comeback1', 'f-comeback2', 'f-comeback3'],
  hook: ['hook-bets', 'hook-one', 'hook-crown', 'hook-choose', 'hook-hear', 'hook-guess', 'hook-comment', 'hook-duck', 'hook-snacks'],
};
const SETS = { default: { lines: LINES, file: k => `call-${k}.wav` }, general: { lines: GENERAL, file: k => path.join('general', `gen-${k}.wav`) } };
const PRIO = { guest: 8, comeback: 5, hook: 6, end: 9, void: 4, titan: 5, last: 5, traitor: 4, split: 4, gate: 4, spell: 3, streak: 3, bighit: 2, first: 2 };

// a 16-bit PCM wav, resampled (linear) to sr, as [L, R]
const cache = {};
function readWav(file, sr) {
  const key = file + '@' + sr;
  if (cache[key]) return cache[key];
  const b = fs.readFileSync(file);
  let o = 12, fmt = null;
  while (o < b.length - 8) {
    const id = b.toString('ascii', o, o + 4), n = b.readUInt32LE(o + 4);
    if (id === 'fmt ') fmt = { ch: b.readUInt16LE(o + 10), sr: b.readUInt32LE(o + 12) };
    if (id === 'data') { o += 8; break; }
    o += 8 + n;
  }
  const ch = fmt.ch, n = Math.floor((b.length - o) / 2 / ch), r = fmt.sr / sr, m = Math.floor(n / r);
  const L = new Float32Array(m), R = new Float32Array(m);
  for (let i = 0; i < m; i++) {
    const p = i * r, j = Math.min(n - 2, Math.floor(p)), f = p - j;
    const g = (k, c) => b.readInt16LE(o + ((k * ch) + Math.min(c, ch - 1)) * 2) / 32768;
    L[i] = g(j, 0) * (1 - f) + g(j + 1, 0) * f; R[i] = g(j, 1) * (1 - f) + g(j + 1, 1) * f;
  }
  return (cache[key] = [L, R]);
}

// the looks dice
function rng(s) { s = s >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

// which cues become lines: in time order; a cue too close to the last line is dropped, unless it matters more and the last line
// is still in the future of an earlier pick (then it takes that place); the finish always gets a line if it can fit
// (2026-11-28, from what keeps Shorts watched: a question in the first second or two) with `hook` (seconds), the narrator opens
// the video with one hook line over the face-off ("Place your bets!", "Who rules? Tell me in the comments!"), before startAt
// (2026-11-28, "ENTERTAINMENT!!!") with `guest` ({ t, file }), a narrator from another Clash channel drops in at t with one line
// (sfx/guest/, fun.js decides when); it counts as one of the `max` lines and keeps the others `gap` away
function plan(cues, { max = 8, gap = 6, startAt = 0, endAt = Infinity, seed = 1, lines = LINES, min = 0, hook = null, avoid = [], guest = null } = {}) {
  if (hook != null && lines.hook) cues = [{ t: hook, kind: 'hook' }].concat(cues.filter(c => c.kind !== 'hook'));
  const list = cues.filter(c => (c.kind === 'hook' || c.t >= startAt) && c.t <= endAt && lines[c.kind] && (PRIO[c.kind] || 1) >= min).sort((a, b) => a.t - b.t || (PRIO[b.kind] || 1) - (PRIO[a.kind] || 1));
  const out = [];
  for (const c of list) {
    const last = out[out.length - 1], p = PRIO[c.kind] || 1;
    if (!last || c.t - last.t >= gap) { if (out.length < max || c.kind === 'end') { if (out.length >= max) out.pop(); out.push({ t: c.t, kind: c.kind }); } continue; }
    // within 0.6 s of the last line's cue, the more important of the two is said
    if (c.t - last.t < 0.6 && p > (PRIO[last.kind] || 1)) { last.kind = c.kind; last.t = c.t; continue; }
    // the finish replaces a line that would still be talking
    if (c.kind === 'end' && p > (PRIO[last.kind] || 1)) { const prev = out[out.length - 2]; if (!prev || c.t - prev.t >= gap) { out[out.length - 1] = { t: c.t, kind: c.kind }; } }
  }
  // (2026-11-28) the seed is stirred first, so seeds next to each other (one slot after another) still pick different lines
  let h = (seed ^ 0xC0AA7E) >>> 0; h = Math.imul(h ^ (h >>> 16), 0x85EBCA6B) >>> 0; h = Math.imul(h ^ (h >>> 13), 0xC2B2AE35) >>> 0; h = (h ^ (h >>> 16)) >>> 0;
  // the guest is always heard (the screen says so): lines too close to it make way
  if (guest && guest.t != null) {
    for (let i = out.length - 1; i >= 0; i--) if (out[i].kind !== 'hook' && Math.abs(out[i].t - guest.t) < gap) out.splice(i, 1);
    out.push({ t: guest.t, kind: 'guest' }); out.sort((a, b) => a.t - b.t);
    while (out.length > Math.max(max, 2)) { let k = -1; out.forEach((l, i) => { if (l.kind !== 'hook' && l.kind !== 'guest' && l.kind !== 'end' && (k < 0 || (PRIO[l.kind] || 1) < (PRIO[out[k].kind] || 1))) k = i; }); if (k < 0) break; out.splice(k, 1); }
  }
  const R = rng(h), used = {};
  for (const l of out) {
    if (l.kind === 'guest') { l.line = 'guest'; continue; }
    // (`avoid`: lines that wouldn't be true this time, e.g. the golden-duck hook when the duck is a rainbow one)
    const ok = lines[l.kind].filter(k => !avoid.includes(k)), opts = ok.length ? ok : lines[l.kind], free = opts.filter(k => !used[k]), pool = free.length ? free : opts;
    l.line = pool[Math.floor(R() * pool.length)]; used[l.line] = 1;
  }
  return out;
}

// mixes the plan and the crowd into L and R (Float32Array, the effects bus) at sample rate sr
// (blend, Army Clash 2026-11-21: "have a fade and blend in with the music") options, all off by default so other games sound as
// before: `lines` picks the voice set; `bus` ({ L, R }) takes the voice on a bus of its own (music.js then dips the music smoothly
// under it, see dips, instead of the effects ducking it); `fade` [in, out] seconds of fade on every line; `wet` sends it into a
// hall (a long, soft tail like the music's) so it sits inside the soundtrack; `beat` lands each line on the music's next half beat
// when that's within 0.25 s; `dips` collects [start, end] of every line (seconds) for the music.
function hall(L, R, wet, sr) {
  const k = sr / 44100, len = L.length;
  const run = (inp, spread) => {
    const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map(n => ({ b: new Float32Array(Math.floor((n + spread) * k * 1.3)), i: 0, st: 0 }));
    const aps = [556, 441, 341, 225].map(n => ({ b: new Float32Array(Math.floor((n + spread) * k)), i: 0 }));
    const out = new Float32Array(len), fb = 0.86, damp = 0.35;
    for (let s = 0; s < len; s++) {
      const x = inp[s] * 0.03; let y = 0;
      for (const c of combs) { const o = c.b[c.i]; c.st = o * (1 - damp) + c.st * damp; c.b[c.i] = x + c.st * fb; if (++c.i >= c.b.length) c.i = 0; y += o; }
      for (const a of aps) { const o = a.b[a.i]; const v = -y + o; a.b[a.i] = y + o * 0.5; if (++a.i >= a.b.length) a.i = 0; y = v; }
      out[s] = y;
    }
    return out;
  };
  const vl = run(L, 0), vr = run(R, 23);
  for (let s = 0; s < len; s++) { L[s] += vl[s] * wet; R[s] += vr[s] * wet; }
}
function band(L, R, sr, lo, hi) {
  const h = Math.exp(-2 * Math.PI * lo / sr), l = 1 - Math.exp(-2 * Math.PI * hi / sr);
  for (const X of [L, R]) {
    let hx = 0, hy = 0, ly = 0, ly2 = 0;
    for (let i = 0; i < X.length; i++) {
      const x = X[i], y = h * (hy + x - hx); hx = x; hy = y;          // high-pass
      ly += (y - ly) * l; ly2 += (ly - ly2) * l; X[i] = ly2;           // two gentle low-pass steps
    }
  }
}
function mix(L, R, { sr, cues = [], crowd = [], dir = path.join(__dirname, 'sfx'), seed = 1, startAt = 0, endAt, voice = 0.62, bed = 0.075, max = 8, gap = 6,
  swell = { kill: 3, big: 6, attack: 0.2, release: 1.5 }, lines: set = 'default', bus = null, fade = null, wet = 0, beat = 0, dips = null, soft = false, min = 0, hook = null, avoid = [], guest = null, stings = [], stingGain = 0.32 } = {}) {
  const len = L.length, end = endAt ?? len / sr, said = [], S = SETS[set] || SETS.default, VL = bus ? bus.L : L, VR = bus ? bus.R : R;
  const lines = plan(cues, { max, gap, startAt, endAt: end, seed, lines: S.lines, min, hook, avoid, guest });
  for (const l of lines) {
    let w; try { w = readWav(l.kind === 'guest' ? path.join(__dirname, 'sfx', guest.file) : path.join(dir, S.file(l.line)), sr); } catch (e) { continue; }
    // the voice comes in 0.15 s after what it calls (it reacts), and never runs past the end; with `beat`, on the next half beat
    let t0 = l.t + 0.15;
    if (beat > 0) { const hb = beat / 2, q = Math.ceil(t0 / hb) * hb; if (q - t0 < 0.25) t0 = q; }
    const s0 = Math.round(t0 * sr), n = w[0].length, fi = fade ? Math.max(1, Math.round(fade[0] * sr)) : 0, fo = fade ? Math.max(1, Math.round(fade[1] * sr)) : 0;
    for (let i = 0; i < n && s0 + i < len; i++) {
      let g = voice;
      if (fade) { if (i < fi) g *= Math.sin(i / fi * Math.PI / 2); if (n - i < fo) g *= Math.sin((n - i) / fo * Math.PI / 2); }
      VL[s0 + i] += w[0][i] * g; VR[s0 + i] += w[1][i] * g;
    }
    if (dips) dips.push([t0, t0 + n / sr]);
    said.push(`${l.t.toFixed(1)}s ${l.line}`);
  }
  // (2026-11-28) the fun layer's cartoon stings (fun.js: a bonk, a boing, a slide whistle under each caption) go into the
  // effects, never on top of a spoken line
  for (const st of stings || []) {
    if (lines.some(l => Math.abs(st.t - l.t) < 1.2)) continue;
    // (from sfx/ itself, whatever folder the voice comes from: Tower Clash's witch lives in sfx/oracle, and its stings were lost)
    let w; try { w = readWav(path.join(__dirname, 'sfx', st.file), sr); } catch (e) { continue; }
    const s0 = Math.round(st.t * sr);
    for (let i = 0; i < w[0].length && s0 + i < len; i++) { if (s0 + i < 0) continue; const gg = stingGain * (st.gain ?? 1); L[s0 + i] += w[0][i] * gg; R[s0 + i] += w[1][i] * gg; }
    said.push(`${st.t.toFixed(1)}s sting ${path.basename(st.file, '.wav')}`);
  }
  // (all three games, Rellz 2026-11-23: "blended into the music not a main part ... add some reverb") `soft` rounds the voice
  // off before the hall: the rumble and the hiss are taken out (a gentle band of about 140 Hz to 5 kHz), so it sounds like a
  // voice far off in the same hall as the music, not one right at the microphone
  if (bus && soft && said.length) band(VL, VR, sr, 140, 5200);
  if (bus && wet > 0 && said.length) hall(VL, VR, wet, sr);
  // the crowd: a murmuring bed under the fight that swells (in dB, attack and release in seconds) on kills and big moments
  if (bed > 0) {
    let w = null; try { w = readWav(path.join(dir, 'crowd-bed.wav'), sr); } catch (e) { /* no crowd */ }
    if (w) {
      const a0 = Math.round(startAt * sr), a1 = Math.min(len, Math.round(end * sr)), n = w[0].length;
      const ev = crowd.filter(c => c.t >= startAt && c.t <= end).sort((a, b) => a.t - b.t);
      const atk = 1 - Math.exp(-1 / (swell.attack * sr)), rel = 1 - Math.exp(-1 / (swell.release * sr));
      let db = 0, k = 0, hold = 0, aim = 0;
      for (let i = a0; i < a1; i++) {
        const t = i / sr;
        while (k < ev.length && ev[k].t <= t) { const d = ev[k].k >= 2 ? swell.big : swell.kill; if (d >= aim || hold < t) { aim = Math.max(d, hold < t ? 0 : aim); } hold = t + 0.35; k++; }
        if (hold < t) aim = 0;
        db += (aim - db) * (aim > db ? atk : rel);
        // fade the bed in over the first second and out over the last
        const fade = Math.min(1, (i - a0) / sr, (a1 - i) / sr), g = bed * Math.pow(10, db / 20) * fade, j = (i - a0) % n;
        L[i] += w[0][j] * g; R[i] += w[1][j] * g;
      }
    }
  }
  return said;
}

module.exports = { LINES, GENERAL, PRIO, plan, mix, readWav };
