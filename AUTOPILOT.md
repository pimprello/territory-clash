# Territory Clash autopilot

You are the daily autopilot for Rellz's third Clash channel, Territory Clash: drag-to-capture wars between the kingdoms of Vael (`LORE.md`). This file is **Territory Clash's third of the one daily "Clash Auto Pilot" run** (`CLASH-AUTOPILOT.md` is the outer prompt; Army Clash and Tower Clash have their own halves). Don't run it twice in a day and don't start a second session for this repo. You run unattended: decide, act, and leave a clear record. Rellz reads `CHANGELOG.md` and the review page.

## 0. Quality first, efficiently

Every change answers one question: would a stranger stop scrolling, watch to the end, and want the next one?

- **The opening reads at phone size:** whose kingdoms, what's at stake, the question.
- **The map is readable at a glance:** every kingdom's colour, its land, the counts, where the armies are going. Clean beats busy.
- **Smooth, readable, heavy:** nothing teleports; captures flash and flip; a fallen capital lands like a blow.
- **Titles and thumbnails are true and never give the result away.**
- **Three unique new things a day, each small and checked on stills.** Never a big rewrite.
- **Do only what today's changes need.** Skip every gate whose subject didn't change.

## 1. Set up

1. Work on `main` (the outer session attached and cloned the repo). `git fetch` and `git reset --hard origin/main` if a clone is already there.
2. `npm ci`. If `canvas` won't install, you can still plan battles and run `balance.js`, but make no visual changes that day.
3. Read: this file, `CLAUDE.md`, the last 3 entries of `CHANGELOG.md`, `rules.json`. Open `LORE.md` or `IDEAS.md` only at step 3B.

## 2. Health

- **Pre-launch** (`rules.launched` false): check that yesterday's run left `packages/<tomorrow>.md`. If the last run failed, fixing it is today's job.
- **Live:** as Tower Clash's playbook: the last 12 runs of "Post Territory Clash" (`gh run list -R pimprello/territory-clash -L 12`) and the gaps in `uploads.md`; a failing upload or a missed slot is the whole day's job. Thumbnail refusals and a missing `YT_API_KEY` are notes for Rellz, not fixes.

## 3. Decide today's changes

**A. Learn from views** (live, and only once `stats/summary.md` covers 30+ videos at least a day old): compare median views by mode, line-up size, kingdom, feud, map look and title kind; ignore groups under 5 videos and gaps under 20%; move `rules.modes` weights by at most 25% a day, never to zero, keeping a third of the weight off the winner. Write the numbers in the changelog, or one line if nothing crossed a threshold.

**B. Add three unique new things** (Rellz, 2026-11-15: "it should add 3 unique things each time to each game"). Write one brief (5–8 sentences) for all three under **"Today's three ideas:"** in the changelog: what would surprise someone who has seen the last 10 Territory Clash Shorts, three times over, without the three stepping on each other? Read the other two games' "Today's three ideas" from this same run first, and don't build the same thing here unless it's meant for all three.

If the date matches a season, make one of the three seasonal (Dec 20–26: a snowbound Vael, a gift-cart neutral hold; Oct 25–31: the Hollow Crown's night, haunted barrows; Mar 29–Apr 6: spring map, egg-hunt neutral holds; Dec 31–Jan 1: fireworks over the bell; Feb 14: a marriage pact between two kingdoms; Jul 4: a summer festival map). Otherwise let `k0 = parseInt(YYYYMMDD) % 12` and build kinds `k0+1`, `((k0+1) % 12)+1`, `((k0+2) % 12)+1`:

1. A new kingdom (thirteen and up): colour clear of the others (`colourGap` ≥ 30 against enough of them to make many line-ups), crest, champion, marching troop, capital, motto, one small signature trait; balance it.
2. A new rivalry and its feud line, or a new chapter in an old one (a title format that uses it).
3. A new mode (series format) with its hook, fair and auditioned like the rest.
4. A new hold type (a bridge, a lighthouse that reveals sea lanes, a shrine…), its icon and its number.
5. A new world event (`EVENTS`), hitting every kingdom alike.
6. A new map look (`THEMES`, ground and sea colours, scenery) or a new island shape (two islands and a bridge, a ring around a lake…).
7. A signature-trait moment made visible (Gilded coins, Duskveil's dagger, Sunspire's dawn light sweeping its land), looks only.
8. New title formats and hooks in `pick.js` (true, spoiler-free, about something that really happened).
9. A look upgrade: holds, drag strokes, captures, the land bar, the bell's count-up (looks only).
10. A camera or pacing beat for the render (a slow push on a falling capital, a pull-back at Last Orders), within the calm-camera rule.
11. A running joke that only shows when it's true (a new notice from the battle log).
12. A retention touch: the pinned-comment prompt, a mid-battle "who's winning?" beat, the outro line, a sound cue.

`IDEAS.md` has the backlog and the already-built list.

**C. Fix what looks wrong**, only if step 2, a still, or Rellz's notes point at it.

## 4. Guardrails (never break these)

- **Nothing is uploaded while `rules.launched` is false.** Only Rellz's "autopilot on" changes it.
- When live: **4 posts a day at 10:00, 14:00, 18:00 and 22:00 London**, never more, never at other times; never spend YouTube quota on anything but the posts, their thumbnails and stats.
- **Never change `pimprello/army-clash` or `pimprello/tower-clash`** from this half. `engine.js`, `music.js` and `faceoff.js` stay identical to the shared copies; if today's work needs a change in one, flag it for the outer run, don't let them drift.
- **Smooth animations and UI**, **one notice at a time**, **characters upright**, **drawing never changes a battle** (fixed ticks, separate dice), **titles and thumbnails true and spoiler-free**, **no real nations, flags, people or insignia**, **original music only**, **no preview videos** (stills).
- **Every kingdom stays fair:** after any gameplay change, `node balance.js 100` keeps each kingdom within about ×0.75–×1.3 of a fair share.

## 5. Test (only what you changed)

- Any code: `node --check` each changed file; parse `rules.json`.
- Gameplay or data numbers: `node balance.js 100`: no crashes; win rates in range; Crown War still has lead changes (about 4+ a battle on average).
- Looks, titles, thumbnail: `node package.js <tomorrow>` and look at `out/<date>-*-thumb.jpg` and `-stills.jpg`.

## 6. Ship and record

1. Run `node package.js` for tomorrow (always, pre-launch: this is the day's deliverable), commit `packages/` and the thumbnails, `git pull --rebase`, push.
2. Publish `packages/<date>.html` as the review page: republish the same artifact (slug `91b627c0-3a5e-4d3c-b8d6-580854c9a975`) with the new date in its title.
3. A dated `CHANGELOG.md` entry: today's three ideas, what changed and why, what you tested and skipped, anything Rellz needs to do.
4. Finish with three lines for the outer summary.

## 7. Improve this playbook

If something here slowed you down or misled you, fix it, keep every guardrail, and say so in the changelog.

- Rellz's picks (`rules.picks`, 2026-11-17) are in all three games with the same dial names; when a pick is changed for every game, change it in all three, and keep `commentary.js`, `music.js` and `holiday.js` identical.
