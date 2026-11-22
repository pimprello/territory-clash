// Territory Clash: drawing the deeper war (tc-war.js): the river with its fords and bridges, forests, the mountain pass, the
// plague, the golden field, cut-off land, walls, the champions riding between holds (and caged as hostages), spies, truces and
// marriages, mercenary companies, rain, and the moments themselves (an ambush's arrows, a bridge going down, a shipwreck, a duel,
// a mutiny, an heir's crown flying to its new seat, the tithe's coins). Looks only: reads the battle, uses hashes, not dice.
// Mostly on the map itself, not as words on screen (Rellz, 2026-11-17: "make updates less based on ui").
'use strict';
const TAU = Math.PI * 2;
const h01 = (a, b = 0) => { let x = (a * 374761393 + b * 668265263) | 0; x = Math.imul(x ^ (x >>> 13), 1274126177); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
const clamp01 = x => Math.max(0, Math.min(1, x));
const INK = '#04060B', GOLD = '#FFD23F';

function cellPath(g, c) { g.beginPath(); c.poly.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); }
// the moments in the log from the last few seconds
function recent(s, secs) { const out = []; for (let i = s.log.length - 1; i >= 0; i--) { const e = s.log[i]; if (e.t < s.t - secs) break; out.push(e); } return out; }

// ----- on the land, under the borders (called inside the island's clip) -----
function ground(g, s, t, X) {
  if (!s.W2) return;
  const C = s.cells, rain = s.events.some(e => e.kind === 'rain' && e.on);
  // forests: a canopy of trees round the hold (never over its middle)
  for (const c of C) if (c.forest) {
    for (let q = 0; q < 16; q++) {
      const a = h01(c.id, q + 50) * TAU, r = 58 + h01(c.id, q + 70) * 70, px = c.x + Math.cos(a) * r, py = c.y + Math.sin(a) * r * 0.9;
      if (!s.inside(px, py) || !X.inPoly(c.poly, px, py)) continue;
      const sz = 10 + h01(c.id, q + 90) * 7, sw = Math.sin(t * 1.3 + q + c.id) * 1.2;
      g.beginPath(); g.ellipse(px + 3, py + sz * 0.8, sz * 0.9, sz * 0.35, 0, 0, TAU); g.fillStyle = 'rgba(0,0,0,0.22)'; g.fill();
      g.beginPath(); g.arc(px + sw, py, sz, 0, TAU); g.fillStyle = q % 3 ? '#2F5E2A' : '#3B7333'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = 'rgba(4,6,11,0.6)'; g.stroke();
      g.beginPath(); g.arc(px + sw - sz * 0.3, py - sz * 0.3, sz * 0.4, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.14)'; g.fill();
    }
  }
  // the mountain pass: peaks round it
  for (const c of C) if (c.type === 'pass') {
    for (let q = 0; q < 7; q++) {
      const a = (q / 7) * TAU + h01(c.id, q) * 0.5, r = 62 + h01(c.id, q + 9) * 30, px = c.x + Math.cos(a) * r, py = c.y + Math.sin(a) * r * 0.85;
      if (!s.inside(px, py)) continue;
      const w = 26 + h01(c.id, q + 20) * 16, hh = w * 1.15;
      g.beginPath(); g.moveTo(px - w, py + hh * 0.4); g.lineTo(px, py - hh); g.lineTo(px + w, py + hh * 0.4); g.closePath(); g.fillStyle = '#7E8696'; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.moveTo(px - w * 0.36, py - hh * 0.45); g.lineTo(px, py - hh); g.lineTo(px + w * 0.36, py - hh * 0.45); g.lineTo(px + w * 0.12, py - hh * 0.55); g.lineTo(px - w * 0.1, py - hh * 0.42); g.closePath(); g.fillStyle = '#F2F5FA'; g.fill();
      g.beginPath(); g.moveTo(px, py - hh); g.lineTo(px + w, py + hh * 0.4); g.lineTo(px + w * 0.2, py + hh * 0.4); g.closePath(); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fill();
    }
  }
  // the river (fuller and browner in the rain), flowing
  const runs = s.riverPts ? s.riverPts() : [], w = (s.river ? s.river.w : 5) * (rain ? 1.4 : 1);
  for (const run of runs) {
    const line = () => { g.beginPath(); run.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); };
    g.lineCap = 'round'; g.lineJoin = 'round';
    line(); g.lineWidth = w * 6 + 10; g.strokeStyle = 'rgba(4,6,11,0.35)'; g.stroke();
    line(); g.lineWidth = w * 6; g.strokeStyle = rain ? '#5A7A86' : '#2F7FB8'; g.stroke();
    line(); g.lineWidth = w * 3; g.strokeStyle = rain ? '#7A9AA2' : '#5BB2E6'; g.stroke();
    g.save(); line(); g.setLineDash([8, 26]); g.lineDashOffset = -t * (rain ? 90 : 50); g.lineWidth = 2.5; g.strokeStyle = 'rgba(235,250,255,0.6)'; g.stroke(); g.restore();
  }
  // the plague: a sickly green haze and drifting skulls of mist
  for (const c of C) if (c.plagueT > s.t) {
    const a = clamp01((c.plagueT - s.t) / 1.5);
    g.save(); cellPath(g, c); g.clip();
    g.globalAlpha = 0.45 * a; g.fillStyle = '#7FAE3A'; g.fill();
    for (let q = 0; q < 6; q++) { const px = c.x + (h01(c.id, q + 300) - 0.5) * 150 + Math.sin(t * 0.8 + q) * 14, py = c.y + (h01(c.id, q + 320) - 0.5) * 150 - ((t * 18 + q * 40) % 80);
      const gr = g.createRadialGradient(px, py, 2, px, py, 34); gr.addColorStop(0, 'rgba(160,220,90,0.55)'); gr.addColorStop(1, 'rgba(160,220,90,0)'); g.globalAlpha = 0.8 * a; g.fillStyle = gr; g.beginPath(); g.arc(px, py, 34, 0, TAU); g.fill(); }
    g.restore();
  }
  // the golden field: wheat swaying in a warm glow
  const F = s.field;
  if (F && F.on) {
    const c = C[F.cell], a = clamp01((s.t - F.t) / 0.8) * clamp01((F.end - s.t) / 0.8);
    g.save(); cellPath(g, c); g.clip(); g.globalAlpha = a;
    const gr = g.createRadialGradient(c.x, c.y, 10, c.x, c.y, 160); gr.addColorStop(0, 'rgba(255,220,90,0.75)'); gr.addColorStop(1, 'rgba(255,190,40,0.15)'); g.fillStyle = gr; g.fill();
    g.strokeStyle = '#C08A1E'; g.lineWidth = 2.5;
    for (let q = 0; q < 40; q++) { const px = c.x + (h01(c.id, q + 400) - 0.5) * 200, py = c.y + (h01(c.id, q + 440) - 0.5) * 200; if (Math.hypot(px - c.x, py - c.y) < 48) continue; const sw = Math.sin(t * 2.4 + px * 0.05) * 4;
      g.beginPath(); g.moveTo(px, py + 8); g.quadraticCurveTo(px + sw * 0.5, py, px + sw, py - 9); g.stroke(); g.beginPath(); g.ellipse(px + sw, py - 11, 2.6, 5, sw * 0.08, 0, TAU); g.fillStyle = GOLD; g.fill(); }
    g.restore();
  }
  // cut-off land: hatched and dimmed (no supplies get through)
  for (const c of C) if (c.cut && c.owner >= 0) {
    const a = clamp01((s.t - (c.cutT || 0)) / 0.6);
    g.save(); cellPath(g, c); g.clip(); g.globalAlpha = 0.35 * a; g.fillStyle = '#000'; g.fill();
    g.globalAlpha = 0.5 * a; g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 3;
    for (let d = -300; d < 300; d += 22) { g.beginPath(); g.moveTo(c.x + d - 200, c.y - 200); g.lineTo(c.x + d + 200, c.y + 200); g.stroke(); }
    g.restore();
  }
}

// ----- on the roads (after the borders and roads, before the armies) -----
const crossAt = new WeakMap();
function roads(g, s, t) {
  if (!s.W2) return;
  const C = s.cells;
  // crossings (Rellz, 2026-11-21: "fix the bridges ... make it so the people have to use them instead of running across water"):
  // every road over the river has a real bridge, centred where the road meets the drawn (winding) river and long enough to reach
  // both banks, so a column only ever crosses the water on planks. A bridge is broad and railed; a ford (slower in the battle)
  // is a narrow rope footbridge; a fallen bridge is two stubs and planks bobbing in the water.
  const runs = s.riverPts ? s.riverPts() : [], rw = (s.river ? s.river.w : 5) * 6;
  const hit = (a, b, x) => {
    let best = null;
    for (const run of runs) for (let i = 1; i < run.length; i++) {
      const p = run[i - 1], q = run[i], d1x = b.x - a.x, d1y = b.y - a.y, d2x = q.x - p.x, d2y = q.y - p.y, den = d1x * d2y - d1y * d2x; if (Math.abs(den) < 1e-9) continue;
      const u = ((p.x - a.x) * d2y - (p.y - a.y) * d2x) / den, v = ((p.x - a.x) * d1y - (p.y - a.y) * d1x) / den;
      if (u >= 0 && u <= 1 && v >= 0 && v <= 1) { const X = a.x + d1x * u, Y = a.y + d1y * u, dd = Math.hypot(X - x.x, Y - x.y); if (!best || dd < best.dd) best = { x: X, y: Y, dd, ra: Math.atan2(d2y, d2x) }; }
    }
    return best;
  };
  for (const x of s.crossings || []) {
    const a = C[x.a], b = C[x.b], ang = Math.atan2(b.y - a.y, b.x - a.x), at = crossAt.get(x) || crossAt.set(x, hit(a, b, x) || { x: x.x, y: x.y, ra: ang + Math.PI / 2 }).get(x);
    // the span: the river's width measured along the road (wider when the road meets the river at a slant), plus the banks
    const slant = Math.abs(Math.sin(ang - at.ra)) || 1, half = Math.min(60, (rw / 2) / Math.max(0.35, slant) + 12);
    g.save(); g.translate(at.x, at.y); g.rotate(ang); g.lineJoin = 'round';
    if (x.kind === 'ford' || (x.kind === 'bridge' && !x.broken)) {
      // (a ford after a bridge fell is the wreck patched into a footbridge, so nobody wades)
      const br = x.kind === 'bridge', hw = br ? 12 : 7, wear = br ? Math.min(1, x.used / 40) : 0;
      // its shadow on the water, the deck, the planks, the rails and four posts on the banks
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-half, -hw + 5, half * 2, hw * 2);
      g.beginPath(); g.moveTo(-half, -hw); g.quadraticCurveTo(0, -hw - (br ? 5 : 2), half, -hw); g.lineTo(half, hw); g.quadraticCurveTo(0, hw - (br ? 5 : 2), -half, hw); g.closePath();
      g.fillStyle = br ? '#8B6239' : '#9A7448'; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
      g.strokeStyle = 'rgba(4,6,11,0.45)'; g.lineWidth = 1.5; for (let q = -half + 6; q < half - 2; q += 7) { g.beginPath(); g.moveTo(q, -hw + 1); g.lineTo(q, hw - 1); g.stroke(); }
      g.strokeStyle = br ? '#5B3E22' : '#C9B48A'; g.lineWidth = br ? 4 : 2; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(-half, sd * hw); g.quadraticCurveTo(0, sd * hw - (br ? 5 : 2), half, sd * hw); g.stroke(); }
      g.fillStyle = '#4A321B'; for (const ex of [-half, half]) for (const sd of [-1, 1]) { g.beginPath(); g.arc(ex, sd * hw, br ? 4.5 : 3, 0, TAU); g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke(); }
      if (wear > 0.4) { g.strokeStyle = `rgba(4,6,11,${wear})`; g.lineWidth = 2; g.beginPath(); g.moveTo(-4, -hw); g.lineTo(2, -2); g.lineTo(-3, 5); g.lineTo(3, hw); g.stroke(); }
    } else {
      // fallen: two stubs on the banks and planks bobbing in the water
      const k = clamp01((s.t - (x.fallT || 0)) / 0.6);
      g.fillStyle = '#5B3E22'; g.lineWidth = 3; g.strokeStyle = INK;
      g.fillRect(-half, -11, 14, 22); g.strokeRect(-half, -11, 14, 22); g.fillRect(half - 14, -11, 14, 22); g.strokeRect(half - 14, -11, 14, 22);
      for (let q = 0; q < 4; q++) { const px = (h01(x.a, q) - 0.5) * half + k * 18 * Math.sin(q), py = (h01(x.b, q) - 0.5) * 16 + Math.sin(t * 3 + q) * 2; g.save(); g.translate(px, py); g.rotate(h01(q, x.a) * 3); g.fillStyle = '#7A5532'; g.fillRect(-8, -2.5, 16, 5); g.restore(); }
    }
    g.restore();
  }
  // walls round a fortified hold
  for (const c of C) if (c.wallT > s.t) {
    const a = clamp01((c.wallT - s.t) / 0.6) * clamp01(1 - (c.wallT - 20 - s.t) / -0.01 + 1), up = clamp01((s.t - (c.wallT - 20)) / 0.5);
    g.save(); g.globalAlpha = clamp01((c.wallT - s.t) / 0.6);
    const R = 50 * (0.6 + 0.4 * up);
    for (let q = 0; q < 14; q++) { const an = (q / 14) * TAU; g.save(); g.translate(c.x + Math.cos(an) * R, c.y + 4 + Math.sin(an) * R * 0.75); g.fillStyle = '#B9C1CF'; g.fillRect(-6, -8 * up, 12, 10 * up); g.lineWidth = 2.5; g.strokeStyle = INK; g.strokeRect(-6, -8 * up, 12, 10 * up); g.restore(); }
    g.restore(); void a;
  }
  // a truce (white) or a royal marriage (gold) between two capitals: a line of light and the sign at its middle
  const A = s.ally;
  if (A && (A.on || s.t - (A.endT ?? s.t) < 0.6)) {
    const ca = C[s.caps[A.a]], cb = C[s.caps[A.b]], k = clamp01((s.t - A.t) / 0.8) * (A.on ? 1 : clamp01(1 - (s.t - A.endT) / 0.6));
    if (ca && cb && k > 0) {
      g.save(); g.globalAlpha = k; g.setLineDash([10, 12]); g.lineDashOffset = -t * 30; g.lineWidth = 5; g.strokeStyle = A.kind === 'marriage' ? GOLD : '#FFFFFF';
      g.beginPath(); g.moveTo(ca.x, ca.y); g.lineTo(cb.x, cb.y); g.stroke(); g.setLineDash([]);
      const mx = (ca.x + cb.x) / 2, my = (ca.y + cb.y) / 2 + Math.sin(t * 2) * 3;
      g.beginPath(); g.arc(mx, my, 22, 0, TAU); g.fillStyle = 'rgba(4,6,11,0.85)'; g.fill(); g.lineWidth = 3; g.strokeStyle = A.kind === 'marriage' ? GOLD : '#FFFFFF'; g.stroke();
      if (A.kind === 'marriage') { for (const dx of [-5, 5]) { g.beginPath(); g.arc(mx + dx, my, 8, 0, TAU); g.lineWidth = 3.5; g.strokeStyle = GOLD; g.stroke(); } }
      else { g.beginPath(); g.moveTo(mx - 7, my + 12); g.lineTo(mx - 7, my - 12); g.stroke(); g.beginPath(); g.moveTo(mx - 7, my - 12); g.quadraticCurveTo(mx + 3, my - 15 + Math.sin(t * 6) * 2, mx + 12, my - 10); g.lineTo(mx - 7, my - 3); g.closePath(); g.fillStyle = '#FFFFFF'; g.fill(); }
      g.restore();
    }
  }
}

// ----- on top (after the holds): champions, spies, mutineers, the moments, and the rain -----
function top(g, s, t, X) {
  if (!s.W2) return;
  const C = s.cells;
  // champions: their portrait on a little glowing base in their colour; riding: dust behind; hostage: in a cage; hurt: faded
  for (const ch of s.champs || []) {
    if (ch.cell < 0 && !ch.path && ch.on == null && ch.hostage < 0) continue;
    const K = s.K[ch.k], P = X.pal(K.key), hurt = ch.wound > s.t, cage = ch.hostage >= 0;
    let x = ch.x, y = ch.y;
    // standing in a hold: beside the castle, not on top of its count
    if (!ch.path && ch.on == null) { x += 44; y -= 18; }
    const bob = ch.path || ch.on != null ? Math.abs(Math.sin(t * 14)) * -4 : Math.sin(t * 2 + ch.k) * 1.5;
    g.save(); g.globalAlpha = hurt ? 0.55 : 1;
    if (ch.path) for (let q = 1; q <= 3; q++) { g.globalAlpha = (hurt ? 0.3 : 0.5) / q; g.beginPath(); g.arc(x - (ch.path.pts[1].x - x) * 0.02 * q * 3, y + 10 - (ch.path.pts[1].y - y) * 0.02 * q * 3, 10 - q * 2, 0, TAU); g.fillStyle = '#D8C8A8'; g.fill(); }
    g.globalAlpha = hurt ? 0.55 : 1;
    const gl = g.createRadialGradient(x, y + bob, 4, x, y + bob, 36); gl.addColorStop(0, X.rgba(P.l, 0.7)); gl.addColorStop(1, X.rgba(P.c, 0)); g.fillStyle = gl; g.beginPath(); g.arc(x, y + bob, 36, 0, TAU); g.fill();
    g.beginPath(); g.arc(x, y + bob, 21, 0, TAU); g.fillStyle = X.rgba(P.d, 0.95); g.fill(); g.lineWidth = 4; g.strokeStyle = INK; g.stroke(); g.lineWidth = 2; g.strokeStyle = P.l; g.stroke();
    X.champ(g, K, x, y + bob);
    // a little gold crown over a champion (so it reads as the kingdom's hero, not a troop)
    g.beginPath(); const cx = x, cy = y + bob - 27; g.moveTo(cx - 8, cy + 4); g.lineTo(cx - 9, cy - 5); g.lineTo(cx - 4, cy - 1); g.lineTo(cx, cy - 7); g.lineTo(cx + 4, cy - 1); g.lineTo(cx + 9, cy - 5); g.lineTo(cx + 8, cy + 4); g.closePath(); g.fillStyle = GOLD; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
    if (cage) { g.globalAlpha = 1; g.strokeStyle = '#3A3F4A'; g.lineWidth = 3.5; for (let q = -2; q <= 2; q++) { g.beginPath(); g.moveTo(x + q * 8, y + bob - 26); g.lineTo(x + q * 8, y + bob + 24); g.stroke(); } g.beginPath(); g.moveTo(x - 20, y + bob - 26); g.lineTo(x + 20, y + bob - 26); g.moveTo(x - 20, y + bob + 24); g.lineTo(x + 20, y + bob + 24); g.lineWidth = 5; g.stroke(); }
    g.restore();
  }
  // spies: an eye in the spy's colour watching the rival's capital
  (s.spy || []).forEach((S, k) => {
    if (!S || S.until <= s.t) return;
    const c = C[s.caps[S.on]]; if (!c) return;
    const a = clamp01((S.until - s.t) / 0.5) * clamp01((s.t - (S.until - 10)) / 0.4), P = X.pal(s.K[k].key), x = c.x - 52 - k * 6, y = c.y - 62 + Math.sin(t * 2.4 + k) * 3, bl = Math.abs(Math.sin(t * 0.9 + k)) > 0.97 ? 0.15 : 1;
    g.save(); g.globalAlpha = a;
    g.beginPath(); g.moveTo(x - 20, y); g.quadraticCurveTo(x, y - 15 * bl, x + 20, y); g.quadraticCurveTo(x, y + 15 * bl, x - 20, y); g.closePath(); g.fillStyle = '#F4F6FB'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = INK; g.stroke();
    if (bl > 0.5) { g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fillStyle = P.c; g.fill(); g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fillStyle = INK; g.fill(); }
    g.restore();
  });
  // rebels: a black banner over a hold that mutinied (while nobody has taken it back)
  for (const c of C) if (c.rebel && c.owner < 0) { const x = c.x - 30, y = c.y - 30, w = Math.sin(t * 6 + c.id) * 2; g.save(); g.lineWidth = 3; g.strokeStyle = INK; g.beginPath(); g.moveTo(x, y + 20); g.lineTo(x, y - 18); g.stroke(); g.beginPath(); g.moveTo(x, y - 18); g.quadraticCurveTo(x + 10, y - 20 + w, x + 20, y - 15); g.lineTo(x, y - 6); g.closePath(); g.fillStyle = '#16181F'; g.fill(); g.stroke(); g.restore(); }
  // the moments
  for (const e of recent(s, 2.6)) {
    const age = s.t - e.t;
    switch (e.kind) {
      case 'ambush': {
        // arrows fly out of the forest at the road
        const c = C[e.cell], a = C[e.from], b = C[e.to], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, k = clamp01(age / 0.5), fade = clamp01(1 - (age - 0.5) / 0.6);
        if (fade <= 0) break;
        g.save(); g.globalAlpha = fade; g.strokeStyle = '#F4E9C8'; g.lineWidth = 2.5;
        for (let q = 0; q < 9; q++) { const sx = c.x + (h01(e.cell, q) - 0.5) * 70, sy = c.y + (h01(e.cell, q + 9) - 0.5) * 70, tx = mx + (h01(q, e.cell) - 0.5) * 60, ty = my + (h01(q + 3, e.cell) - 0.5) * 60, kk = clamp01(k * 1.3 - q * 0.04);
          const x1 = sx + (tx - sx) * kk, y1 = sy + (ty - sy) * kk - Math.sin(kk * Math.PI) * 30, ang = Math.atan2(ty - sy, tx - sx); g.beginPath(); g.moveTo(x1 - Math.cos(ang) * 12, y1 - Math.sin(ang) * 12); g.lineTo(x1, y1); g.stroke(); }
        g.restore(); break;
      }
      case 'bridge': {
        // a splash and spray where it went down
        const k = clamp01(age / 1.2); if (k >= 1) break;
        g.save(); g.globalAlpha = 1 - k; for (let q = 0; q < 14; q++) { const an = (q / 14) * TAU, r = 10 + k * 70 * (0.6 + 0.4 * h01(q, 7)); g.beginPath(); g.arc(e.x + Math.cos(an) * r, e.y + Math.sin(an) * r * 0.6 - Math.sin(k * Math.PI) * 30 * h01(q, 8), 4 * (1 - k) + 1.5, 0, TAU); g.fillStyle = '#E6F6FF'; g.fill(); }
        g.beginPath(); g.ellipse(e.x, e.y, 20 + k * 60, (20 + k * 60) * 0.55, 0, 0, TAU); g.lineWidth = 4 * (1 - k); g.strokeStyle = '#FFFFFF'; g.stroke(); g.restore(); break;
      }
      case 'shipwreck': {
        const k = clamp01(age / 2); if (k >= 1) break;
        g.save(); g.globalAlpha = 1 - k; for (let q = 0; q < 6; q++) { const px = e.x + (h01(q, 11) - 0.5) * 80 + k * 20 * Math.sin(q), py = e.y + (h01(q, 12) - 0.5) * 50 + Math.sin(t * 3 + q) * 3; g.save(); g.translate(px, py); g.rotate(h01(q, 13) * 3 + k); g.fillStyle = '#7A5532'; g.fillRect(-10, -3, 20, 6); g.restore(); }
        g.beginPath(); g.ellipse(e.x, e.y, 30 + k * 50, (30 + k * 50) * 0.5, 0, 0, TAU); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.stroke(); g.restore(); break;
      }
      case 'duel': {
        // two swords clash: a star of light and the blades crossing
        const k = clamp01(age / 1.1); if (k >= 1) break;
        g.save(); g.translate(e.x, e.y - 20); g.globalAlpha = 1 - k * k;
        for (let q = 0; q < 10; q++) { const an = (q / 10) * TAU, r0 = 10 + k * 30, r1 = r0 + 26 * (1 - k); g.beginPath(); g.moveTo(Math.cos(an) * r0, Math.sin(an) * r0); g.lineTo(Math.cos(an) * r1, Math.sin(an) * r1); g.lineWidth = 3; g.strokeStyle = '#FFF6D6'; g.stroke(); }
        for (const sd of [-1, 1]) { g.save(); g.rotate(sd * (0.75 - 0.35 * Math.min(1, age / 0.15))); g.fillStyle = '#E8EDF5'; g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-3, 22); g.lineTo(-3, -26); g.lineTo(0, -32); g.lineTo(3, -26); g.lineTo(3, 22); g.closePath(); g.fill(); g.stroke(); g.fillStyle = GOLD; g.fillRect(-10, 18, 20, 5); g.strokeRect(-10, 18, 20, 5); g.restore(); }
        g.restore(); break;
      }
      case 'mutiny': {
        const c = C[e.cell], k = clamp01(age / 1.6); if (k >= 1) break;
        g.save(); g.globalAlpha = 0.7 * (1 - k); for (let q = 0; q < 6; q++) { const px = c.x + (h01(e.cell, q + 60) - 0.5) * 60, py = c.y - k * 70 - q * 8; const gr = g.createRadialGradient(px, py, 2, px, py, 26); gr.addColorStop(0, 'rgba(20,20,26,0.8)'); gr.addColorStop(1, 'rgba(20,20,26,0)'); g.fillStyle = gr; g.beginPath(); g.arc(px, py, 26, 0, TAU); g.fill(); }
        g.restore(); break;
      }
      case 'dynasty': {
        // a crown flies from the fallen capital to the heir's new seat, then settles with a glint
        const to = C[e.cell], from = C[e.from ?? e.cell] || to, k = clamp01(age / 1.2);
        if (age > 2.4) break;
        const x = from.x + (to.x - from.x) * k, y = from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * 90 - 50, sc = 1.4 - 0.4 * k;
        g.save(); g.globalAlpha = clamp01((2.4 - age) / 0.5); g.translate(x, y); g.scale(sc, sc);
        g.beginPath(); g.moveTo(-16, 8); g.lineTo(-18, -10); g.lineTo(-8, -2); g.lineTo(0, -14); g.lineTo(8, -2); g.lineTo(18, -10); g.lineTo(16, 8); g.closePath(); g.fillStyle = GOLD; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
        if (k >= 1) { const gk = clamp01((age - 1.2) / 0.5); g.globalAlpha *= 1 - gk; g.beginPath(); g.arc(0, 0, 20 + gk * 30, 0, TAU); g.lineWidth = 3; g.strokeStyle = '#FFF6D6'; g.stroke(); }
        g.restore(); break;
      }
      case 'tithe': {
        // coins rise from the capital
        const c = C[s.caps[e.k]]; if (!c || c.owner !== e.k) break;
        const k = clamp01(age / 1); if (k >= 1) break;
        g.save(); g.globalAlpha = 1 - k; for (let q = 0; q < 3; q++) { const px = c.x - 20 + q * 20, py = c.y - 40 - k * 50 - q * 6; g.beginPath(); g.ellipse(px, py, 7 * Math.abs(Math.cos(t * 6 + q)) + 1, 7, 0, 0, TAU); g.fillStyle = GOLD; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke(); }
        g.restore(); break;
      }
      case 'hire': {
        // the company's sails go up in a flash of gold where it sets off
        const c = C[e.from], k = clamp01(age / 0.8); if (k >= 1) break;
        g.save(); g.globalAlpha = 1 - k; g.beginPath(); g.arc(c.x, c.y, 20 + k * 60, 0, TAU); g.lineWidth = 5 * (1 - k) + 1; g.strokeStyle = GOLD; g.stroke(); g.restore(); break;
      }
      case 'plague': case 'field': case 'fortify': {
        const c = C[e.cell], k = clamp01(age / 0.9); if (k >= 1) break;
        g.save(); g.globalAlpha = 1 - k; g.beginPath(); g.arc(c.x, c.y, 30 + k * 90, 0, TAU); g.lineWidth = 6 * (1 - k) + 1; g.strokeStyle = e.kind === 'plague' ? '#9BD34A' : e.kind === 'field' ? GOLD : '#DDE3EC'; g.stroke(); g.restore(); break;
      }
    }
  }
  // heavy rain over everything
  const rn = s.events.find(e => e.kind === 'rain' && (e.on || (e.done && s.t - (e.t + e.len) < 0.6)));
  if (rn) {
    const a = clamp01((s.t - rn.t) / 0.6) * clamp01((rn.t + rn.len + 0.6 - s.t) / 0.6);
    g.save(); g.globalAlpha = 0.35 * a; g.fillStyle = '#1A2636'; g.fillRect(0, 0, 1080, 1920);
    g.globalAlpha = 0.55 * a; g.strokeStyle = '#CFE6FF'; g.lineWidth = 2;
    for (let q = 0; q < 160; q++) { const x = (h01(q, 501) * 1300 + t * 260) % 1300 - 110, y = (h01(q, 502) * 2000 + t * 1300 * (0.8 + 0.4 * h01(q, 503))) % 2000 - 40; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 9, y - 30); g.stroke(); }
    g.restore();
  }
}

// a mercenary company: a gold ring under each of its troops or boats
function mercMark(g, x, y, t, i) { g.save(); g.beginPath(); g.ellipse(x, y + 10, 13, 5, 0, 0, TAU); g.lineWidth = 3; g.strokeStyle = GOLD; g.globalAlpha = 0.85; g.stroke(); g.restore(); }

module.exports = { ground, roads, top, mercMark };
