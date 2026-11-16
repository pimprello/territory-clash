// Territory Clash: the day's Shorts packages, for Rellz's review (and, once rules.launched is on, the plan render.js films).
// `node package.js [YYYY-MM-DD]` (default: tomorrow, London) writes packages/<date>.md (one copy-pasteable package per slot),
// packages/<date>.jsonl (the plans: seeds, tempos, line-ups) and out/<date>-<hh>-thumb.jpg / -stills.jpg.
// Everything is fixed by the date: running it twice gives the same packages.
'use strict';
const fs = require('fs');
const path = require('path');
const D = require('./tc-data.js');
const P = require('./pick.js');
const { writeStills } = require('./stills.js');
const E = require('./engine.js')._;
const rules = JSON.parse(fs.readFileSync(path.join(__dirname, 'rules.json'), 'utf8'));

const date = process.argv[2] || (() => { const d = new Date(Date.now() + 864e5); return d.toLocaleDateString('en-CA', { timeZone: 'Europe/London' }); })();
const { daySlots } = require('./plan-day.js');
const slots = daySlots(date), past = slots[0].past;
const modes = slots.map(x => x.mode), plans = [], md = [], cards = [];
const music = (rules.music || {}).styles || ['epic', 'ancient'];
md.push(`# Territory Clash: packages for ${date}`, '', `Four Shorts, at ${rules.schedule.hours.map(h => `${h}:00`).join(', ')} London time, the same slots as Army Clash and Tower Clash. Each is the most dramatic of ${rules.quality.candidates} auditioned battles. Seeds are fixed, so the video will play out exactly as the beat sheet says. Results are in the review notes only: they never appear in a title, thumbnail or description.`, '');
rules.schedule.hours.forEach((hour, i) => {
  const mode = modes[i], slot = past.length + i;
  const t0 = Date.now();
  const plan = P.makeShort({ seed: slots[i].seed, mode, past: past.concat(plans), gap: (a, b) => E.colourGap(a, b), slot, palettes: E.PALETTES });
  plan.thumbQ = D.MODES[mode].hook;
  const name = `${date}-${String(hour).padStart(2, '0')}`;
  const files = writeStills(plan, path.join(__dirname, 'out'), name);
  const K = plan.kingdoms.map(k => D.KINGDOMS[k]), s = plan.sim;
  const style = music[slot % music.length];
  const rec = { date, hour, slot, mode, kingdoms: plan.kingdoms, seed: plan.seed, tempo: plan.tempo, underdogPower: plan.underdogPower, theme: plan.theme, title: plan.title, titleKind: plan.titleKind, drama: plan.drama, winner: plan.winner, how: plan.how, margin: plan.margin, thumbT: plan.thumbT, music: style };
  plans.push(rec);
  const who = K.map(k => P.tc(k.name)).join(' vs ');
  const newHere = [];
  if (K.length > 2) newHere.push('crown-split face-off (3–4 kingdoms)');
  if (mode === 'pact') newHere.push('the Pact (alliance that can break)');
  if (mode === 'ember') newHere.push('Last Ember underdog survival');
  if (mode === 'crown') newHere.push('the Great Crown');
  const ev = s.log.find(e => e.kind === 'event'); if (ev) newHere.push(`world event: ${D.EVENTS[ev.event].name.toLowerCase()}`);
  md.push(`---`, '', `## ${hour}:00 · ${D.MODES[mode].name} · ${who}`, '');
  md.push(`**Title**`, '```', plan.title, '```');
  if (plan.altTitles.length) md.push(`Also true for this battle: ${plan.altTitles.map(t => `“${t}”`).join(' · ')}`, '');
  md.push(`**Description**`, '```', plan.description, '```');
  md.push(`**Tags** (YouTube's tag box)`, '```', plan.tags.join(', '), '```');
  md.push(`**Hashtags** (already the description's last line): \`#shorts #territoryclash #strategy #simulation #conquest\``, '');
  md.push(`**Pinned comment** (post by hand; the upload key can't comment)`, '```', `Pick your kingdom before the bell 👇 ${K.map(k => `${k.icon} ${P.tc(k.short || k.name)}`).join('  ')}`, '```');
  md.push(`**Hook, first 3 s:** ${K.length > 2 ? `the crown-split face-off: ${K.length} champions slam in from the corners, lightning down the seams, WAR in the middle` : `the electric face-off (shared faceoff.js): ${P.tc(K[0].name)}'s ${K[0].champion} vs ${P.tc(K[1].name)}'s ${K[1].champion}`}, with the question **${D.MODES[mode].hook}** across the top. At 2.6 s a white flash opens on the island; at 3.7 s **MARCH!** and the first drags draw themselves.`, '');
  md.push(`**Thumbnail:** \`out/${name}-thumb.jpg\` (1080×1920, upload-ready). Layout as Tower Clash's: logo at y 262, the question in 1–2 lines, the island framed with a slight tilt and a white border (battle time ${plan.thumbT.toFixed(1)} s, the most even busy moment, chosen so the eventual winner isn't ahead), the champions in rings below with crests and names. Background from the line-up's first cool colour, hue-shifted and deepened, 18 faint rays. Everything inside y 200–1720.`, '');
  md.push(`**Beat sheet** (video time · beat · on screen)`, '', '| Time | Beat | On screen |', '| --- | --- | --- |');
  for (const [t, b, txt] of plan.sheet) md.push(`| ${P.vt(t)} | ${b} | ${txt.replace(/\|/g, '/')} |`);
  md.push('');
  md.push(`**On-screen captions** (one at a time, 2.2 s each, fading; never stacked; one that would overlap waits its turn): ${plan.notices.map(n => `\`${P.vt(n.t + P.PRE)}\` ${n.text}`).join(' · ')}`, '');
  md.push(`**Assets**`, '');
  for (const k of K) md.push(`- ${k.icon} **${P.tc(k.name)}**: colour ${k.colour}, crest ${k.emblem}, champion ${k.champion}, marching troop ${k.line}, capital ${P.tc(k.capital)}. ${k.traitText}.`);
  md.push(`- Map: ${P.tc(D.THEMES[plan.theme].name)} (${s.cells.length} territories: ${['capital', 'fort', 'farm', 'mine', 'village', 'crown'].map(t => [t, s.cells.filter(c => c.type === t).length]).filter(x => x[1]).map(([t, n]) => `${n} ${t}${n > 1 ? 's' : ''}`).join(', ')}).`);
  md.push(`- Music: music.js (shared), the “${style}” style written from the seed (${music.join(' and ')} in turn); effects under the music (sfx 0.7). War cry: Army Clash's \`sfx/charge-*.wav\`.`);
  md.push(`- Plan: seed ${plan.seed}, tempo ×${plan.tempo}${plan.underdogPower ? `, underdog ×${plan.underdogPower}` : ''}, ${plan.seconds.toFixed(1)} s long. Stills for review: \`out/${name}-stills.jpg\`.`, '');
  md.push(`**Loop:** in the last 0.45 s the borders ink-wash back to the opening map and the frame crossfades into the face-off's first frame, so a replay starts seamlessly.`, '');
  if (newHere.length) md.push(`**New in this one (not in Army/Tower Clash):** ${newHere.join('; ')}.`, '');
  cards.push({ hour, name, mode, who, plan, K, style, newHere, files, pinned: `Pick your kingdom before the bell 👇 ${K.map(k => `${k.icon} ${P.tc(k.short || k.name)}`).join('  ')}`,
    hook: md.find(l => l.startsWith('**Hook')) , result: `${P.tc(D.KINGDOMS[plan.winner].name)} wins ${plan.how === 'bell' ? `at the bell by ${plan.margin} territor${plan.margin === 1 ? 'y' : 'ies'}${plan.margin === 0 ? ' (level on land, won on troops)' : ''}` : 'by conquest'}${mode === 'ember' ? (s.underdogSurvived ? `; ${P.tc(K[0].name)} survives` : `; ${P.tc(K[0].name)} falls`) : ''}. Drama score ${plan.drama}.` });
  md.push(`<details><summary>Review notes (spoiler: the result)</summary>`, '', `${P.tc(D.KINGDOMS[plan.winner].name)} wins ${plan.how === 'bell' ? `at the bell by ${plan.margin} territor${plan.margin === 1 ? 'y' : 'ies'}${plan.margin === 0 ? ' (level on land, won on troops)' : ''}` : 'by conquest'}${mode === 'ember' ? (s.underdogSurvived ? `; ${P.tc(K[0].name)} survives` : `; ${P.tc(K[0].name)} falls`) : ''}. Drama score ${plan.drama} (best of ${rules.quality.candidates} seeds × ${rules.quality.tempos.length} tempos).`, '', '</details>', '');
  console.log(`${hour}:00 ${mode} ${plan.kingdoms.join(', ')} · ${plan.title} · drama ${plan.drama} · ${((Date.now() - t0) / 1000).toFixed(1)} s`);
});
fs.mkdirSync(path.join(__dirname, 'packages'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'packages', `${date}.md`), md.join('\n'));
const plannedPath = path.join(__dirname, 'packages', 'planned.jsonl');
const keep = (() => { try { return fs.readFileSync(plannedPath, 'utf8').split('\n').filter(l => l.trim() && !l.includes(`"date":"${date}"`)); } catch (e) { return []; } })();
fs.writeFileSync(plannedPath, keep.concat(plans.map(p => JSON.stringify(p))).join('\n') + '\n');
fs.writeFileSync(path.join(__dirname, 'packages', `${date}.html`), reviewPage(date, cards));
console.log(`wrote packages/${date}.md and packages/${date}.html`);

// ----- the review page: the same packages with copy buttons and the pictures, one self-contained file -----
function reviewPage(date, cards) {
  const esc = x => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const img = f => 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64');
  const fontB64 = fs.readFileSync(path.join(__dirname, 'fonts/BarlowCondensed-ExtraBoldItalic.ttf')).toString('base64');
  const field = (label, value, id) => `<div class="field"><div class="fh"><span>${label}</span><button data-copy="${id}">Copy</button></div><pre id="${id}">${esc(value)}</pre></div>`;
  const day = new Date(date + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const body = cards.map((c, i) => {
    const p = c.plan, rows = p.sheet.map(([t, b, x]) => `<tr><td>${P.vt(t)}</td><td>${esc(b)}</td><td>${esc(x)}</td></tr>`).join('');
    return `<section class="short" id="s${c.hour}">
  <div class="top"><div class="slot">${c.hour}:00</div><div><h2>${esc(D.MODES[c.mode].name)}</h2><div class="who">${c.K.map(k => `<span class="k" style="--c:${E.PALETTES[k.colour].c};--l:${E.PALETTES[k.colour].l}">${k.icon} ${esc(P.tc(k.short || k.name))}</span>`).join('')}</div></div></div>
  <div class="grid">
    <figure><img src="${img(c.files.thumb)}" alt="Thumbnail for the ${c.hour}:00 Short"><figcaption>1080×1920, upload-ready: right-click or long-press to save (also <code>out/${c.name}-thumb.jpg</code> in the repo)</figcaption></figure>
    <div class="fields">
      ${field('Title', p.title, `t${i}`)}
      ${p.altTitles.length ? `<div class="alt">Also true for this battle: ${p.altTitles.map(esc).join(' · ')}</div>` : ''}
      ${field('Description', p.description, `d${i}`)}
      ${field('Tags', p.tags.join(', '), `g${i}`)}
      ${field('Hashtags', '#shorts #territoryclash #strategy #simulation #conquest', `h${i}`)}
      ${field('Pinned comment (post by hand)', c.pinned, `c${i}`)}
    </div>
  </div>
  <h3>Hook, first 3 seconds</h3><p>${esc(c.hook.replace(/^\*\*Hook, first 3 s:\*\* /, '').replace(/\*\*/g, ''))}</p>
  <h3>Beat sheet</h3><table><thead><tr><th>Time</th><th>Beat</th><th>On screen</th></tr></thead><tbody>${rows}</tbody></table>
  <h3>On-screen captions</h3><p class="caps">${p.notices.map(n => `<span><b>${P.vt(n.t + P.PRE)}</b> ${esc(n.text)}</span>`).join('')}</p>
  <h3>Assets</h3><ul>${c.K.map(k => `<li><b>${k.icon} ${esc(P.tc(k.name))}</b>: ${k.colour.toLowerCase()}, crest ${k.emblem}, champion ${k.champion}, marches as ${k.line}, capital ${esc(P.tc(k.capital))}. ${esc(k.traitText)}.</li>`).join('')}
    <li><b>Map</b>: ${esc(P.tc(D.THEMES[p.theme].name))}, ${p.sim.cells.length} territories. <b>Music</b>: music.js, ${c.style} style. <b>Plan</b>: seed ${p.seed}, tempo ×${p.tempo}${p.underdogPower ? `, underdog ×${p.underdogPower}` : ''}, ${p.seconds.toFixed(1)} s.</li></ul>
  <h3>Loop</h3><p>In the last 0.45 s the borders ink-wash back to the opening map and the frame crossfades into the face-off's first frame.</p>
  ${c.newHere.length ? `<p class="new">New to the Clash family here: ${esc(c.newHere.join('; '))}.</p>` : ''}
  <h3>Review stills</h3><img class="sheet" src="${img(c.files.sheet)}" alt="Five review stills for the ${c.hour}:00 Short">
  <details><summary>Result (spoiler)</summary><p>${esc(c.result)}</p></details>
</section>`; }).join('\n');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Territory Clash packages: ${date}</title>
<style>
@font-face{font-family:Barlow;src:url(data:font/ttf;base64,${fontB64});font-weight:800;font-style:italic}
:root{--ink:#04060B;--bg:#0B0F1A;--panel:#121829;--line:#24304B;--text:#E9EEF6;--muted:#9AA6BE;--gold:#FFD23F;--em:#10B981}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
header{padding:28px 20px 8px;max-width:1100px;margin:auto}h1,h2,.slot{font-family:Barlow,"Arial Narrow",sans-serif;font-style:italic;font-weight:800;letter-spacing:.5px;margin:0}
h1{font-size:44px;line-height:1}h1 span{color:var(--em)}header p{color:var(--muted);margin:8px 0 0}
nav{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}nav a{color:var(--text);text-decoration:none;background:var(--panel);border:1px solid var(--line);padding:6px 12px;border-radius:99px;font-size:14px}
main{max-width:1100px;margin:auto;padding:0 20px 60px}.short{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:22px;margin-top:22px}
.top{display:flex;gap:16px;align-items:center}.slot{font-size:40px;color:var(--gold)}h2{font-size:30px}.who{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
.k{border:2px solid var(--c);color:var(--l);background:color-mix(in srgb,var(--c) 18%,transparent);padding:2px 10px;border-radius:99px;font-size:13px;font-weight:600}
.grid{display:grid;grid-template-columns:minmax(220px,300px) 1fr;gap:22px;margin-top:18px}@media(max-width:760px){.grid{grid-template-columns:1fr}}
figure{margin:0}figure img{width:100%;border-radius:12px;border:1px solid var(--line);display:block}figcaption{font-size:13px;color:var(--muted);margin-top:6px}figcaption a{color:var(--em)}
.field{margin-bottom:12px}.fh{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px}
pre{margin:0;white-space:pre-wrap;word-break:break-word;background:var(--ink);border:1px solid var(--line);border-radius:10px;padding:10px 12px;font:14px/1.5 ui-monospace,Menlo,Consolas,monospace;color:var(--text)}
button{font:600 13px system-ui,sans-serif;background:var(--em);color:#04150F;border:0;border-radius:8px;padding:5px 12px;cursor:pointer}button.done{background:var(--gold)}
.alt{font-size:13px;color:var(--muted);margin:-4px 0 12px}h3{font-size:14px;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);margin:22px 0 8px}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--line);vertical-align:top}td:first-child{white-space:nowrap;color:var(--gold);font-variant-numeric:tabular-nums}td:nth-child(2){white-space:nowrap;font-weight:600}
.caps{display:flex;flex-wrap:wrap;gap:6px}.caps span{background:var(--ink);border:1px solid var(--line);border-radius:8px;padding:3px 8px;font-size:13px}.caps b{color:var(--gold);margin-right:4px}
ul{padding-left:18px}li{margin-bottom:4px}.new{border-left:3px solid var(--em);padding-left:10px;color:#BFF5DF}.sheet{width:100%;border-radius:12px;border:1px solid var(--line)}
details{margin-top:16px;background:var(--ink);border:1px solid var(--line);border-radius:10px;padding:10px 12px}summary{cursor:pointer;color:var(--muted)}
</style></head><body>
<header><h1>TERRITORY <span>CLASH</span></h1><p>Packages for ${esc(day)}: four Shorts at ${rules.schedule.hours.map(h => h + ':00').join(', ')} London time. Review mode: nothing posts until you say “autopilot on”.</p>
<nav>${cards.map(c => `<a href="#s${c.hour}">${c.hour}:00 · ${esc(D.MODES[c.mode].name)}</a>`).join('')}</nav></header>
<main>${body}</main>
<script>
document.addEventListener('click', async e => {
  const b = e.target.closest('button[data-copy]'); if (!b) return;
  const t = document.getElementById(b.dataset.copy).textContent;
  let ok = false;
  try { await navigator.clipboard.writeText(t); ok = true; } catch (err) {
    try { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); ok = document.execCommand('copy'); a.remove(); } catch (e2) { ok = false; }
  }
  b.textContent = ok ? 'Copied' : 'Select and copy'; b.classList.toggle('done', ok);
  setTimeout(() => { b.textContent = 'Copy'; b.classList.remove('done'); }, 1600);
});
</script></body></html>`;
}
