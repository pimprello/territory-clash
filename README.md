# Territory Clash

Automated drag-to-capture territory-war Shorts: the third channel in the Clash family, beside Army Clash and Tower Clash. Every Short is a new 60-second war between two, three or four kingdoms of Vael on an island of territories. Every hold grows troops; every order is a drag across the map; the most land at the bell wins. The world, the kingdoms and the formats are in `LORE.md`.

It reuses Army Clash's engine (`engine.js`: the cast, emblems, palettes, shine, sound) and the shared `music.js` and `faceoff.js`, exactly as Tower Clash does, and adds the territory game on top.

## Where it stands

**Pre-launch** (`rules.launched: false`). Every day the Clash Auto Pilot runs `node package.js`, which plans the next day's four Shorts and writes, for Rellz's review:

- `packages/<date>.md`: one copy-pasteable package per slot (title, description, tags, hashtags, pinned comment, hook, beat sheet, on-screen captions, assets, loop, thumbnail);
- `packages/<date>.html`: the same as a review page with copy buttons and the pictures;
- `out/<date>-<hh>-thumb.jpg`: the upload-ready thumbnail (1080×1920), and `-stills.jpg`: five review stills.

The seeds are fixed, so the battle in a package is the battle the video will show (`plan-day.js` is shared by both). The video maker and the posting workflow are in place: a manual run (Actions → Post Territory Clash → Run workflow) makes the current slot's Short and posts it. When Rellz says **"autopilot on"**, `rules.launched` becomes true and the channel posts on its own at 10:00, 14:00, 18:00 and 22:00 London time, like the other two.

## Files

| File | What it is |
| --- | --- |
| `tc-data.js` | The tables: kingdoms, rivalries, holds, modes, world events, map looks, place names |
| `tc-sim.js` | The battle, headless: the island, territories, orders, marches, clashes, captures, the bell (fixed 1/120 s ticks, its own dice per system) |
| `pick.js` | Plans one Short: the line-up, the audition (5 seeds × 6 tempos, the most dramatic kept), title, description, tags, beat sheet, notices, thumbnail moment |
| `tc-draw.js` | Drawing: the island, holds, drag strokes and marching troops, the scoreboard and land bar, the crown-split face-off, the thumbnail |
| `stills.js` | The thumbnail and the review stills for a plan |
| `package.js` | The day's packages (`node package.js [YYYY-MM-DD]`) |
| `plan-day.js` | Which format and seed go in which slot (shared by the packages and the video) |
| `render.js` | Makes one Short: face-off, the map wakes / MARCH!, the war, the bell and result, the loop; music and sound; `out/territory-clash.mp4`, `out/thumb.jpg`, `out/meta.json` |
| `slot.js`, `upload.js`, `log-upload.js`, `stats.js`, `fix-thumbs.js`, `set-channel.js`, `check-videos.js` | Posting, as in Tower Clash (slot.js also says skip on the timer until `rules.launched`) |
| `.github/workflows/post-territory-clash.yml` | Wakes every 15 minutes; makes and posts in each slot once launched; a manual run always posts |
| `brand.js` | Channel art for all three channels (`node brand.js`) |
| `sfx/` | The war cries for MARCH! (Army Clash's) |
| `balance.js` | Win rates per kingdom and how battles end, from many headless battles (`node balance.js 150`) |
| `engine.js`, `music.js`, `faceoff.js` | Shared with Army Clash and Tower Clash: identical copies (engine.js is Army Clash's plus the `api._` export line) |
| `rules.json` | The dials (see `RULES.md`) |
| `LORE.md` | The bible: world, kingdoms, feuds, formats, jokes, looks, risk flags |
| `CHANNEL.md` | The About text and the channel art |
| `AUTOPILOT.md` | Territory Clash's half of the daily Clash Auto Pilot |
| `CLASH-AUTOPILOT.md` | The prompt for the one daily Clash Auto Pilot task (all three games) |

## Going live

1. The channel (@TerritoryClashShorts), its own Google Cloud project and upload key (Army Clash's README steps), and the secrets `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN`, `YT_API_KEY` in this repo.
2. One test post: Actions → Post Territory Clash → Run workflow (pick `private` to check it first).
3. Rellz says "autopilot on": `rules.launched: true`.

## Testing

```
npm ci
node balance.js 150                 # win rates and endings, no drawing
node package.js 2026-11-17          # one day's packages, thumbnails and stills
STILLS=1 SCALE=1 SEED=4242 MODE=war node render.js   # still frames of a video in out/, no video
SCALE=1 SECS=12 node render.js      # a 12-second 1080x1920 test clip of the current slot
```
