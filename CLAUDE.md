# Notes for Claude

This repo is Territory Clash for Rellz: drag-to-capture kingdom wars, the third Clash channel. See README.md for how it works and LORE.md for the world.

- **Which game an update is for** (Rellz, 2026-11-15, extended to three games): an update asked for in the Territory Clash chat is for Territory Clash only; in the Army Clash chat, Army Clash only; in the Tower Clash chat, Tower Clash only; in the Clash Auto Pilot chat, all three. `engine.js`, `music.js` and `faceoff.js` are copies of the shared files (engine.js is Army Clash's plus the `api._` export line); bring them back in step only for an update meant for every game.
- **Don't change `pimprello/army-clash` or `pimprello/tower-clash` from here.** Never touch their secrets, workflows or schedules. Another Claude session may be working on these repos at the same time: always pull before editing and merge, never overwrite.
- **Review first** (Rellz, 2026-11-16: "Output for my review unless I say autopilot on"): while `rules.launched` is false, nothing is uploaded; the daily run writes packages for review. "autopilot on" from Rellz is the only thing that sets it to true.
- **When live:** 4 posts a day, top quality, at 10:00, 14:00, 18:00 and 22:00 London time, the same as the other two channels (Rellz, 2026-11-15: "both channels always upload at same time same amount of videos a day"). Never raise the count. A manual run always posts.
- **Family rules:** smooth animations and UI (nothing teleports; banners, bars, pills and names glide or fade); one notice at a time; characters always upright, never sideways; titles and thumbnails true and never giving the result away; no real people, nations, flags or insignia; original music only; no preview videos to Rellz, stills instead.
- **Drawing never changes a battle:** `tc-sim.js` runs in fixed 1/120 s ticks with its own dice per system; `tc-draw.js` reads it and uses hashes. Keep old seeds playing the same when a new option is off.
- **For every idea Rellz asks for, add four more of your own** in the same spirit, and improve the details around it (Rellz, 2026-11-10).
- **Test before pushing:** `node --check` every changed file; `node balance.js 100` after gameplay changes (no crashes; every kingdom within about ×0.75–×1.3 of a fair share); `node package.js <date>` and look at the thumbnails and stills after looks changes.
- After every change Rellz asks for once the channel is live, start the workflow by hand, check it uploads, and give him the link. Log changes in CHANGELOG.md. The daily run follows AUTOPILOT.md.
