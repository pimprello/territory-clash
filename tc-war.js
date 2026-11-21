// Territory Clash: the deeper war (rules.warfare; Rellz, 2026-11-17: "make updates less based on ui ... change all of
// territory clash updates why only rosegarde etc"). Twenty systems that change how every war plays, for every kingdom alike:
//
//   THE LAND     a river crosses the island: roads over it cross at FORDS (slow; quicker for a kingdom holding both banks) or
//                at a BRIDGE (fast, but it COLLAPSES under heavy traffic and drowns whoever is on it); FORESTS slow armies and
//                hide AMBUSHES on the roads beside them; one MOUNTAIN PASS, a crossroads that is very hard to take
//   THE PURSE    every 10 s each kingdom collects a TITHE of gold from its land, and spends it: MERCENARIES (a company that sails
//                in and attacks), FORTIFYING a threatened hold for 20 s, or SPIES (for 10 s it knows a rival's exact strength)
//   THE CROWN    each kingdom's CHAMPION rides fast between its holds to reinforce the one in danger, and leads its biggest
//                attacks (harder-hitting); two champions meeting in a mid-road clash fight a DUEL; a champion caught in a
//                fallen hold is taken HOSTAGE and ransomed for gold (or rescued); a kingdom whose capital falls crowns an
//                HEIR in a new seat, with a new temper (DYNASTY CHANGE)
//   THE REALM    holds cut off from their capital starve (SUPPLY LINES); a capital left nearly empty sparks a MUTINY; a
//                capital under heavy attack calls a RETREAT; a TRUCE or a ROYAL MARRIAGE between two kingdoms; a PLAGUE that
//                spreads village to village; a GOLDEN FIELD that rewards whoever holds it; RAIN that floods the fords; a
//                SHIPWRECK in a storm or rain
// Its own dice (W2R); nothing here touches the other systems' dice. Off (rules.warfare.on false), old seeds play as before.
'use strict';
const D = require('./tc-data.js');

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const HEIRS = { vengeful: 'VENGEFUL', steadfast: 'STEADFAST', swift: 'SWIFT' };

const WAR = {
  warSetup() {
    const C = this.cells, R = this.W2R, nk = this.K.length;
    this.gold = this.K.map(() => 0); this.goldT = 10;
    this.spy = this.K.map(() => null); this.nextSpy = this.K.map((_, k) => 14 + k * 3);
    this.lastMut = this.K.map(() => -99); this.lastRet = this.K.map(() => -99); this.econT = this.K.map((_, k) => 1 + k * 0.23);
    // ----- the land: forests, the mountain pass, the river with its fords and bridges -----
    const free = C.filter(c => c.type === 'village' && c.owner < 0);
    for (const c of C) if (c.type !== 'capital' && c.type !== 'crown' && R() < 0.24) c.forest = true;
    const pass = free.filter(c => !c.forest).sort((a, b) => b.nb.length - a.nb.length || a.id - b.id)[0];
    if (pass) { pass.type = 'pass'; const g = D.HOLDS.pass.garrison; pass.n = pass.n0 = Math.round(g[0] + R() * (g[1] - g[0])); }
    // the river: a gentle line across the island near its middle
    const ang = R() * Math.PI, ox = 540 + (R() - 0.5) * 160, oy = 960 + (R() - 0.5) * 200, dx = Math.cos(ang), dy = Math.sin(ang);
    this.river = { ox, oy, dx, dy, w: 4 + R() * 3, ph: R() * 6 };
    const side = p => Math.sign((p.x - ox) * dy - (p.y - oy) * dx);
    this.cross = {};
    const cr = [];
    for (const c of C) for (const j of c.nb) if (j > c.id && side(c) !== side(C[j])) {
      const b = C[j], ex = b.x - c.x, ey = b.y - c.y, den = ex * dy - ey * dx; if (Math.abs(den) < 1e-6) continue;
      const u = ((ox - c.x) * dy - (oy - c.y) * dx) / den, x = c.x + ex * u, y = c.y + ey * u;
      if (!this.inside(x, y)) continue;
      const k = { a: c.id, b: j, u, x, y, kind: 'ford', used: 0, broken: false };
      this.cross[c.id + ':' + j] = this.cross[j + ':' + c.id] = k; cr.push(k);
    }
    // one or two crossings are bridges (the busiest-looking: nearest the middle)
    cr.sort((p, q) => Math.hypot(p.x - 540, p.y - 960) - Math.hypot(q.x - 540, q.y - 960));
    cr.slice(0, cr.length > 3 ? 2 : Math.min(1, cr.length)).forEach(k => (k.kind = 'bridge'));
    this.crossings = cr;
    // ----- the champions: one per kingdom, at its capital -----
    this.champs = this.K.map((K, k) => { const c = C[this.caps[k]]; return { k, cell: c.id, x: c.x, y: c.y, path: null, on: null, hostage: -1, until: 0, wound: 0, next: 2 + k * 0.4 }; });
    // ----- the realm's events (their own dice) -----
    const big = nk >= 3 && this.mode !== 'pact';
    const roll = R();
    this.diplo = big ? (roll < 0.35 ? { kind: 'truce', t: 13 + R() * 9 } : roll < 0.7 ? { kind: 'marriage', t: 24 + R() * 10 } : null) : null;
    this.plague = R() < 0.5 ? { t: 14 + R() * 22, cells: [], done: false } : null;
    this.field = R() < 0.6 ? { t: 10 + R() * 24, cell: -1, done: false } : null;
  },
  // ----- who may attack whom -----
  allied(k, o) {
    if (o < 0 || k === o) return false;
    const P = this.ally; if (!P || !P.on) return false;
    return (P.a === k && P.b === o) || (P.b === k && P.a === o);
  },
  warBlocked(k, o) { return this.allied(k, o); },
  warDef(c) {
    let d = 1;
    if (c.wallT > this.t) d *= 1.5;
    const ch = this.champs.find(h => h.cell === c.id && !h.path && !h.on && h.hostage < 0 && h.wound <= this.t && h.k === c.owner);
    if (ch) d *= 1.25;
    if (c.forest) d *= 1.05;
    const K = c.owner >= 0 ? this.K[c.owner] : null; if (K && K.heir === 'steadfast') d *= 1.15;
    // a ford held on both banks: the holds either side defend a little harder
    if (c.owner >= 0) for (const j of c.nb) { const x = this.cross[c.id + ':' + j]; if (x && x.kind === 'ford' && this.cells[j].owner === c.owner) { d *= 1.05; break; } }
    return d;
  },
  warGrow(c) {
    if (c.cut) return 0;
    if (c.plagueT > this.t) return 0;
    const F = this.field; if (F && F.on && F.cell === c.id) return 4;
    return 1;
  },
  // the mind's view: spies make a kingdom bolder and keener against the kingdom it watches; an heir burns for revenge
  warValue(k, b) {
    let v = 1;
    const S = this.spy[k]; if (S && S.until > this.t && b.owner === S.on) v *= 1.35;
    const K = this.K[k]; if (K.heir === 'vengeful' && b.owner === K.foe) v *= 1.8;
    if (b.type === 'pass') v *= 1.2;
    const F = this.field; if (F && F.on && F.cell === b.id) v *= 2.2;
    return v;
  },
  warMargin(k, b) { const S = this.spy[k]; return S && S.until > this.t && b.owner === S.on ? 0.4 : 1; },
  warV(s) { let v = this.events.some(e => e.kind === 'rain' && e.on) ? 0.88 : 1; const K = this.K[s.k]; if (K.heir === 'swift') v *= 1.15; return v; },
  // ----- a new stream: its crossing, its forest edges, an ambush waiting on the road, a champion leading it -----
  warOrder(st) {
    const C = this.cells, a = C[st.from], b = C[st.to];
    const x = !st.sea && this.cross[a.id + ':' + b.id];
    if (x) { const u = x.a === a.id ? x.u : 1 - x.u; st.cx = x; st.cd = u * st.len; }
    st.fa = a.forest; st.fb = b.forest;
    // an ambush: an enemy's forest hold beside the road (next to both ends) strikes it halfway along
    if (!st.sea && !st.merc) {
      const amb = C.filter(c => c.forest && c.owner >= 0 && c.owner !== st.k && c.id !== a.id && c.id !== b.id && c.nb.includes(a.id) && c.nb.includes(b.id) && !this.allied(c.owner, st.k) && c.n >= 6);
      if (amb.length) st.amb = amb.sort((p, q) => q.n - p.n)[0].id;
    }
    // the champion rides with the kingdom's big attacks from the hold it stands in
    const ch = this.champs[st.k];
    if (ch && !ch.on && !ch.path && ch.hostage < 0 && ch.wound <= this.t && ch.cell === a.id && st.left >= 10 && st.why !== 'move' && st.why !== 'retreat') { ch.on = st.id; st.champ = st.k; st.punch = 1.3; }
  },
  // ----- marching: slower at fords, through forests and in the rain; bridges count who crosses; ambushes spring -----
  warMove(s, v, dt) {
    const P = s.packets, x = s.cx, rain = this.events.some(e => e.kind === 'rain' && e.on);
    if (x && x.kind === 'gone' && s.cutAt === undefined) {
      // the bridge is gone: troops reaching the gap are lost, and no more set off
      s.cutAt = s.cd;
      if (s.left > 0) { const a = this.cells[s.from]; if (a.owner === s.k) a.n += s.left; s.left = 0; }
    }
    let fk = 1;
    if (x && x.kind === 'ford') { const held = this.cells[x.a].owner === s.k && this.cells[x.b].owner === s.k; fk = (rain ? 0.4 : 0.7) * (held ? 1.3 : 1); }
    for (let i = 0; i < P.length; i++) {
      const d = P[i];
      let k = 1;
      if (x && Math.abs(d - s.cd) < 28) k *= fk;
      if ((s.fa && d < 60) || (s.fb && d > s.len - 60)) k *= 0.85;
      let nd = d + v * k * dt;
      if (i > 0 && nd > P[i - 1]) nd = P[i - 1];
      if (s.cutAt !== undefined && d < s.cutAt && nd >= s.cutAt) { P.splice(i, 1); i--; continue; }
      P[i] = nd;
      if (x && d < s.cd && nd >= s.cd && x.kind === 'bridge' && !x.broken) { x.used++; if (x.used >= 40) this.bridgeFalls(x); }
    }
    if (s.amb != null && !s.ambushed && P.length && P[0] >= s.len * 0.5) {
      s.ambushed = true;
      const c = this.cells[s.amb];
      if (c.owner >= 0 && c.owner !== s.k && !this.allied(c.owner, s.k) && c.n >= 4) {
        const n = Math.min(Math.floor((P.length + s.left) * 0.3), Math.floor(c.n * 0.5));
        if (n >= 2) { for (let q = 0; q < n && P.length; q++) P.splice(Math.floor(P.length / 2), 1); c.n -= n / 2; this.note('ambush', { k: c.owner, k2: s.k, cell: c.id, n, from: s.from, to: s.to }); }
      }
    }
  },
  bridgeFalls(x) {
    x.broken = true;
    // whoever is on it falls in
    let lost = 0;
    for (const s of this.streams) if (s.cx === x) for (let i = s.packets.length - 1; i >= 0; i--) if (Math.abs(s.packets[i] - s.cd) < 26) { s.packets.splice(i, 1); lost++; }
    // the road is cut if the island stays in one piece without it; otherwise the wreck becomes a ford
    const C = this.cells, a = C[x.a], b = C[x.b];
    a.nb = a.nb.filter(j => j !== b.id); b.nb = b.nb.filter(j => j !== a.id);
    const seen = new Set([0]), q = [0];
    while (q.length) { const i = q.shift(); for (const j of C[i].nb) if (!seen.has(j)) { seen.add(j); q.push(j); } }
    if (seen.size !== C.length) { a.nb.push(b.id); b.nb.push(a.id); x.kind = 'ford'; }
    else x.kind = 'gone';
    x.fallT = this.t;
    this.note('bridge', { cell: x.a, cell2: x.b, lost, x: x.x, y: x.y });
  },
  // ----- arrivals -----
  warArrive(s, c) {
    // help for an ally: reinforce instead of attack
    if (c.owner >= 0 && c.owner !== s.k && this.allied(s.k, c.owner)) { c.n = Math.min(this.capOf(c) + 20, c.n + 1); return true; }
    // a champion leading the attack meets the champion holding the gate: they duel
    if (s.champ != null && !s.duel) { const d = this.champs.find(h => h.cell === c.id && h.k === c.owner && !h.path && !h.on && h.hostage < 0 && h.wound <= this.t); if (d) this.gateDuel(s, c, d); }
    return false;
  },
  gateDuel(s, c, dch) {
    s.duel = true;
    const pa = s.packets.length + s.left + 4, pb = c.n * this.defOf(c) + 4, att = this.W2R() < pa / (pa + pb) * 0.6 + 0.2;
    const win = att ? s.k : c.owner, lose = att ? c.owner : s.k;
    if (att) { dch.wound = this.t + 8; this.sendHome(dch); }
    else { const ach = this.champs[s.champ]; ach.on = null; ach.wound = this.t + 8; this.sendHome(ach); s.champ = null; s.punch = 1; const cut = Math.floor(s.packets.length / 2); s.packets.splice(s.packets.length - cut, cut); s.left = Math.floor(s.left / 2); }
    this.note('duel', { k: win, k2: lose, x: c.x, y: c.y, cell: c.id, gate: true });
  },
  warCapture(c, k, prev, s) {
    // a hostage: a champion standing in the fallen hold is taken
    for (const ch of this.champs) if (ch.k === prev && ch.cell === c.id && !ch.path && !ch.on && ch.hostage < 0) {
      ch.hostage = k; ch.until = this.t + 12; this.note('hostage', { k, k2: prev, cell: c.id });
    }
    // a hostage rescued: the hold the prisoner is kept in falls to its own kingdom (or anyone)
    for (const ch of this.champs) if (ch.hostage >= 0 && ch.cell === c.id && k !== ch.hostage) {
      const own = ch.k === k; ch.hostage = -1; ch.wound = this.t + 3;
      if (!own) this.sendHome(ch); this.note('rescue', { k: ch.k, k2: prev, cell: c.id });
    }
    // the champion who led the attack stays in the hold it took
    if (s && s.champ != null) { const ch = this.champs[s.champ]; if (ch.on === s.id) { ch.on = null; ch.cell = c.id; ch.x = c.x; ch.y = c.y; } }
    // a capital falls: an heir is crowned in a new seat
    if (c.type === 'capital' && prev >= 0 && this.caps[prev] === c.id) {
      const own = this.cellsOf(prev).filter(o => o.id !== c.id);
      if (own.length) {
        const seat = own.sort((a, b) => b.n - a.n || a.id - b.id)[0];
        seat.type = 'capital'; this.caps[prev] = seat.id; seat.seat = true; seat.n = Math.min(this.capOf(seat), seat.n + 4);
        const heir = Object.keys(HEIRS)[Math.floor(this.W2R() * 3)];
        this.K[prev].heir = heir; this.K[prev].foe = k;
        this.note('dynasty', { k: prev, k2: k, cell: seat.id, heir, from: c.id });
      }
      // a royal marriage dies with a fallen capital
      const P = this.ally; if (P && P.on && P.kind === 'marriage' && (P.a === prev || P.b === prev)) { P.on = false; P.endT = this.t; this.note('allyEnd', { k: P.a, k2: P.b, what: 'marriage' }); }
    }
    if (c.plagueT > this.t) c.plagueT = this.t + 3;   // (the new owner burns the sick houses: it fades out)
    c.wallT = 0;
  },
  // two streams cancelling head-on: if both carry champions, they duel; the loser's army breaks
  warClash(A, B) {
    if (A.champ == null || B.champ == null || A.duel || B.duel) return;
    A.duel = B.duel = true;
    const pa = A.packets.length + A.left + 4, pb = B.packets.length + B.left + 4, wA = this.W2R() < pa / (pa + pb) * 0.6 + 0.2;
    const W0 = wA ? A : B, L0 = wA ? B : A, loser = this.champs[L0.champ];
    loser.on = null; loser.wound = this.t + 8; this.sendHome(loser);
    L0.champ = null; L0.punch = 1;
    const cut = Math.floor(L0.packets.length / 2); L0.packets.splice(L0.packets.length - cut, cut); L0.left = Math.floor(L0.left / 2);
    const ce = this.cells[A.from], cf = this.cells[A.to];
    this.note('duel', { k: W0.k, k2: L0.k, x: (ce.x + cf.x) / 2, y: (ce.y + cf.y) / 2 });
  },
  sendHome(ch) {
    const C = this.cells, home = C[this.caps[ch.k]], to = home && home.owner === ch.k ? home : this.cellsOf(ch.k).sort((a, b) => b.n - a.n)[0];
    if (!to) { ch.cell = -1; ch.path = null; return; }
    ch.path = { pts: [{ x: ch.x, y: ch.y }, { x: to.x, y: to.y }], to: to.id, k: 0 }; ch.cell = -1;
  },
  // ----- once a tick -----
  warTick(dt) {
    const C = this.cells, t = this.t;
    // the tithe
    if (t >= this.goldT) {
      this.goldT += 10;
      this.K.forEach((K, k) => { const own = this.cellsOf(k); if (!own.length) return; const g = own.length + own.filter(c => c.type === 'mine').length * 3 + own.filter(c => c.type === 'farm').length; this.gold[k] += g; this.note('tithe', { k, g }); });
    }
    // supply lines (twice a second): holds cut off from their capital stop growing and lose men
    if (Math.round(t * 120) % 60 === 0) {
      this.K.forEach((K, k) => {
        const cap = C[this.caps[k]], own = this.cellsOf(k);
        const reach = new Set();
        if (cap && cap.owner === k) { reach.add(cap.id); const q = [cap.id]; while (q.length) { const i = q.shift(); for (const j of C[i].nb) if (C[j].owner === k && !reach.has(j)) { reach.add(j); q.push(j); } } }
        for (const c of own) { const was = c.cut; c.cut = own.length > 1 && cap && cap.owner === k && !reach.has(c.id); if (c.cut && !was) { c.cutT = t; if (!this.cutSaid) { this.cutSaid = true; this.note('cut', { k, cell: c.id }); } } }
      });
      for (const c of C) if (c.owner < 0) c.cut = false;
    }
    for (const c of C) if (c.cut && c.n > 2) c.n -= 0.3 * dt;
    // plague: a sick village loses men and spreads it to a neighbour every 4 s (at most four holds)
    const PL = this.plague;
    if (PL && !PL.done && t >= PL.t) {
      PL.done = true;
      const v = C.filter(c => c.owner >= 0 && (c.type === 'village' || c.type === 'farm')).sort((a, b) => b.n - a.n)[0];
      if (v) { v.plagueT = t + 12; PL.cells.push(v.id); PL.next = t + 4; this.note('plague', { cell: v.id, k: v.owner }); }
    }
    if (PL && PL.done && PL.cells.length && PL.cells.length < 4 && t >= PL.next) {
      PL.next = t + 4;
      const src = PL.cells.map(i => C[i]).filter(c => c.plagueT > t);
      const nb = []; for (const c of src) for (const j of c.nb) if (!(C[j].plagueT > t) && C[j].type !== 'capital' && !PL.cells.includes(j)) nb.push(C[j]);
      if (nb.length) { const c = nb.sort((a, b) => b.n - a.n || a.id - b.id)[0]; c.plagueT = t + 10; PL.cells.push(c.id); }
    }
    for (const c of C) if (c.plagueT > t && c.n > 1) c.n -= c.n * 0.06 * dt;
    // the golden field: grows four times as fast while it lasts; its holder's every hold gains 3 when it's over
    const F = this.field;
    if (F && !F.done && t >= F.t && !F.on) {
      const cand = C.filter(c => c.type !== 'capital' && c.type !== 'crown' && !c.forest);
      const c = cand.sort((a, b) => Math.hypot(a.x - 540, a.y - 960) - Math.hypot(b.x - 540, b.y - 960))[Math.floor(this.W2R() * Math.min(4, cand.length))];
      if (c) { F.on = true; F.cell = c.id; F.end = t + 12; this.note('field', { cell: c.id }); } else F.done = true;
    }
    if (F && F.on && t >= F.end) {
      F.on = false; F.done = true; const c = C[F.cell];
      if (c.owner >= 0) { for (const o of this.cellsOf(c.owner)) o.n = Math.min(this.capOf(o), o.n + 3); this.note('harvestWon', { k: c.owner, cell: c.id }); }
    }
    // a truce or a royal marriage
    const DP = this.diplo;
    if (DP && !DP.done && t >= DP.t) {
      DP.done = true;
      const live = this.K.map((_, k) => k).filter(k => this.out[k] == null && this.cellsOf(k).length);
      const nbOf = k => { const s = new Set(); for (const c of this.cellsOf(k)) for (const j of c.nb) if (C[j].owner >= 0 && C[j].owner !== k) s.add(C[j].owner); return s; };
      let pair = null;
      if (DP.kind === 'truce') { for (const a of live) for (const b of nbOf(a)) if (a < b && a !== this.leader && b !== this.leader && live.includes(b)) { pair = pair || [a, b]; } }
      else { const w = live.slice().sort((a, b) => this.score(a) - this.score(b) || this.troops(a) - this.troops(b)); if (w.length >= 3) pair = [w[0], w[1]]; }
      if (pair) { this.ally = { kind: DP.kind, a: pair[0], b: pair[1], on: true, t, end: DP.kind === 'truce' ? t + 30 : 999 }; this.note(DP.kind, { k: pair[0], k2: pair[1] }); }
    }
    if (this.ally && this.ally.on && t >= this.ally.end) { this.ally.on = false; this.ally.endT = t; this.note('allyEnd', { k: this.ally.a, k2: this.ally.b, what: this.ally.kind }); }
    // shipwrecks: in a storm or the rain, the biggest fleet out on the water founders (once each)
    if (this.events.some(e => (e.kind === 'storm' || e.kind === 'rain') && e.on) && Math.round(t * 120) % 120 === 0) {
      const sea = this.streams.filter(s => s.sea && !s.wrecked && !(this.K[s.k].trait === 'sealanes' && !s.merc) && s.packets.filter(d => d > s.len * 0.15 && d < s.len * 0.85).length >= 4);
      if (sea.length) { const s = sea.sort((a, b) => b.packets.length - a.packets.length)[0]; s.wrecked = true; let n = 0; for (let i = s.packets.length - 1; i >= 0; i--) if (s.packets[i] > s.len * 0.15 && s.packets[i] < s.len * 0.85 && (i % 2 === 0)) { s.packets.splice(i, 1); n++; } const mid = { x: (C[s.from].x + C[s.to].x) / 2, y: (C[s.from].y + C[s.to].y) / 2 }; this.note('shipwreck', { k: s.k, n, x: mid.x, y: mid.y }); }
    }
    // champions: hostages ransomed, the wounded heal, the rest ride to where they're needed
    for (const ch of this.champs) {
      if (ch.hostage >= 0) {
        if (t >= ch.until) { const pay = Math.min(this.gold[ch.k], 20); this.gold[ch.k] -= pay; this.gold[ch.hostage] += pay; this.note('ransom', { k: ch.k, k2: ch.hostage, g: pay }); ch.hostage = -1; ch.wound = t + 2; this.sendHome(ch); }
        continue;
      }
      if (ch.on != null) { const s = this.streams.find(o => o.id === ch.on); if (s) { const d = s.packets.length ? s.packets[0] : 0, p = this.streamXY(s, d); ch.x = p.x; ch.y = p.y; continue; } ch.on = null; this.sendHome(ch); }
      if (ch.path) {
        const P = ch.path, to = P.pts[1], d = dist(ch, to), step = 260 * dt;
        if (d <= step) { ch.x = to.x; ch.y = to.y; ch.path = null; ch.cell = C[P.to].owner === ch.k ? P.to : -1; if (ch.cell < 0) this.sendHome(ch); }
        else { ch.x += (to.x - ch.x) / d * step; ch.y += (to.y - ch.y) / d * step; }
        continue;
      }
      if (ch.cell >= 0 && C[ch.cell].owner !== ch.k) { this.sendHome(ch); continue; }
      // a hold about to fall: the champion rides out to a safe one rather than be taken (most of the time)
      if (ch.cell >= 0) { const c = C[ch.cell]; let th = 0; for (const s of this.streams) if (s.k !== ch.k && s.to === c.id) th += s.packets.length + s.left;
        if (th > c.n * this.defOf(c) * 1.1 && !ch.fled) { const safe = c.nb.map(j => C[j]).filter(o => o.owner === ch.k && !this.streams.some(s => s.k !== ch.k && s.to === o.id)).sort((a, b) => b.n - a.n)[0];
          if (safe && this.W2R() < 0.75) { ch.path = { pts: [{ x: ch.x, y: ch.y }, { x: safe.x, y: safe.y }], to: safe.id }; ch.cell = -1; ch.next = t + 3; continue; } ch.fled = true; } else ch.fled = false; }
      if (t < ch.next || this.out[ch.k] != null) continue;
      ch.next = t + 1.5;
      // where it's needed: the own hold with the most enemy troops coming at it, else the hold with the most troops at the front
      const threat = new Map(); for (const s of this.streams) if (s.k !== ch.k && C[s.to].owner === ch.k) threat.set(s.to, (threat.get(s.to) || 0) + s.packets.length + s.left);
      let best = null, bv = 0;
      for (const c of this.cellsOf(ch.k)) { const th = threat.get(c.id) || 0, front = c.nb.some(j => C[j].owner !== ch.k); const v = th * 2 + (front ? c.n * 0.25 : 0) - dist(c, ch) / 200; if (th > c.n * this.defOf(c) * 0.5 && v > bv) { bv = v; best = c; } else if (!best && front && v > bv) { bv = v; best = c; } }
      if (best && best.id !== ch.cell) { ch.path = { pts: [{ x: ch.x, y: ch.y }, { x: best.x, y: best.y }], to: best.id }; ch.cell = -1; ch.rideT = t; }
    }
    // each kingdom, once a second: mutiny, retreat, spending its gold, helping its spouse
    this.K.forEach((K, k) => {
      if (this.out[k] != null || t < this.econT[k]) return;
      this.econT[k] = t + 1;
      const own = this.cellsOf(k); if (!own.length) return;
      const cap = C[this.caps[k]], capOk = cap && cap.owner === k;
      const threat = new Map(); for (const s of this.streams) if (s.k !== k && C[s.to].owner === k) threat.set(s.to, (threat.get(s.to) || 0) + s.packets.length + s.left);
      // mutiny: a capital left nearly empty can't hold its land
      if (capOk && cap.n < 4 && own.length >= 4 && t > 10 && t - this.lastMut[k] > 20) {
        const c = own.filter(o => o.id !== cap.id && o.n >= 6 && o.nb.some(j => C[j].owner !== k)).sort((a, b) => b.n - a.n)[0];
        if (c) { this.lastMut[k] = t; c.owner = -1; c.n = Math.max(4, c.n * 0.8); c.flipT = t; c.rebel = true; for (const o of this.streams) if (o.from === c.id && o.k === k) o.left = 0; this.note('mutiny', { k, cell: c.id }); }
      }
      // retreat: the capital is about to fall; everything near it falls back to save it
      if (capOk && own.length >= 3 && t - this.lastRet[k] > 15 && (threat.get(cap.id) || 0) > cap.n * this.defOf(cap) * 0.9) {
        const helpers = cap.nb.map(j => C[j]).filter(c => c.owner === k && c.n >= 6 && !(threat.get(c.id) > 0));
        if (helpers.length) { this.lastRet[k] = t; for (const a of helpers) this.order(k, a, cap, Math.floor(a.n * 0.85), 'retreat'); this.note('retreat', { k, cell: cap.id }); }
      }
      // help a spouse whose hold is about to fall
      const P = this.ally;
      if (P && P.on && P.kind === 'marriage' && (P.a === k || P.b === k)) {
        const sp = P.a === k ? P.b : P.a;
        for (const s of this.streams) { if (s.k === k || s.k === sp) continue; const c = C[s.to]; if (c.owner !== sp) continue;
          const th = s.packets.length + s.left; if (th < c.n * this.defOf(c)) continue;
          const a = c.nb.map(j => C[j]).find(o => o.owner === k && o.n >= 10 && !(threat.get(o.id) > 0));
          if (a && !this.streams.some(o => o.k === k && o.to === c.id)) { this.order(k, a, c, Math.floor(a.n * 0.5), 'help'); if (!P.helped) { P.helped = true; this.note('help', { k, k2: sp, cell: c.id }); } break; }
        }
      }
      // spending: fortify the hold in danger, hire mercenaries, or send spies
      const g = this.gold[k];
      const danger = own.filter(c => (threat.get(c.id) || 0) > c.n * this.defOf(c) * 0.6 && !(c.wallT > t)).sort((a, b) => (threat.get(b.id) || 0) - (threat.get(a.id) || 0))[0];
      if (danger && g >= 12) { this.gold[k] -= 12; danger.wallT = t + 20; this.note('fortify', { k, cell: danger.id }); return; }
      if (g >= 20) {
        const foes = C.filter(c => c.owner >= 0 && c.owner !== k && !this.allied(k, c.owner) && !this.blocked(k, c.owner));
        const tgt = foes.sort((a, b) => a.n * this.defOf(a) - b.n * this.defOf(b) || a.id - b.id)[0];
        if (tgt) {
          const coast = own.filter(c => c.coast), from = (coast.length ? coast : own).sort((a, b) => dist(a, tgt) - dist(b, tgt))[0];
          this.gold[k] -= 20;
          const sea = !from.nb.includes(tgt.id), len = dist(from, tgt) * (sea ? 1.15 : 1);
          const st = { id: ++this.uid, k, from: from.id, to: tgt.id, path: [{ x: from.x, y: from.y }, { x: tgt.x, y: tgt.y }], len, sea, left: 10, sent: 10, rate: 12, timer: 1, packets: [], t0: t, why: 'merc', merc: true };
          this.streams.push(st); this.warOrder(st);
          this.note('hire', { k, k2: tgt.owner, from: from.id, to: tgt.id, sea });
          return;
        }
      }
      if (g >= 14 && g < 20 && t >= this.nextSpy[k]) {
        const rivals = this.K.map((_, o) => o).filter(o => o !== k && this.out[o] == null && this.cellsOf(o).length);
        const on = rivals.includes(this.leader) ? this.leader : rivals.sort((a, b) => this.troops(b) - this.troops(a))[0];
        if (on != null) { this.gold[k] -= 10; this.spy[k] = { on, until: t + 10 }; this.nextSpy[k] = t + 30; this.note('spies', { k, k2: on }); }
      }
    });
  },
  streamXY(s, d) {
    const C = this.cells, a = C[s.from], b = C[s.to], f = Math.max(0, Math.min(1, d / s.len));
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  },
  // the river's line (for drawing): points along it inside the island
  riverPts() {
    const R = this.river; if (!R) return [];
    const out = []; let run = [];
    for (let s = -1400; s <= 1400; s += 12) {
      const w = Math.sin(s / 140 + R.ph) * 10, x = R.ox + R.dx * s - R.dy * w, y = R.oy + R.dy * s + R.dx * w;
      if (this.inside(x, y) || (run.length && this.inside(x - R.dx * 30, y - R.dy * 30))) run.push({ x, y }); else if (run.length) { out.push(run); run = []; }
    }
    if (run.length) out.push(run);
    return out;
  },
};

module.exports = { WAR, HEIRS };
