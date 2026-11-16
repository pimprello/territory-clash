# Changelog

Newest first. Each entry says what changed and why, in plain words for Rellz.

## 2026-11-16 (late): live, plus fixes

Rellz: "do autopilot thing but dont open new project i will personally tell you updates then you add your owns especially when i suggest characters, fix all bugs and update more stuff and just start uploading".

- **Live:** `rules.launched` is now true, so the timer posts 4 a day at 10:00, 14:00, 18:00 and 22:00 London time. No daily scheduled session for now: Rellz gives updates in this chat, and each one gets four more ideas of my own (above all for characters he suggests).
- Fixed: a battle won by taking the whole island before the bell still said THE BELL! and rang the bell. It now says CONQUEST! in gold, with a boom instead of the bell; the review beat sheet says so too.
- Fixed: the result card's counts were fixed numbers, though the beat sheet promised they tick up. Every kingdom's count now ticks up from nothing, the winner's last.
- New: the last five seconds beat. The clock swells and settles once a second with a red glow, and a clock tick sounds each second, rising in pitch.
- New: confetti in the winner's colours (and gold and white) falls and turns over the result card. It is hashed from the seed, so a battle always looks the same.
- Tested: a full 1080x1920 render with sound (67.7 s, 60 fps, H.264 + AAC, peak -2.6 dB) and stills of a conquest finish at 59.6 s looked at.

## 2026-11-16 (evening): the video maker and posting

Rellz: "continue making the auto shorts maker now", then "push it".

- `render.js` makes the slot's Short in 4K at 60 fps (about 68 s): the face-off (faceoff.js for two kingdoms, the crown-split sliding in for three or four, with its sounds), READY... then MARCH! with Army Clash's war cry and every kingdom's colour slashing across, the sixty-second war (two fixed ticks a frame, troops drawn from cached sprites, the land bar gliding, one notice at a time), THE BELL! and the winner's card with every kingdom's count, then a crossfade into the first frame so it loops. music.js writes the soundtrack from the seed (epic and ancient in turn); captures, fallen capitals, clashes, events, betrayals and mercenaries each have a sound.
- `plan-day.js`: the packages and the video use the same plan for a slot, so the video is the battle its package describes.
- Posting copied from Tower Clash (`slot.js`, `upload.js`, `log-upload.js`, `stats.js` with Territory Clash's groupings, `fix-thumbs.js`, `set-channel.js`, the workflow). `slot.js` says skip on the timer while `rules.launched` is false, so nothing posts by itself until "autopilot on"; a manual run posts.
- `brand.js`: the profile pictures and banners for all three channels, one style.
- Tested: syntax of every file; a full still run of a four-kingdom war at 1080x1920 (68 s of video in 131 s on one core), stills looked at.

## 2026-11-16: Territory Clash, from nothing to its first day of packages

Rellz: a third Clash game, "a drag-to-capture territory game ... multiple warring kingdoms fighting over territory — no single lead character", matching Army Clash and Tower Clash, with the Clash Auto Pilot covering it, and "output for my review unless I say autopilot on".

- **The game** (`tc-sim.js`): an island of 16–26 Voronoi territories; every hold grows troops; each kingdom's mind drags orders to its neighbours (attack, expand, defend, move troops to the front); armies march in streams, cancel out head-on, take holds one for one times their defence. Last Orders in the final 10 s; the bell at 60 s (most land wins, troops break ties). Fixed 1/120 s ticks, its own dice per system.
- **The world** (`tc-data.js`, `LORE.md`): Vael and the War of Shards; twelve kingdoms with fixed colours (chosen so 105 four-kingdom line-ups keep every colour pair 30 apart), crests from Army Clash's tribe emblems, champions and marching troops from the shared cast, capitals, mottos and one signature trait each; six feuds; six formats (Crown War, Three Crowns, Blood Feud, The Pact, Last Ember, Crown Rush); four world events; running jokes that only show when true.
- **Picking a Short** (`pick.js`): the least-seen line-up with clear colours (so day one shows all twelve kingdoms), then 5 seeds × 6 tempos auditioned and the most dramatic kept (late lead changes, fallen capitals, a one-territory margin; Last Ember's 50/50 survival target like Tower Clash's close finish). True, spoiler-free titles from what really happened; Tower Clash's description layout; tags; the beat sheet; one notice at a time, queued instead of stacked.
- **Looks** (`tc-draw.js`): the bevelled island with thick ink borders between kingdoms, holds as little castles, towers, farms, mines and the Great Crown, drag strokes with a glowing tip, upright marching troops and boats, the scoreboard with crests and the land bar; the crown-split face-off for 3–4 kingdoms (two kingdoms use the shared faceoff.js); the thumbnail in Tower Clash's layout, from the most even busy moment where the eventual winner isn't ahead.
- **Packages** (`package.js`): tomorrow's four Shorts as copy-pasteable packages (`packages/<date>.md`), a review page with copy buttons (`packages/<date>.html`), upload-ready thumbnails and review stills (`out/`).
- **Balance** (`balance.js`, 900 battles): every kingdom between ×0.82 and ×1.10 of a fair share after tuning (Gilded Throne's mercenaries 6→5, Sunspire's dawn 3→2, Ironreach's defence 1.15→1.1, Emberhold steadier, Bramblemoor and Stormhowl a little stronger).
- **Clash Auto Pilot v2** (`CLASH-AUTOPILOT.md`, for Rellz to paste into the one daily task): all three games; health for all three before any building; a report-only shared-file check (today it shows Army Clash's engine.js and faceoff.js ahead of Tower Clash's, from the Army Clash-only charge and live face-off); no idea built twice by accident; Territory Clash in review mode; a budget order; one summary.
- Tested: syntax of every file; 900 headless battles (no crashes, every battle ends); the four packages for 2026-11-17 with their thumbnails and stills, looked at.
- **For Rellz:** make an empty public repo `pimprello/territory-clash` and push this folder (or let Claude do it); paste `CLASH-AUTOPILOT.md` into the Clash Auto Pilot task; when you want it live, make the channel (@TerritoryClashShorts) and say "autopilot on".
