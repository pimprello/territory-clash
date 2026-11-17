// Territory Clash: Rellz's picks (rules.picks, 2026-11-16: 26 updates for all three Clash games), fitted to a territory war.
// Mixed into TCSim (tc-sim.js). Every kingdom has the same heroes and spells; they act on the orders (streams of troops) and holds.
//
//   troops   STONE GOLEM: a kingdom's capital that loses 40% of its troops in two seconds splits its golem in two, and the halves
//            march out to its nearest holds (+4 each). BARD: every 9 s a kingdom's bard sings and its orders march 30% faster for 3 s.
//            PLAGUE DOCTOR: an attack on a big hold carries a plague flask: the hold stops growing and its own orders crawl for 5 s.
//            MIMIC CHEST: one neutral village is a chest; it bites the first six troops that arrive. GHOST KNIGHT: a kingdom's first
//            head-on clash, its ghost knight leads its troops straight through for 2 s. BATTERING RAM: an attack of 16+ on a fort or
//            capital is led by a ram (the hold's defence counts as plain, and siege walls break). TRAITOR: a hold of 12+ that falls
//            below half while under attack loses three traitors, who march off to the attacker. BOMB RATS: once a battle each kingdom
//            looses eight rats at its strongest neighbour; each kills two defenders, but rats never take land.
//   spells   twice a battle (at 24 s and 42 s) each kingdom casts the spell it wants most (no dice): LIGHTNING CHAIN (the five nearest
//            enemy orders lose their three front troops), FROST NOVA (enemy orders at its holds freeze for 3 s), HEALING RAIN (its holds
//            round the weakest gain 1.2 troops a second for 6 s), SMOKE BOMB (for 6 s enemies can't see its holds to attack them),
//            SHIELD WALL (its most threatened hold blocks every other arriving troop for 6 s), VAMPIRE BITE (for 8 s a quarter of the
//            defenders its troops kill join its hold they came from).
//   modes    KING OF THE HILL (the middle hold is a hill: hold it 25 s in all and you win at the bell), TUG OF WAR (a rope on the land
//            bar; the side the knot is pulled away from grows 15% faster), SIEGE (one kingdom's capital and nearest holds are walled,
//            the other starts one hold bigger, and only rams break walls), BOSS RUSH (one Titan Empire with a huge capital against three
//            kingdoms in an alliance for the first 30 s). LAST STAND: a kingdom down to its last hold defends and grows 50% harder.
// Off unless rules.picks is on (old seeds play as before). Own dice (seed ^ 0x91C4A6); the battle clock only.
'use strict';
const D = require('./tc-data.js');

Object.assign(D.MODES, {
  hill: { name: 'King of the Hill', k: 3, cells: [20, 24], hook: 'WHO HOLDS THE HILL?', start: 2, hill: true,
    line: 'King of the Hill: the hold in the middle of the island is a hill; a kingdom that holds it for 25 seconds in all wins at the bell, whatever its land.' },
  tug: { name: 'Tug of War', k: 2, cells: [16, 19], hook: 'WHO PULLS THE ROPE?', start: 2, rivals: true, tug: true,
    line: 'Tug of War: two rivals pull a rope across the land bar; the side it is pulled away from grows troops 15% faster, so it never stays one-sided for long.' },
  siege: { name: 'The Siege', k: 2, cells: [17, 20], hook: 'CAN THE WALLS HOLD?', start: 2, siege: true,
    line: 'The Siege: one kingdom sits behind walls (its capital and nearest holds defend more than twice as hard until a battering ram breaks them); the other starts with one more hold.' },
  boss: { name: 'Boss Rush', k: 4, cells: [22, 25], hook: '3 KINGDOMS vs 1 TITAN EMPIRE', start: 2, boss: true,
    line: 'Boss Rush: one kingdom is a Titan Empire with a giant capital; the other three hold an alliance against it for the first 30 seconds.' },
});
const SPELLS = { chain: 'LIGHTNING CHAIN', nova: 'FROST NOVA', rain: 'HEALING RAIN', smoke: 'SMOKE BOMB', shield: 'SHIELD WALL', vamp: 'VAMPIRE BITE' };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

module.exports = {
  pkInit(S) {
    const C = this.cells, M = D.MODES[this.mode];
    this.PKR = S(0x91C4A6);
    const nk = this.K.length;
    this.pkS = { clouds: [], rains: [], smokes: [], shields: [], fx: [], vampT: new Array(nk).fill(0), songT: new Array(nk).fill(0), songAt: this.K.map((_, k) => 4 + k * 2.2),
      golem: new Array(nk).fill(false), ghost: new Array(nk).fill(false), traitor: new Array(nk).fill(false), rats: this.K.map((_, k) => 13 + k * 3.1), ram: new Array(nk).fill(false),
      plagueAt: new Array(nk).fill(6), ls: new Array(nk).fill(false), spellAt: [24, 42], spells: [], hill: null, tug: null, samp: 0, hist: {}, firstCap: false };
    // the mimic: a neutral village far from every capital
    if (this.pk.mimic !== false) {
      const H = this.caps.map(i => this.hopsFrom(i));
      const cand = C.filter(c => c.owner < 0 && c.type === 'village').sort((a, b) => Math.min(...H.map(h => h[b.id])) - Math.min(...H.map(h => h[a.id])) || a.id - b.id);
      if (cand.length) { const c = cand[Math.floor(this.PKR() * Math.min(3, cand.length))]; c.mimic = 6; }
    }
    if (M.hill) {
      const hill = C.reduce((b, c) => (Math.hypot(c.x - 540, c.y - 960) < Math.hypot(b.x - 540, b.y - 960) ? c : b));
      if (hill.owner < 0) { hill.hill = true; hill.name = 'THE HILL'; hill.mimic = 0; this.pkS.hill = { id: hill.id, held: this.K.map(() => 0), goal: this.pk.hillTarget ?? 25, mp: false }; }
    }
    if (M.tug) this.pkS.tug = { k: 0.5 };
    if (M.siege) {
      // kingdom 0 sits behind walls; kingdom 1 starts with two more holds
      const cap = C[this.caps[0]];
      cap.walls = true; for (const j of cap.nb) if (C[j].owner === 0) C[j].walls = true;
      const h = this.hopsFrom(this.caps[1]);
      C.filter(c => c.owner < 0 && h[c.id] <= 2 && c.type !== 'crown').sort((a, b) => h[a.id] - h[b.id] || a.id - b.id).slice(0, 1).forEach(c => { c.owner = 1; c.n = 8; c.owner0 = 1; c.n0 = 8; });
    }
    if (M.boss) { const cap = C[this.caps[0]]; cap.titan = true; cap.n = cap.n0 = 32; }
  },
  hopsFrom(id) { const C = this.cells, h = new Array(C.length).fill(99); h[id] = 0; const q = [id]; while (q.length) { const i = q.shift(); for (const j of C[i].nb) if (h[j] > h[i] + 1) { h[j] = h[i] + 1; q.push(j); } } return h; },
  pkBlocked(k, o) { return D.MODES[this.mode].boss && this.t < 30 && k !== 0 && o !== 0; },
  // smoke: enemies can't see holds inside it
  pkHidden(k, b) { for (const s of this.pkS.smokes) if (this.t < s.end && s.k !== k && b.owner === s.k && dist(b, s) < s.r) return true; return false; },
  pkGrow(c, g) {
    const t = this.t, S = this.pkS;
    if (c.plagueT > t) return 0;
    for (const r of S.rains) if (t < r.end && r.k === c.owner && dist(c, r) < r.r) g += 1.2 * this.tempo;
    if (c.titan) g *= 1.6;
    if (c.lastStand) g *= 1.5;
    const G = S.tug;
    if (G && c.owner >= 0) { const lag = c.owner === 0 ? 0.5 - G.k : G.k - 0.5; if (lag > 0.1) g *= 1.15; }
    return g;
  },
  pkSpeed(s) { const t = this.t; let v = 1; if (this.pkS.songT[s.k] > t) v *= 1.3; if (s.frozeT > t) v = 0; const c = this.cells[s.from]; if (c.plagueT > t && c.owner === s.k) v *= 0.6; return v; },
  // a ghost knight leads a kingdom's first head-on clash straight through for 2 s
  pkPass(A, B) {
    const t = this.t, S = this.pkS;
    if (A.phaseT > t || B.phaseT > t) return true;
    if (A.packets.length && B.packets.length && A.packets[0] + B.packets[0] >= A.len - 30) {
      for (const X of [A, B]) if (!S.ghost[X.k] && X.packets.length >= 6) { S.ghost[X.k] = true; X.phaseT = t + 2; X.hero = X.hero || 'ghostknight'; this.note('pk', { what: 'ghost', k: X.k, to: X.to }); return true; }
    }
    return false;
  },
  pkOrder(st, a, b) {
    const t = this.t, S = this.pkS, k = st.k, P = this.pk;
    if (st.why !== 'attack') return;
    if ((b.type === 'fort' || b.type === 'capital' || b.walls) && st.sent >= 16 && P.ram !== false) { st.ram = true; st.hero = 'ram'; if (!S.ram[k]) { S.ram[k] = true; this.note('pk', { what: 'ram', k, to: b.id }); } }
    else if (b.n >= 16 && t >= S.plagueAt[k] && P.plague !== false) { S.plagueAt[k] = t + 12; st.plague = true; st.hero = 'plaguedoctor'; }
  },
  pkDef(s, c) {
    let d = this.defOf(c);
    if (c.walls) d *= 2.2;
    if (c.titan) d *= 1.4;
    if (c.lastStand) d *= 1.5;
    if (s.ram) d = Math.min(d, 1) * 0.8;
    return d;
  },
  // an arriving troop: the mimic bites, shields block, rats explode, rams break walls, plague lands, vampires drink
  pkArrive(s, c) {
    const t = this.t, S = this.pkS;
    if (c.mimic > 0 && c.owner < 0) { if (c.mimic === 6) this.note('pk', { what: 'mimic', k: s.k, cell: c.id }); c.mimic--; c.biteT = t; return true; }
    for (const sh of S.shields) if (t < sh.end && sh.cell === c.id && sh.k === c.owner) { sh.n = (sh.n || 0) + 1; if (sh.n % 2) { sh.hitT = t; return true; } }
    if (s.ram && c.walls) { c.walls = false; c.wallFellT = t; this.note('pk', { what: 'walls', k: s.k, cell: c.id }); }
    if (s.plague && !s.plagued) { s.plagued = true; c.plagueT = t + 5; S.clouds.push({ cell: c.id, x: c.x, y: c.y, t0: t, end: t + 5 }); this.note('pk', { what: 'plague', k: s.k, cell: c.id }); }
    const killed = Math.min(Math.max(0, c.n), 1 / this.pkDef(s, c));
    (c.pkHits || (c.pkHits = [])).push([t, killed]); if (c.pkHits.length > 80) c.pkHits.shift();
    if (S.vampT[s.k] > t) { const from = this.cells[s.from]; if (from.owner === s.k) from.n = Math.min(this.capOf(from), from.n + killed * (this.pk.vampShare ?? 0.25)); }
    if (s.rats) { c.n = Math.max(0, c.n - 2); c.ratT = t; return true; }
    // a traitor: a big hold falling below half under attack sends three of its troops over to the attacker
    if (c.owner >= 0 && !S.traitor[c.owner] && this.pk.traitor !== false) {
      const h = S.hist[c.id];
      if (h && h.n0 >= 12 && c.n < h.n0 * 0.5 && c.n >= 4) {
        const from = this.cells[s.from];
        if (from.owner === s.k && c.nb.includes(from.id)) { S.traitor[c.owner] = true; this.note('pk', { what: 'traitor', k: s.k, k2: c.owner, cell: c.id }); this.order(s.k, c, from, 3, 'traitor'); this.streams[this.streams.length - 1].hero = 'traitor'; }
      }
    }
    return false;
  },
  pkCaptured(s, c, prev) {
    const S = this.pkS, from = this.cells[s.from];
    from.pkCaps = (from.pkCaps || 0) + 1;
    if (c.walls) c.walls = false;
    c.plagueT = 0; c.lastStand = false;
  },
  pkTick() {
    const t = this.t, S = this.pkS, C = this.cells, P = this.pk;
    // sample every hold twice a second (a siege's starting size, a capital's fall)
    if (t >= S.samp) {
      S.samp = t + 0.5;
      for (const c of C) {
        const h = S.hist[c.id] || (S.hist[c.id] = { q: [], n0: 0, own: c.owner });
        if (h.own !== c.owner) { h.q = []; h.own = c.owner; }
        h.q.push(c.n); if (h.q.length > 4) h.q.shift();
        h.n0 = Math.max(...h.q);
        // the stone golem: a capital that loses 40% in two seconds splits its golem in two
        // (only what attackers killed counts: troops sent out on orders don't)
        const lost = c.pkHits ? c.pkHits.reduce((a, [ht, n]) => (t - ht < 2 ? a + n : a), 0) : 0;
        if (P.golem !== false && c.type === 'capital' && c.owner >= 0 && this.caps[c.owner] === c.id && !S.golem[c.owner] && h.n0 >= 12 && lost >= h.n0 * 0.4) {
          const k = c.owner, to = c.nb.map(j => C[j]).filter(o => o.owner === k).sort((a, b) => a.n - b.n || a.id - b.id).slice(0, 2);
          const tgt = to.length ? to : c.nb.map(j => C[j]).filter(o => o.owner !== k && !this.blocked(k, o.owner)).sort((a, b) => a.n - b.n || a.id - b.id).slice(0, 2);
          if (tgt.length) {
            S.golem[k] = true; c.n += 4 * tgt.length; this.note('pk', { what: 'split', k, cell: c.id });
            for (const b of tgt) { this.order(k, c, b, 4, b.owner === k ? 'move' : 'attack'); this.streams[this.streams.length - 1].hero = 'golemling'; this.streams[this.streams.length - 1].allHero = true; }
          }
        }
      }
      // the last stand: a kingdom down to its last hold (with rivals still standing) fights from it 50% harder
      if (P.lastStand !== false && t > 8) this.K.forEach((K, k) => {
        if (S.ls[k] || this.out[k] != null) return;
        const own = this.cellsOf(k), rivals = this.K.some((_, o) => o !== k && this.out[o] == null);
        if (own.length === 1 && rivals) { S.ls[k] = true; own[0].lastStand = true; this.note('pk', { what: 'laststand', k, cell: own[0].id }); }
      });
      // the hill: whoever holds it scores
      const Hh = S.hill;
      if (Hh) {
        const o = C[Hh.id].owner;
        if (o >= 0) { Hh.held[o] += 0.5; if (Hh.held[o] >= Hh.goal && !Hh.mp) { Hh.mp = true; this.note('pk', { what: 'matchpoint', k: o, cell: Hh.id }); } }
      }
      const G = S.tug;
      if (G) { const a = this.cellsOf(0).length, b = this.cellsOf(1).length; G.k = a + b ? a / (a + b) : 0.5; }
    }
    // the bards sing every 9 s
    if (P.bard !== false) this.K.forEach((K, k) => { if (t >= S.songAt[k] && this.out[k] == null) { S.songAt[k] = t + 9; S.songT[k] = t + 3; if (t < 12) this.note('pk', { what: 'song', k }); } });
    // bomb rats, once a battle each
    if (P.rats !== false) this.K.forEach((K, k) => {
      if (S.rats[k] == null || t < S.rats[k] || this.out[k] != null) return;
      S.rats[k] = null;
      const own = this.cellsOf(k); if (!own.length) return;
      let best = null; for (const a of own) for (const j of a.nb) { const b = C[j]; if (b.owner < 0 || b.owner === k || this.blocked(k, b.owner)) continue; if (!best || b.n > best.b.n) best = { a, b }; }
      if (!best) return;
      best.a.n += 8; this.order(k, best.a, best.b, 8, 'rats'); const st = this.streams[this.streams.length - 1]; st.rats = true; st.hero = 'bombrat'; st.allHero = true;
      this.note('pk', { what: 'rats', k, to: best.b.id });
    });
    // the spells
    if (P.spells !== false) for (let i = 0; i < S.spellAt.length; i++) if (S.spellAt[i] != null && t >= S.spellAt[i]) {
      S.spellAt[i] = null;
      this.K.forEach((K, k) => { if (this.out[k] == null && this.cellsOf(k).length) this.pkCast(k); });
    }
    S.rains = S.rains.filter(r => t < r.end); S.smokes = S.smokes.filter(r => t < r.end + 0.8); S.shields = S.shields.filter(r => t < r.end + 0.6); S.clouds = S.clouds.filter(r => t < r.end + 0.8);
  },
  pkThreat(k) {
    const C = this.cells, th = new Map();
    for (const s of this.streams) if (s.k !== k && C[s.to].owner === k) th.set(s.to, (th.get(s.to) || 0) + s.packets.length + s.left);
    return th;
  },
  pkCast(k) {
    const t = this.t, S = this.pkS, C = this.cells, own = this.cellsOf(k), th = this.pkThreat(k);
    const enemyIn = this.streams.filter(s => s.k !== k && C[s.to].owner === k && s.packets.length);
    const near = this.streams.filter(s => s.k !== k && s.packets.length && own.some(c => dist(c, C[s.to]) < 260));
    const hurt = own.reduce((a, c) => (!a || c.n < a.n ? c : a), null);
    let maxTh = 0, hot = null; for (const [id, n] of th) if (n > maxTh) { maxTh = n; hot = C[id]; }
    const mine = this.streams.filter(s => s.k === k && s.why === 'attack' && s.packets.length).length;
    const want = { chain: near.length * 0.35, nova: enemyIn.length * 0.4 + maxTh * 0.02, rain: own.length * 0.08 + (hurt && hurt.n < 8 ? 0.4 : 0), smoke: enemyIn.length * 0.25 + 0.1, shield: maxTh * 0.05, vamp: mine * 0.35 + 0.05 };
    const used = S.spells.filter(x => x.k === k).map(x => x.kind);
    const kind = Object.keys(want).filter(x => !used.includes(x)).sort((a, b) => want[b] - want[a] || a.localeCompare(b))[0];
    if (!kind || want[kind] <= 0) return;
    const spot = hot || hurt || own[0];
    S.spells.push({ k, kind, t });
    switch (kind) {
      case 'chain': {
        const list = near.sort((a, b) => dist(C[a.to], spot) - dist(C[b.to], spot) || a.id - b.id).slice(0, 5), pts = [];
        for (const s of list) { const n = Math.min(3, s.packets.length); s.packets.splice(0, n); pts.push({ s: s.id, from: s.from, to: s.to, d: s.packets[0] ?? 0 }); }
        S.fx.push({ kind: 'chain', k, t0: t, pts });
        break;
      }
      case 'nova': for (const s of enemyIn) if (dist(C[s.to], spot) < 320) s.frozeT = t + (this.pk.novaSecs ?? 3); S.fx.push({ kind: 'nova', k, t0: t, x: spot.x, y: spot.y }); break;
      case 'rain': S.rains.push({ k, x: spot.x, y: spot.y, r: 260, t0: t, end: t + 6 }); break;
      case 'smoke': S.smokes.push({ k, x: spot.x, y: spot.y, r: 220, t0: t, end: t + 6 }); break;
      case 'shield': S.shields.push({ k, cell: spot.id, x: spot.x, y: spot.y, t0: t, end: t + 6 }); break;
      case 'vamp': S.vampT[k] = t + (this.pk.vampSecs ?? 8); S.fx.push({ kind: 'vamp', k, t0: t }); break;
    }
    this.note('pk', { what: 'spell', spell: kind, k, cell: spot.id });
  },
  // King of the Hill: at the bell, a kingdom that held the hill for its target wins (the longest holder first)
  pkRank(rank, how) {
    const Hh = this.pkS.hill;
    if (!Hh || how !== 'bell') return rank;
    const best = rank.slice().sort((a, b) => Hh.held[b] - Hh.held[a])[0];
    if (Hh.held[best] < Hh.goal) return rank;
    this.hillWin = best;
    return [best].concat(rank.filter(k => k !== best));
  },
  SPELLS,
};
