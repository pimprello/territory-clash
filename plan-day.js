// Territory Clash: which Short goes in which slot. Shared by package.js (the review packages) and render.js (the video), so
// the video for a slot is the battle its package describes. Everything is fixed by the date and the hour.
'use strict';
const fs = require('fs');
const path = require('path');
const rules = require('./rules.json');
const { rng } = require('./tc-sim.js');

const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function readJsonl(f) { try { return fs.readFileSync(path.join(__dirname, f), 'utf8').split('\n').filter(l => l.trim()).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean); } catch (e) { return []; } }
// what came before a day: posted videos (videos.jsonl) and planned ones (packages/planned.jsonl), older days only
function pastBefore(date) {
  const posted = readJsonl('videos.jsonl').map(v => Object.assign({}, v, { date: v.planDate || String(v.date).slice(0, 10) }));
  const planned = readJsonl('packages/planned.jsonl');
  const seen = new Set(posted.map(v => `${v.planDate || ''} ${v.hour ?? ''}`));
  return posted.concat(planned.filter(p => !seen.has(`${p.date} ${p.hour}`))).filter(v => v.date < date).sort((a, b) => (a.date + String(a.hour).padStart(2, '0')).localeCompare(b.date + String(b.hour).padStart(2, '0')));
}
// the day's formats: the launch line-up on the very first day, then weighted picks (no format twice in a day except Crown War)
function dayModes(date, past) {
  if (!past.length && rules.launchDay) return rules.launchDay.slice(0, rules.schedule.hours.length);
  const R = rng(hash('modes' + date)), out = [];
  for (const _ of rules.schedule.hours) {
    const pool = Object.entries(rules.modes).filter(([m, w]) => w > 0 && (m === 'war' || !out.includes(m)));
    let r = R() * pool.reduce((a, [, w]) => a + w, 0), pick = pool[0][0];
    for (const [m, w] of pool) if ((r -= w) <= 0) { pick = m; break; }
    out.push(pick);
  }
  return out;
}
function daySlots(date) {
  const past = pastBefore(date), modes = dayModes(date, past);
  return rules.schedule.hours.map((hour, i) => ({ date, hour, mode: modes[i], seed: hash(`${date} ${hour}`), slot: past.length + i, past }));
}
module.exports = { daySlots, pastBefore, dayModes, hash, readJsonl };
