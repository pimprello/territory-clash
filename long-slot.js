// Is a long-form video due today? (rules.long: every `everyDays` days from `from`, a London date, and not posted yet today.)
// Prints "go: ..." or "skip: ..." and writes go=yes|no for the workflow. LONG_FORCE=1 always says go.
'use strict';
const fs = require('fs'), path = require('path');
const R = JSON.parse(fs.readFileSync(path.join(__dirname, 'rules.json'), 'utf8')), L = R.long || {};
const p = {}; for (const x of new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())) p[x.type] = x.value;
const today = `${p.year}-${p.month}-${p.day}`;
const done = (() => { try { return fs.readFileSync(path.join(__dirname, 'longs.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch (e) { return []; } })();
const n = Math.round((Date.parse(today + 'T00:00:00Z') - Date.parse((L.from || today) + 'T00:00:00Z')) / 864e5);
let go = false, why;
if (process.env.LONG_FORCE === '1') { go = true; why = 'forced by hand'; }
else if (L.on === false) why = 'long-form videos are off (rules.long.on)';
else if (n < 0 || n % (L.everyDays || 3)) why = `not a long-form day (${today})`;
else if (done.some(d => d.date === today)) why = `today's long-form video is already up`;
else { go = true; why = `long-form day ${today}`; }
console.log(`${go ? 'go' : 'skip'}: ${why}`);
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `go=${go ? 'yes' : 'no'}\n`);
