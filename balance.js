// Balance check: many headless battles with random line-ups. Prints each kingdom's win rate against what a fair share
// would be, and how battles end. `node balance.js [battles] [mode]`. No drawing; about 50 ms a battle.
'use strict';
const { TCSim, rng } = require('./tc-sim.js');
const D = require('./tc-data.js');
const N = Number(process.argv[2] || 200), only = process.argv[3];
const gap = (() => { try { const E = require(process.env.ENGINE || '../tower-clash/engine.js')._; return (a, b) => E.colourGap(a, b); } catch (e) { return () => 99; } })();
const R = rng(0xBA1A7CE);
const stats = {}; for (const k of D.KINGDOM_KEYS) stats[k] = { games: 0, wins: 0, fair: 0, out: 0 };
const modes = only ? [only] : Object.keys(D.MODES);
const agg = {};
for (const mode of modes) {
  const M = D.MODES[mode], a = agg[mode] = { n: 0, conquest: 0, end: 0, caps: 0, leads: 0, captures: 0, margin0: 0, under: 0, crashes: 0, earlyOut: 0 };
  for (let i = 0; i < N; i++) {
    let ks;
    if (M.rivals) { const r = D.RIVALS[i % D.RIVALS.length]; ks = R() < 0.5 ? [r.a, r.b] : [r.b, r.a]; }
    else { ks = []; let guard = 0; while (ks.length < M.k && guard++ < 500) { const k = D.KINGDOM_KEYS[Math.floor(R() * 12)]; if (!ks.includes(k) && ks.every(o => gap(D.KINGDOMS[o].colour, D.KINGDOMS[k].colour) >= 30)) ks.push(k); } }
    let s;
    try { s = new TCSim((R() * 4294967296) >>> 0, { kingdoms: ks, mode, tempo: 1 }).run(); } catch (e) { a.crashes++; console.log(e.stack); continue; }
    a.n++; a.conquest += s.how === 'conquest'; a.end += s.endT; a.caps += s.stat.capitals; a.leads += s.stat.leadChanges; a.captures += s.stat.captures; a.margin0 += s.margin <= 1;
    if (s.stat.firstOut != null && s.stat.firstOut < 18) a.earlyOut++;
    if (M.underdog) a.under += !!s.underdogSurvived;
    ks.forEach((k, j) => { const st = stats[k]; st.games++; st.fair += 1 / ks.length; if (j === s.winner) st.wins++; if (s.out[j] != null) st.out++; });
  }
}
for (const [m, a] of Object.entries(agg)) console.log(`${m.padEnd(6)} ${a.n} battles · conquest ${Math.round(100 * a.conquest / a.n)}% · ends ${(a.end / a.n).toFixed(1)} s · captures ${(a.captures / a.n).toFixed(1)} · capitals ${(a.caps / a.n).toFixed(2)} · lead changes ${(a.leads / a.n).toFixed(1)} · margin<=1 ${Math.round(100 * a.margin0 / a.n)}% · first out <18 s ${Math.round(100 * a.earlyOut / a.n)}%${D.MODES[m].underdog ? ` · underdog survives ${Math.round(100 * a.under / a.n)}%` : ''}${a.crashes ? ` · CRASHES ${a.crashes}` : ''}`);
console.log('kingdom          games  wins  vs fair share');
for (const [k, s] of Object.entries(stats)) if (s.games) console.log(`${k.padEnd(14)} ${String(s.games).padStart(6)} ${String(s.wins).padStart(5)}  x${(s.wins / s.fair).toFixed(2)}  out ${Math.round(100 * s.out / s.games)}%`);
