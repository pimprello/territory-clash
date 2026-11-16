// Territory Clash: plans one Short. Picks the mode and the kingdoms for the slot, auditions candidate battles (several seeds,
// each tuned for tempo so the war is decided late and close), keeps the most dramatic, and writes everything the upload and
// the review need: title, description, tags, the beat sheet, the on-screen notices and the thumbnail moment.
// Used by package.js (the daily review packages) and, once it exists, render.js (the video).
'use strict';
const D = require('./tc-data.js');
const { TCSim, rng, FIGHT } = require('./tc-sim.js');

const PRE = 4.6;        // face-off (2.6 s) + the map wakes / MARCH! (2.0 s), before battle time 0
const OUTRO = 3;
const tc = s => String(s).toLowerCase().replace(/(^|[\s-])([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/\b(Of|The|And)\b/g, w => w.toLowerCase()).replace(/^./, c => c.toUpperCase());
const kName = k => tc(D.KINGDOMS[k].name);
const kShort = k => D.KINGDOMS[k].short || D.KINGDOMS[k].name;
const listOf = a => { a = a.map((n, i) => (i ? n.replace(/^The /, 'the ') : n)); return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; };
const vt = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;

// ----- the line-up for a slot -----
function chooseKingdoms(mode, R, past, gap, force) {
  const M = D.MODES[mode];
  if (force) return force;
  const uses = {}; for (const k of D.KINGDOM_KEYS) uses[k] = 0;
  for (const v of past) for (const k of v.kingdoms || []) uses[k]++;
  if (M.rivals) {
    // the rivalry whose two kingdoms have been seen least (ties: the order in RIVALS, so all six come round)
    const fed = past.filter(v => v.mode === 'feud').map(v => v.kingdoms.slice().sort().join());
    const r = D.RIVALS.slice().sort((x, y) => (uses[x.a] + uses[x.b] + 3 * fed.filter(f => f === [x.a, x.b].sort().join()).length) - (uses[y.a] + uses[y.b] + 3 * fed.filter(f => f === [y.a, y.b].sort().join()).length) || D.RIVALS.indexOf(x) - D.RIVALS.indexOf(y))[0];
    return R() < 0.5 ? [r.a, r.b] : [r.b, r.a];
  }
  // every line-up with clear colours (at least 30 apart, Army Clash's minColourGap); the one with the kingdoms seen least
  // wins, the dice break ties, so all twelve come round
  const keys = D.KINGDOM_KEYS, combos = [];
  const rec = (start, ks) => {
    if (ks.length === M.k) { combos.push({ ks: ks.slice(), sc: ks.reduce((n, k) => n + uses[k], 0) + R() * 0.9 }); return; }
    for (let i = start; i < keys.length; i++) { const k = keys[i]; if (ks.every(o => gap(D.KINGDOMS[o].colour, D.KINGDOMS[k].colour) >= 30)) { ks.push(k); rec(i + 1, ks); ks.pop(); } }
  };
  rec(0, []);
  if (combos.length) {
    const ks = combos.sort((a, b) => a.sc - b.sc)[0].ks;
    // (Last Ember's underdog, listed first, is the least seen of the four)
    for (let i = ks.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [ks[i], ks[j]] = [ks[j], ks[i]]; }
    if (M.underdog) ks.sort((a, b) => uses[a] - uses[b]);
    return ks;
  }
  throw new Error('no line-up with clear colours for ' + mode);
}

// ----- audition: candidate seeds × tempos; keep the most dramatic -----
function audition(seed0, mode, kingdoms, n = 5) {
  const R = rng((seed0 ^ 0xA0D1710) >>> 0);
  const tempos = [0.85, 0.95, 1.05, 1.15, 1.3, 1.45];
  const under = D.MODES[mode].underdog;
  // Last Ember: the dice pick whether the smallest kingdom should survive (an even chance), then the search makes that
  // happen late and narrowly, like Tower Clash's close finish
  const wantSurvive = under ? R() < 0.5 : null;
  let best = null;
  for (let c = 0; c < n; c++) {
    const seed = (R() * 4294967296) >>> 0;
    for (const tempo of tempos) for (const up of under ? [0.8, 1, 1.2, 1.45] : [1]) {
      let s; try { s = new TCSim(seed, { kingdoms, mode, tempo, underdogPower: under ? up : undefined }).run(); } catch (e) { continue; }
      let d = s.drama();
      if (under) d += s.underdogSurvived === wantSurvive ? 30 : -30;
      if (!best || d > best.d) best = { d, seed, tempo, up: under ? up : undefined, sim: s };
    }
  }
  return best;
}

// ----- the moment for the thumbnail: the most even busy moment of the middle (never shows who wins) -----
function thumbMoment(s) {
  let best = null;
  for (const p of s.snaps) {
    if (p.t < 16 || p.t > 44) continue;
    const live = p.sc.filter(x => x > 0), spread = (Math.max(...live) - Math.min(...live)) / Math.max(1, live.reduce((a, b) => a + b, 0));
    // (and never a moment where the eventual winner is clearly ahead: the thumbnail mustn't hint at the result)
    const winLeads = p.sc[s.winner] > Math.max(...p.sc.filter((_, k) => k !== s.winner));
    const sc = p.flying * (1 - spread * 1.6) + p.streams * 4 - (winLeads ? 60 : 0);
    if (!best || sc > best.sc) best = { sc, t: p.t };
  }
  return best ? best.t : 30;
}

// ----- beats and notices from the battle's log -----
function beats(s) {
  const K = s.K, C = s.cells, L = s.log, nm = k => kShort(s.kingdoms ? s.kingdoms[k] : K[k].key);
  const N = []; // notices: one at a time (rules.ui.noStack), at least 2.4 s apart, most important first
  const add = (t, w, text, kind, extra) => N.push(Object.assign({ t, w, text, kind }, extra || {}));
  let firstCap = true;
  for (const e of L) {
    const a = e.k != null && e.k >= 0 ? K[e.k] : null, b = e.k2 != null && e.k2 >= 0 ? K[e.k2] : null;
    const A = a ? (a.short || a.name) : '', B = b ? (b.short || b.name) : '';
    switch (e.kind) {
      case 'capture': if (firstCap && e.k2 != null) { firstCap = false; add(e.t, 5, `FIRST BLOOD: ${A} TAKES ${C[e.cell].name}`, 'first'); } else if (e.type === 'crown') add(e.t, 9, `${A} SEIZES THE GREAT CROWN!`, 'crown'); else if (e.k2 >= 0 && e.type === 'fort') add(e.t, 4, `${A} STORMS ${C[e.cell].name}`, 'fort'); break;
      case 'capital': add(e.t, 10, `CAPITAL FALLS! ${A} TAKES ${C[e.cell].name}`, 'capital', { k: e.k, k2: e.k2 }); break;
      case 'out': break;
      case 'landless': add(e.t, 9, `${A} HAS NO LAND LEFT`, 'out', { k: e.k }); break;
      case 'betrayal': add(e.t, 10, `BETRAYAL! ${A} TURNS ON ${B}`, 'betrayal'); break;
      case 'pact': add(e.t, 8, `${A} AND ${B} SWEAR A PACT`, 'pact'); break;
      case 'pactEnd': add(e.t, 6, `THE PACT IS OVER`, 'pactEnd'); break;
      case 'lead': if (e.t > 8) add(e.t, 6, `${A} TAKES THE LEAD`, 'lead', { k: e.k }); break;
      case 'clash': add(e.t, 5, `MID-ROAD CLASH: ${A} vs ${B}`, 'clash'); break;
      case 'event': add(e.t, 10, `${D.EVENTS[e.event].name}!`, 'event', { event: e.event }); break;
      case 'mercs': if (e.t < 12) add(e.t, 2, `+5 HIRED SWORDS FOR ${A}`, 'mercs'); break;
      case 'dawn': if (e.t < 17) add(e.t, 2, `DAWN SURGE: SUNSPIRE +2 EVERYWHERE`, 'dawn'); break;
      case 'order': if (e.n >= 30 && e.target >= 0) add(e.t, 3, `${A} SENDS ${e.n} AT ${C[e.to].name}`, 'order'); else if (e.sea && e.n >= 16) add(e.t, 4, `${A} SAILS ON ${C[e.to].name}`, 'sea'); break;
      case 'lastOrders': add(e.t, 11, 'LAST ORDERS: 10 SECONDS, ALL IN!', 'last'); break;
    }
  }
  // Frostmere's running joke: it always moves last (only said when it's true)
  const fo = s.stat.firstOrder, fi = s.K.findIndex(k => k.key === 'frostmere');
  if (fi >= 0 && fo[fi] != null && fo.every((t, k) => k === fi || t == null || t < fo[fi])) add(fo[fi], 3, 'FROSTMERE FINALLY MOVES', 'joke');
  // Emberhold's: it forgets to guard home (its capital attacked while nearly empty)
  // (the capital notice already covers a fall; this one is for the near miss, picked from the stream log at render time)
  // keep the best notice in every 2.4 s window, never two at once
  // most important first; one that would overlap waits its turn (up to 2 s later) instead of being dropped
  N.sort((x, y) => y.w - x.w || x.t - y.t);
  const kept = [];
  for (const n of N) for (let d = 0; d <= 2.0; d += 0.2) { const t = n.t + d; if (t < FIGHT - 0.3 && kept.every(k => Math.abs(k.t - t) >= 2.4)) { kept.push(Object.assign(n, { t: +t.toFixed(2), late: d > 0 ? +d.toFixed(1) : 0 })); break; } }
  kept.sort((x, y) => x.t - y.t);
  return kept.filter((n, i) => !i || n.text !== kept[i - 1].text);
}

function makeShort({ seed, mode, kingdoms, past = [], gap = () => 99, slot = 0, palettes = {} }) {
  const R = rng((seed ^ 0x5107) >>> 0);
  const ks = chooseKingdoms(mode, R, past, gap, kingdoms);
  const best = audition(seed, mode, ks);
  const s = best.sim; s.kingdoms = ks;
  const M = D.MODES[mode], K = s.K;
  const names = ks.map(kName), win = ks[s.winner];
  const notices = beats(s);
  const rival = D.RIVALS.find(r => (r.a === ks[0] && r.b === ks[1]) || (r.b === ks[0] && r.a === ks[1]));
  // ----- title (true, never the result) -----
  const recent = new Set(past.slice(-14).map(v => v.titleKind));
  const cands = [];
  const bet = s.log.find(e => e.kind === 'betrayal'), pact = s.log.find(e => e.kind === 'pact');
  if (mode === 'war') cands.push(['war', `4 Kingdoms. 1 Island. Who Rules It? 👑`]);
  if (mode === 'three') cands.push(['three', `3 Kingdoms Want The Same Island... Who Wins? ⚔️`]);
  if (mode === 'feud' && rival) cands.push(['feud', `${names[0]} vs ${names[1]}: ${tc(rival.name)} ${D.KINGDOMS[ks[0]].icon}`]);
  if (mode === 'feud') cands.push(['feudq', `${names[0]} or ${names[1]}: Who Takes The Island? ${D.KINGDOMS[ks[1]].icon}`]);
  if (mode === 'pact') cands.push(['pact', `They Swore A Pact... Can It Last? 🤝`]);
  if (bet && pact) cands.push(['betrayal', `The Pact Lasted ${Math.round(bet.t - pact.t)} Seconds 😳`]);
  if (mode === 'ember') cands.push(['ember', `1 Territory vs 3 Kingdoms: Can ${names[0]} Survive? 🕯️`]);
  if (mode === 'crown') cands.push(['crown', `Whoever Holds The Great Crown Wins 👑`]);
  const capFell = s.stat.capFell ? s.stat.capFell.size : 0;
  if (capFell >= 2) cands.push(['capitals', `${capFell} Capitals Fell... Who Rules The Map? 😱`]);
  if (s.how === 'bell' && s.margin <= 1 && mode !== 'feud') cands.push(['bell', `It Came Down To The Final Bell ⏳`]);
  if (ks.length >= 3 && names.join(' vs ').length <= 62) cands.push(['versus', `${names.join(' vs ')} ⚔️`]);
  const fresh = cands.filter(c => !recent.has(c[0]));
  const pool = fresh.length ? fresh : cands;
  // the strongest true hook first: a betrayal or fallen capitals beat the generic question
  const prio = ['betrayal', 'capitals', 'feud', 'ember', 'pact', 'crown', 'war', 'three', 'bell', 'versus', 'feudq'];
  pool.sort((a, b) => prio.indexOf(a[0]) - prio.indexOf(b[0]));
  const [titleKind, title] = pool[0];
  const altTitles = cands.filter(c => c[1] !== title).map(c => c[1]);
  // ----- description and tags (Tower Clash's layout) -----
  // the map's look turns with the slot, skipping any whose bare land could be mistaken for a kingdom in this battle
  const rgb = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const near = (a, b) => { const A = rgb(a), B = rgb(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
  const themeOk = th => ks.every(k => near(D.THEMES[th].ground[0], palettes[D.KINGDOMS[k].colour].c) > 90);
  s.themeKey = [0, 1, 2, 3, 4, 5].map(i => D.THEME_KEYS[(slot + i) % D.THEME_KEYS.length]).find(themeOk) || D.THEME_KEYS[slot % D.THEME_KEYS.length];
  const map = D.THEMES[s.themeKey];
  const related = past.filter(v => v.id).pop();
  const lead = mode === 'feud' && rival
    ? `${names[0]} and ${names[1]} have hated each other since the Crown shattered (${tc(rival.name)}: ${rival.line.toLowerCase()}). Sixty seconds, one island, every territory a fight. Who takes the land? Call it in the comments before the end!`
    : mode === 'pact' ? `${listOf(names)} wake on the same island, and two of them swear a pact against the other two. Every order is a drag across the map; every territory is a fight. Who rules the island at the bell? Call it in the comments before the end!`
    : mode === 'ember' ? `${names[0]} starts with nothing but its capital. ${listOf(names.slice(1))} start with three territories each. Can the smallest kingdom survive to the bell? Call it in the comments before the end!`
    : mode === 'crown' ? `${listOf(names)} race for the Great Crown in the middle of the island: whoever holds it at the bell counts it as five territories. Who takes it? Call it in the comments before the end!`
    : `${listOf(names)} wake on the same island. Every order is a drag across the map; every territory is a fight. Who rules the island at the bell? Call it in the comments before the end!`;
  const description = [
    lead,
    ...(related ? [`▶ Watch next: ${related.title} https://youtube.com/shorts/${related.id}`] : []),
    '',
    `A 60-second territory war simulation on ${tc(map.name)}. Every territory grows troops; each kingdom drags its armies across its borders to capture the land next door, and armies that meet head-on on a road cancel out. ${M.line} The outcome comes from the game's rules and chance, not real footage, and the kingdoms are made up.`,
    '',
    `Kingdoms in this battle: ${ks.map((k, i) => `${i ? kName(k).replace(/^The /, 'the ') : kName(k)} ${D.KINGDOMS[k].icon}`).join(', ')}.`,
    '',
    'New territory wars 4 times a day: subscribe so you don\'t miss the next one.',
    '',
    '#shorts #territoryclash #strategy #simulation #conquest',
  ].join('\n');
  const tags = [...new Set(['territory war', 'territory clash', 'conquest', 'kingdoms', 'map game', 'strategy game', 'battle simulation', 'who wins', 'io games', 'capture the map',
    ...names.map(n => n.toLowerCase().replace(/^the /, '')), map.name.toLowerCase().replace(/^the /, ''), M.name.toLowerCase(), 'shorts'])];
  // ----- the beat sheet (video time = battle time + PRE) -----
  const sheet = [];
  sheet.push([0, 'FACE-OFF', ks.length === 2 ? `Electric face-off (faceoff.js, as Army/Tower Clash): ${names[0]}'s ${K[0].champion} (top, ${K[0].colour}) vs ${names[1]}'s ${K[1].champion} (bottom, ${K[1].colour}); lightning seam, VS slam. Question: ${M.hook}` : `Crown-split face-off (NEW, faceoff.js variant): the screen splits into ${ks.length} wedges round a centre, each kingdom's champion in a ring on its colour with its crest and motto; lightning down every seam, WAR slams in the middle. Question: ${M.hook}`]);
  sheet.push([2.6, 'THE MAP WAKES', `White flash onto the island (${tc(map.name)}). Capitals raise their banners one by one, kingdom crests over them; READY… (war horn).`]);
  sheet.push([3.7, 'MARCH!', 'MARCH! slams in with each colour slashing across and the war cry (Army Clash\'s charge sound); the first orders draw themselves from every capital.']);
  for (const n of notices) sheet.push([+(n.t + PRE).toFixed(1), n.kind.toUpperCase(), n.text]);
  sheet.push([+(FIGHT + PRE).toFixed(1), 'THE BELL', `The bell tolls; the land bar locks; each kingdom's territories tick up one by one beside its crest. ${s.how === 'bell' ? (s.margin === 0 ? 'Level on land: the troop count decides it.' : s.margin === 1 ? 'Decided by a single territory.' : '') : ''}`]);
  sheet.push([+(FIGHT + PRE + 0.8).toFixed(1), 'RESULT (review only)', `${kShort(win)} RULES THE ISLAND · ${K.map((_, k) => `${kShort(ks[k])} ${s.score(k)}`).join(' · ')}${s.how === 'bell' && s.margin === 0 ? ' (level on land, won on troops)' : ''}${mode === 'ember' ? (s.underdogSurvived ? ` · ${kShort(ks[0])} SURVIVED` : ` · ${kShort(ks[0])} FELL`) : ''}`]);
  sheet.push([+(FIGHT + PRE + OUTRO - 0.45).toFixed(1), 'LOOP', 'The borders ink-wash back to the opening map and the frame crossfades into the face-off\'s first frame, so the replay is seamless.']);
  const total = FIGHT + PRE + OUTRO;
  return { seed: best.seed, tempo: best.tempo, underdogPower: best.up, drama: +best.d.toFixed(1), mode, kingdoms: ks, theme: s.themeKey, sim: s, notices, sheet, title, titleKind, altTitles, description, tags, thumbT: thumbMoment(s), seconds: total, winner: win, how: s.how, margin: s.margin, rival };
}

module.exports = { makeShort, chooseKingdoms, audition, beats, PRE, OUTRO, tc, kName, kShort, vt, listOf };
