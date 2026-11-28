// The clock (2026-11-28). GitHub's own timer (cron) dropped almost every wake-up from 27 Nov (two runs in 28 hours, one of them
// five hours late), so posts were missed. This runs inside a long GitHub job instead: it wakes the posting workflow on the
// minute at every slot in rules.schedule (London time), for about five and a half hours, then the workflow hands over to the
// next clock (.github/workflows/clock.yml). The posting run still decides for itself (slot.js), so a wake-up can never post
// twice, and a late or missed one is filled within the slot's window. With rules.long, it wakes the long-form workflow too.
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');
const R = require(path.join(process.cwd(), 'rules.json'));
const S = R.schedule || {}, TZ = S.timeZone || 'Europe/London', HOURS = S.hours || [];
const POST = process.env.POST_WORKFLOW, LONG = process.env.LONG_WORKFLOW;
const RUN_FOR = Number(process.env.RUN_MINUTES || 330) * 60e3;

const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour12: false, hour: '2-digit', minute: '2-digit', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' });
const local = t => { const p = {}; for (const x of fmt.formatToParts(new Date(t))) p[x.type] = x.value; return p; };
const sleep = ms => new Promise(r => setTimeout(r, Math.max(0, ms)));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// every slot (and long-form slot) between from and to, as UTC times, found minute by minute (so summer time is always right)
function slots(from, to) {
  const out = [], L = R.long && R.long.on !== false ? R.long : null;
  for (let t = Math.ceil(from / 60e3) * 60e3; t <= to; t += 60e3) {
    const p = local(t); if (p.minute !== '00') continue;
    const h = Number(p.hour);
    if (HOURS.includes(h)) out.push({ t, wf: POST, what: `${p.hour}:00 Short` });
    if (L && LONG && h === (L.hour ?? 15)) {
      // a long-form video every L.everyDays days, counted from L.from (a London date)
      const day = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)), d0 = Date.parse((L.from || '2026-11-29') + 'T00:00:00Z');
      const n = Math.round((day - d0) / 864e5);
      if (n >= 0 && n % (L.everyDays || 3) === 0) out.push({ t, wf: LONG, what: `${p.hour}:00 long-form video` });
    }
  }
  return out;
}

function wake(wf, why) {
  try { execFileSync('gh', ['workflow', 'run', wf, '--ref', 'main'], { stdio: 'inherit' }); log('woke', wf, '-', why); }
  catch (e) { log('::warning title=Clock::could not start ' + wf + ': ' + e.message); }
}

(async () => {
  const t0 = Date.now(), end = t0 + RUN_FOR;
  // first, a catch-up: if a slot in the last two hours was missed, the posting run fills it (or skips if it's already filled)
  if (POST) wake(POST, 'catch-up check at start');
  const list = slots(t0 - 120e3, end);   // (a slot that began a moment ago is still woken)
  log(`clock running until ${new Date(end).toISOString().slice(11, 16)} UTC; slots: ${list.map(s => s.what).join(', ') || 'none'}`);
  for (const s of list) {
    await sleep(s.t + 45e3 - Date.now());   // 45 s after the hour
    wake(s.wf, s.what);
  }
  await sleep(end - Date.now());
  log('handing over to the next clock');
})();
