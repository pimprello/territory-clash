// tc-sfx.js: Territory Clash's own sounds (Rellz, 2026-11-16: "make the sfx unique for each game ... an overall medieval theme").
// Army Clash and Tower Clash share the engine's synth sounds; Territory Clash builds its own from the same synth's voice():
// war-drum taps for orders, steel on steel and a little chapel chime for captures, a war horn and falling stone when a capital
// falls, shields for head-on clashes, a church bell for pacts and the end, herald trumpets for a new leader. Sound only.
'use strict';
const TAU = Math.PI * 2;
// a small hash for variety (never the battle's dice): the same battle always sounds the same
const hv = (a, b) => { let x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x); };
const brass = (f, n = 7, dec = 0.5) => Array.from({ length: n }, (_, i) => ({ f: f * (i + 1), f2: f * (i + 1) * 1.004, a: 1 / Math.pow(i + 1, 0.8), decay: dec / (1 + i * 0.15) }));
const bellP = f => [[0.5, 0.5, 2.2], [1, 1, 1.6], [1.19, 0.6, 1.1], [1.5, 0.45, 0.9], [2, 0.5, 0.8], [2.51, 0.3, 0.55], [2.98, 0.25, 0.45], [4.07, 0.15, 0.3]].map(([r, a, d]) => ({ f: f * r, a, decay: d }));
// the kingdom's own pitch for its capture chime (a pentatonic step each), so captures make little tunes
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];

function make(synth) {
  const v = (t, o) => synth.voice(t, o);
  const S = {
    // an order: a soft leather war-drum tap
    order(t, pan, n) { if (!synth.gate('tc-order', 0.07, t)) return; v(t, { dur: 0.22, gain: 0.09, pan, partials: [{ f: 150 + 30 * hv(n, 1), f2: 88, decay: 0.07, glide: 0.04 }, { f: 260, a: 0.25, decay: 0.03 }], noise: { a: 0.45, decay: 0.018, lp: 0.25 } }); },
    // a capture: steel on steel, and the taker's chime
    capture(t, pan, n, k) {
      if (synth.gate('tc-steel', 0.05, t)) {
        const j = 1 + 0.06 * (hv(n, 2) - 0.5);
        v(t, { dur: 0.45, gain: 0.07, pan, partials: [2380, 3150, 4720, 6230].map((f, i) => ({ f: f * j, a: [1, 0.7, 0.45, 0.3][i], decay: [0.16, 0.11, 0.07, 0.05][i] })), noise: { a: 0.6, decay: 0.012, lp: 0.8, hp: true } });
        v(t, { dur: 0.15, gain: 0.08, pan, partials: [{ f: 130, f2: 95, decay: 0.05 }], noise: { a: 0.4, decay: 0.02, lp: 0.2 } });
      }
      if (synth.gate('tc-chime', 0.11, t)) { const f = 523.25 * Math.pow(2, PENTA[(k * 3 + Math.floor(hv(n, 3) * 3)) % PENTA.length] / 12); v(t + 0.02, { dur: 0.9, gain: 0.035, pan: pan * 0.6, partials: [{ f, decay: 0.35 }, { f: f * 2, a: 0.35, decay: 0.2 }, { f: f * 3.01, a: 0.15, decay: 0.12 }] }); }
    },
    // a capital falls: a war horn, stone crumbling, a deep boom
    capital(t, pan) {
      v(t, { dur: 1.4, gain: 0.11, pan: pan * 0.5, attack: 0.07, partials: brass(110, 8, 0.7) });
      v(t + 0.32, { dur: 1.2, gain: 0.08, pan: pan * 0.5, attack: 0.05, partials: brass(82.4, 8, 0.6) });
      v(t, { dur: 1.4, gain: 0.22, pan, partials: [{ f: 62, f2: 38, decay: 0.35, glide: 0.2 }], noise: { a: 0.9, decay: 0.45, lp: 0.12 } });
      for (let i = 0; i < 6; i++) v(t + 0.08 + i * 0.09 + hv(i, 4) * 0.05, { dur: 0.2, gain: 0.06, pan: pan + (hv(i, 5) - 0.5) * 0.4, partials: [{ f: 180 + 200 * hv(i, 6), decay: 0.04 }], noise: { a: 0.8, decay: 0.05, lp: 0.3 } });
    },
    // armies meet head-on on a road: shields and a grunt of steel
    clash(t, pan) { if (!synth.gate('tc-clash', 0.09, t)) return; v(t, { dur: 0.3, gain: 0.13, pan, partials: [{ f: 190, f2: 120, decay: 0.06 }, { f: 410, a: 0.4, decay: 0.04 }, { f: 1830, a: 0.15, decay: 0.05 }], noise: { a: 0.8, decay: 0.05, lp: 0.45 } }); },
    // the church bell (pacts, the end of the war)
    bell(t, f = 196, gain = 0.09, pan = 0) { v(t, { dur: 3.2, gain, pan, partials: bellP(f) }); },
    // a herald's two-note trumpet (a new kingdom leads)
    herald(t, pan) { if (!synth.gate('tc-herald', 1.2, t)) return; v(t, { dur: 0.22, gain: 0.05, pan, attack: 0.02, partials: brass(523.25, 6, 0.3) }); v(t + 0.16, { dur: 0.5, gain: 0.055, pan, attack: 0.02, partials: brass(784, 6, 0.4) }); },
    // dawn / a new start: a rising horn call
    call(t, pan) { v(t, { dur: 0.5, gain: 0.07, pan, attack: 0.05, partials: brass(196, 7, 0.4) }); v(t + 0.35, { dur: 0.9, gain: 0.08, pan, attack: 0.05, partials: brass(293.7, 7, 0.6) }); },
    // a kingdom loses its last land: a low falling horn
    mourn(t, pan) { v(t, { dur: 1.3, gain: 0.08, pan, attack: 0.1, partials: brass(196, 7, 0.9).map(p => ({ ...p, f2: p.f * 0.75, glide: 0.5 })) }); },
    // last orders: a war-drum roll
    roll(t) { for (let i = 0; i < 14; i++) v(t + i * 0.055, { dur: 0.15, gain: 0.04 + 0.05 * (i / 13), partials: [{ f: 120, f2: 80, decay: 0.05 }], noise: { a: 0.5, decay: 0.02, lp: 0.3 } }); },
    // the final seconds' clock tick (a wooden block)
    tick(t, sec) { const f = 1050 + (5 - sec) * 90; v(t, { dur: 0.1, gain: 0.13, partials: [{ f, decay: 0.025 }, { f: f * 2.4, a: 0.35, decay: 0.012 }], noise: { a: 0.3, decay: 0.006, lp: 0.6 } }); },
    // the conquest: a horn chord and a crash of stone
    conquest(t) { for (const f of [146.8, 220, 293.7]) v(t, { dur: 1.8, gain: 0.07, attack: 0.04, partials: brass(f, 7, 0.9) }); v(t, { dur: 1.2, gain: 0.25, partials: [{ f: 55, f2: 35, decay: 0.4, glide: 0.2 }], noise: { a: 0.9, decay: 0.5, lp: 0.15 } }); },
  };
  return S;
}
module.exports = { make };
