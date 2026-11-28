# Changelog

## 2026-11-28: Human narrator voices, richer colour, no overlapping banners

- **New voice** (Rellz: "use a better voice not the robot voice ... like the one in circuit academy ... then add your own effects"): the royal herald (calls and the war cries) is now made with Kokoro, the open neural voice family Circuit Academy uses (Piper before), from a blend of two Kokoro voices with this channel's own effects (`sfx/make_kokoro.py`, the same script in all three games: army = deep blended general with chest, grit and a field slap; tower = airy witch with a ghostly double and echo; territory = warm herald with stone-hall echoes). Same files, same mix rules (rare, blended, hall reverb).
- **More saturated** (Rellz: "make it more saturated"): a colour grade on the way out of every video (`rules.video.grade`, default saturation 1.4, contrast 1.06, gamma 0.97; ffmpeg `eq`), the same in all three games. Looks only.
- **No overlapping banners**: a new banner waits until the old one has lifted away (0.3 s) instead of popping in on top of it ("SUPPLY DROP!" over "PINK CHALLENGES ... TO THE DUEL!").

## 2026-11-28: The clock (no more missed posts)

- From 27 Nov GitHub's own timer fired the posting workflows only twice in 28 hours (one of them five hours late), so the 17:00 slot on 27 Nov and today's 13:00 and 17:00 were missed on all three channels. New: a clock (`.github/workflows/clock.yml`, `clock.js`) that stays awake in a GitHub job and starts the posting workflow on the minute at 13:00, 17:00 and 21:00 London, then hands over to the next clock every ~5.5 hours. The posting run still checks its slot, so nothing can post twice; the old timer stays as a backup.

## 2026-11-26: every troop visible in the cold open (from Army Clash)

- `engine.js`: the troops' shine layer and the on-screen check took their size from the video's scale, but the cold open draws 1.5x sharper, so troops in the lower right were cut off. Both now size from the canvas they draw onto. Looks only.

## 2026-11-24: hazy rectangle fix (from Army Clash)

- `engine.js`: the rim light left a faint white film over see-through things, showing as a hazy box with hard edges; now only solid troops get a rim. Looks only.

## 2026-11-23: Manual runs no longer post extra videos

- (Rellz, Tower Clash chat: "tower clash accidentally uploads two, fix that, only upload one") manual runs (Run workflow) were posting a video every time they were started (three were started on 23 Nov, besides the scheduled ones). Now every run, manual or scheduled, posts only into an upload slot that is still empty, and checks again just before uploading; a manual run posts regardless only with the new "force" box ticked. Same in all three channels.

## 2026-11-23: Tower Clash profile picture: crown of thorns

- Rellz: the wizard's hat was too big and touched the white ring. Tower Clash's profile picture (`node brand.js tower`) now wears a golden crown of thorns instead of the tall wizard hat (`heroHead: 'thorncrown'`, a new head in `engine.js` used only for channel art; Rellz found the smaller wizard hat ugly); position and scale unchanged, Army and Territory Clash's pictures unchanged.

## 2026-11-23: 3 Shorts a day, same times on all three

- Rellz, 2026-11-23: "make all 3 channels post at the same time, it should be 3 times a day". Every channel posts at 13:00, 17:00 and 21:00 London time (`rules.schedule.hours`); the workflow wakes 12:00-14:59, 16:00-18:59 and 20:00-22:59 UTC (summer time covered). One extra post each was started by hand at 11:50 the same day, as he asked.

## 2026-11-23: Distinct, more clickable thumbnails; actions v5

- **Thumbnail: the royal war map** (Territory Clash's own look, 2026-11-23): an old parchment chart with the real island, sharp and in full colour, in a gilded frame (at the thumbnail moment, when nobody is clearly winning), a gold crown on the frame, each kingdom's champion on a wax seal at the map's corners with its name, the mode on a red ribbon, the question on top. It used to be a copy of Army Clash's layout. Nothing that matters below y 1500.
- War titles count the kingdoms ("4 Kingdoms...") from the actual line-up instead of always saying 4.
- GitHub Actions moved to v5 (`checkout`, `setup-node`, `upload-artifact`): the "Node.js 20 is deprecated" warning on every run is gone before GitHub turns Node 20 off.

## 2026-11-23: The yellow mode tag no longer covers the team names

- (Rellz: "the yellow text that says siege or whatever shouldn't cover the team names/colour", all three channels) in the face-off, the yellow tag (SIEGE, RARE GOLDEN BOSS...) sat at the top on top of the first side's name and colour line. With two sides it now sits in the empty corner of the top band, beside the top ring and above its count; with three it stays at the top where there was room. `faceoff.js`.

## 2026-11-23: as satisfying as Tower Clash

Rellz: "Tower Clash is getting more views than this, come up with ideas to fix this ... polished and satisfying to watch like Tower Clash, no issues with any overlay or intricate detail", then "remove black bars from intro".

- Action camera (`rules.actionCam`, zoom 1.2): after the opening the island fills the picture (bigger holds, soldiers and counts on a phone), drifting a little towards the hottest front, kept below the scoreboard and its notices; it opens wide for the last seconds before the cliffhanger. Looks only.
- Paint-flood captures: a taken territory's new colour floods out from the hold with a bright wave on its edge, and a burst of the new colour and gold pops from the hold.
- Counts pop: a small bounce as they grow, a bigger red-hot jolt when an attack knocks them down.
- Soldiers drawn 20% bigger (heroes 45%).
- A round capture pop that climbs a step for every quick capture in a row by the same kingdom (combo).
- Intro without bars: the cold open's rewind keeps its motion but drops the tape look (tracking bands rolling up the screen, the torn bottom edge, scanlines), which read as black bars.

## 2026-11-23: 2 Shorts a day

- Rellz, 2026-11-23: "make all upload 2 a day". Every channel now posts at 12:00 and 18:00 London time (`rules.schedule.hours` [12, 18]); the workflow also wakes from 10:00 to 13:59 UTC for the new slot (summer time covered). One extra post each was started by hand the same night, as he asked.

## 2026-11-23: Posting never fails or doubles

- Why Tower Clash's 22 Nov 18:00 run failed: YouTube refused the upload for "invalid video keywords" (a bad tag). Tags were already cleaned at 18:40 (all three games); a manual re-run posted the video, but the 18:59 scheduled run, queued behind it, had checked out the older commit, did not see that post and put up a second video for the same slot.
- Fixed in all three: the workflow checks out the latest `main`; a scheduled run checks again just before uploading and skips if the slot is already filled (`slot.js`, `SLOT_WINDOW`); a render that crashes is retried once with another battle; `upload.js` retries once with no tags and a plain title and description if YouTube still refuses the words; the step that records the upload runs only after one and can't fail on a missing folder (Territory Clash's 21 Nov failures: `thumbs` missing).

## 2026-11-23: One mix for all three channels; a rarer, softer narrator

- Measured the mix of one video from each game. Music as heard: Tower Clash -21.4 dB, Army Clash -22.6, Territory Clash -21.1. Narrator: Tower Clash -21.6 dB, Army Clash -13.4, Territory Clash -10.9 (it rode on the effects' level, so a quiet battle pushed it up), with 7 or 8 lines a video.
- Now all three: the music is set by how loud it is as heard (`music.levels.heard` -21.5, Tower Clash's level) and the narrator from the music (`levels.voice` -1, with a 3 dB dip in the music under it), so the balance is the same on every channel and in every video.
- The narrator is rare: at most 3 lines a video, at least 15 s apart (was 8, 6 s), keeping the biggest moments.
- Blended in: its own bus, faded in and out, rounded off (no rumble or hiss), sent into a hall reverb (wet 0.4) and landed on the beat (`rules.picks.blend`; Army Clash's general uses the same settings).
- `music.js` `mix()` and `commentary.js` are now the same code in all three games; with the new options off, the mix is unchanged (checked sample by sample).

## 2026-11-23: the sea keeps its colour

Rellz (screenshot): "fix the map water, it changes colour which shouldn't happen". Three causes: the dusk pick darkened and reddened the picture as the war went on, and its lamp glows were drawn at the island's old coordinates, so they floated over the sea as yellow blobs (dusk is now off: `rules.picks.dusk` false); rain and fog tinted only a band from y 330 to 1540, so the sea above and below it was a different colour (they now cover the whole frame); and the cinema's golden soft-light grade turned the sea olive (the vignette is now neutral dark and the light shafts a faint white).

## 2026-11-22 (evening): steadier marching, the thumbnail as the opening frame

Rellz: "they go too fast and sometimes they overshoot, the army should march straight towards the tower; also thumbnails stopped working".

- Pace (`rules.marchSpeed` 0.8): armies march at 80% of the old speed (balance.js 60: every kingdom ×0.76–×1.23), and the capital cinema no longer fast-forwards after its slow motion (the video is under a second longer instead).
- Straight to the hold: side-by-side ranks close into single file over the last stretch, every man keeps to the road's line, and each fades into the gate as he reaches the hold instead of walking on through the castle.
- Thumbnails: YouTube accepts the custom thumbnail ("Thumbnail set", re-set 3 times), but the Shorts shelf and feed show a frame of the video, and since the cold open that was a dark battle frame. The video now opens on the thumbnail itself for 0.25 s (`rules.thumbnail.leadSeconds`), then flashes into the cold open; the loop's crossfade lands on it too.

## 2026-11-22: uploads can't be refused over a tag any more

- Tower Clash's 18:00 post on 22 November was refused by YouTube ("invalid video keywords"): the tags added up to more than YouTube's 500 characters once it counts the quotes it puts round every tag with a space. `upload.js` (the same fix in all three games) now cleans the tags before uploading: no < > " , # or emoji, at most 30 characters each, no empties or repeats, under 450 characters in all counting those quotes; the title and description lose < and > too.

## 2026-11-22: Fits on every phone

- Checked every piece of text each game draws, frame by frame, against what phones and YouTube cover (top notch, bottom title and channel line, the like/comment column, side crop on tall 20:9 phones). Fixed: the face-off question (WHO WINS? / WILL THE BASE SURVIVE? / WHO RULES THE MAP?) and the bottom side's name sat under YouTube's title; the face-off is lifted (rings smaller and higher, question at y 1480) for 2, 3 and 4 sides.
- Territory Clash: the face-off no longer draws the TERRITORY CLASH logo and mode tag at the top (they collided with the top kingdom's name, and Army and Tower Clash dropped theirs on 2026-11-21 for the notch rule).

## 2026-11-22: No links in descriptions

- Removed the "Watch the last battle / Watch next" line and its YouTube link from every description (Rellz, 2026-11-22). Other videos are to be linked only through YouTube's related-video link (Shorts) and end screens (long-form, when they start); neither can be set through the upload API.

## 2026-11-22: Franchise consistency + invisible-overlay fix

- **Franchise subscribe CTA** (all 3 channels): every description now ends with "New battle every day on Army Clash · Tower Clash · Territory Clash — subscribe and hit the bell!" so viewers discover the other two channels.
- **Franchise tags**: added `clash game` and `clash universe` tags on every video and `#clashuniverse` to the hashtag line for cross-channel YouTube search.
- **Invisible-overlay fix** (`render.js`): added `ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'` after the main draw call in every game's render loop. Any `globalCompositeOperation` or `globalAlpha` leaked by an internal draw function is now reset before overlays paint — so roster cards, the cliffhanger pill and the subscribe CTA are always visible.

Newest first. Each entry says what changed and why, in plain words for Rellz.

## 2026-11-22 (later): the armies are the picture

Rellz: "remove the weird logo king thing that follows armies sometimes, it was better with less UI like that, I want the visual part to be the actual armies". Champions lose their portrait badge, glow and crown: one on the move is just a bigger soldier of its kind walking with the army (dust at its heels, fading out near a hold so it never sits on a castle or count); one resting in a hold isn't drawn. Spies lose the eye over the rival capital, and mercenaries the gold ring under each man. Drawing only.

## 2026-11-22: real bridges

Rellz: "fix the bridges in the map ... make it so the people have to use them instead of running across water". Every road over the river now crosses on a bridge centred where it meets the drawn (winding) river and long enough to reach both banks (it used to sit on the straight line, off the water). Bridges are broad and railed; fords (slower in the battle) are narrow rope footbridges; a fallen bridge that became a ford is patched into a footbridge; a cut road shows two stubs. Nobody wades. Drawing only.

## 2026-11-22 (Rellz, for all three games, asked in the Tower Clash chat): the cliffhanger ending

Rellz: "instead of fully ending and saying game over just end at the cliff hanger and say subscribe instead of game over or the end or whatever it says currently" (all three channels; long-form videos come later, once their format is worked out).

- New `cliffhanger.js` (the same file in Army Clash, Tower Clash and Territory Clash; `rules.cliffhanger`). A headless copy of the war finds when it ends; 2 s before the bell (1 s before a conquest) the picture freezes with a flash and a jolt, drains of colour and darkens while it slowly pushes in; WHO RULES?! slams in, SUBSCRIBE / TO SEE THE ENDING comes up under it, and a red SUBSCRIBE button pulses until a hand taps it and it turns into SUBSCRIBED with a ringing bell. 3.4 s, then the video ends; the sound fades out over the last 0.9 s. The bell, the result card, the replay and the end call are no longer reached in a Short.
- The war is still run to its end without drawing, so the records keep who won (for the long-form videos later). Titles were already result-free.
- Checked: a full stills run (froze at 58.1 s with 0:02 on the clock; the card reads WHO RULES?!).

## 2026-11-21 (later): nothing under the phone's camera

Rellz: "remove the title/time from the top ... covered by the iPhone notch ... remove anything in UI covered by the camera on top". Nothing is drawn in the top 190 px now: the scoreboard, clock and notices sit 130 px lower (HUD_DY), the island 30 px lower to make room, the face-off title and mode tag lower, the REPLAY tag below the scoreboard.

## 2026-11-21: cinema, royal voice, map music, a new island look

Rellz: remove episode names and make clickbait titles; a cinematic zoom when a base is attacked; no black bars, our own cinematic look; tighter marching, sometimes side by side; bigger troops over smaller and all layering fixed; a royal voice with echo and a fade that blends with the music (and fix it saying "em dash"); music that matches the map and sounds less robotic; a smaller map with better shapes; better UI and water; better arrows.

- **Fixed (urgent):** since 18 Nov every post failed to log (`git add ... thumbs` failed once thumbnails started working, so no thumbs/ folder existed), so each timer run posted again: 28 uploads, many duplicates. The workflow now makes the folder; the 28 are recorded in uploads.md and videos.jsonl.
- **Fixed:** a merge left two `module.exports` lines in tc-draw.js, so `drawSky` was missing and every render crashed.
- Titles: no kingdom or feud names; several hook wordings per kind (seed picks), new "The Lead Changed N Times" for wild wars.
- Cinema (`rules.cinema`): on one or two capital falls the camera glides in (1.6x), the light goes warm with shafts and dust, the blow lands in slow motion, then the war runs slightly fast while the camera pulls back (same length, same battle).
- No black bars anywhere: the wake gets a warm vignette, the replay a vignette, the cold open drops its bars, colour split and inverted frame for the same castle-window light.
- Voice: a royal herald (en_GB alan, slower, a little deeper, warm), a throne-room hall, two soft echoes and a long fade (sfx/make_royal.py); no more made-up roar words that the voice spelled out; calls reworded for a kingdom war; quieter so it sits in the music.
- Music: the medieval style follows the map (two per map, the seed picks); every note and drum hit is humanised (a few ms off the grid, a little louder or softer).
- Island: drawn at 90% with sea round it, a coast with bays and headlands, gently bowed borders; holds that change hands every few hundredths of a second no longer strobe.
- Sea: depth contours ringing the island, curled wave marks in drifting rows, glints.
- Marchers: single file held close to the road, some orders two or three abreast; every marcher on the island drawn in one sorted crowd (heroes and bigger troops on top), with shadows; arrows under the troops, arrowheads over them, holds and counts over everything.
- UI: one royal scoreboard panel (dark glass, gold rim, drifting sheen), a crown over the leader with a glow, a gold-rimmed clock, a gold-trimmed land bar, ribbon notices.

## 2026-11-17 (Rellz's request, all three games): Rellz's 26 picks (`rules.picks`)

Rellz picked 26 of my 30 ideas (1 to 23 and 25 to 27) and asked for them in Army Clash, Tower Clash and Territory Clash, with only game-specific details different. Everything sits behind `rules.picks` (one dial per idea, the same names in every game); with it off, old seeds play exactly as before (checked in all three). Battle logic runs on the battle clock with no dice or with its own dice; the looks have their own. Already-posted videos don't change: the 10:00 post on 17 November is the first with them, in every channel.

**Shared by all three** (identical files): `music.js` (map music themes), `commentary.js` and `sfx/call-*.wav`, `sfx/crowd-bed.wav`, `sfx/make_commentary.py` (the commentator and the crowd), `holiday.js`. Army's and Tower's `engine.js` are back in step (Tower's and Territory's are Army's plus the `api._` line, now also exporting `lumOf`, `PK_SET`, `PK_SPELLS`).

- **25 Commentator:** 21 short lines ("What a hit!", "Titan down!", "Traitor!", "The gate is down!", "What a finish!"...) in a Piper voice that is not the war cry's (en_GB-northern_english_male-medium), made punchy with a little stadium room. The battle raises cues (first kill, a streak, a titan down, a big hit, the last stand, a split, a traitor, a gate, a spell, the finish); `commentary.js` says at most 8 a video, at least 6 s apart, never during the face-off or the charge, picks the line with looks dice, and mixes it into the effects, so the music ducks under the voice. (Fixed while building: the first batch of lines came out 18 s long each; the script's piper call is fixed and they're 0.6 to 1.2 s.)
- **26 Crowd swell:** a murmuring crowd bed under the fight that swells +3 dB on a kill and +6 dB on a titan, a gate, a capital (attack 0.2 s, release 1.5 s). It's part of the effects, measured before the levels are matched, so the mix still lands on effects -14 dB, music -19 dB.
- **27 Map music themes:** the map picks the instruments (desert: hand drums and a plucked oud-like lead; snow: sleigh bells and glassy bells; forest: breathy flute and plucked strings; neon and city: synth lead and arpeggio; furnace and bombed: war drums), on top of the era's style. Tower's Pharaoh's Sands, Mushroom Grove and Blossom and Territory's six island themes have themes too. At Christmas the snow theme goes festive (more bells, a counter-melody). Loudness is unchanged (the levels set it).
- Test renders: Army -12.7 LUFS, Tower -13.9 LUFS, Territory -12.9 LUFS; all within about 1 LU of YouTube's -14.

**Four more ideas of my own for each pick** (rule 7; built ones marked ✓, the rest are in IDEAS.md for later):
1 Stone Golem: ✓ the halves keep half the health each and walk on; ✓ a heavy single hit also splits it; little golems that merge back if they meet; a golem that splits three ways when titan-sized.
2 Bard: ✓ every 9 s the song becomes a war cry (bigger, faster); ✓ notes drifting off; a bard duel when two meet; a lullaby that slows enemies.
3 Plague Doctor: ✓ the cloud is acid, so acid troops are fed by it; ✓ in Tower it chokes towers (fire a third slower); a cure that cleans a cloud; a plague that spreads hold to hold.
4 Mimic Chest: ✓ the lid snaps with teeth when it bites; ✓ in Tower and Army it fights on after the bite; a golden mimic that drops gold; a mimic that eats a spell.
5 Ghost Knight: ✓ translucent while it walks through; ✓ once a battle only; a ghost army event at midnight; ghosts that can't be hit by arrows while phasing.
6 Battering Ram: ✓ gathers speed on a long run (Army); ✓ breaks walls and gates and pounds the base harder; a ram crew that repairs it; a flaming ram for fire tribes.
7 Traitor: ✓ the colour fades from the old army's to the new one's; ✓ Territory: three defectors march off to the attacker; a double agent who switches back; a traitor who steals the enemy's gold.
8 Bomb Rats: ✓ a pack of eight from one nest; ✓ rats never take land (Territory); a rat king that leads them; cheese bait that pulls rats off course.
9 Lightning Chain: ✓ storm troops are fed by it; ✓ ties broken by troop number, no dice; chains that jump further in rain; a chain that jumps to a tower and back.
10 Frost Nova: ✓ never hurts ice troops; ✓ titans freeze for half as long; frozen troops shatter on a big hit; a frost trail behind the nova.
11 Healing Rain: ✓ it falls over the most hurt towers (Tower) and the weakest hold's area (Territory); ✓ rain drawn under the troops; a rainbow when it ends; rain that also douses fires.
12 Smoke Bomb: ✓ a shot counter decides the misses (no dice); ✓ Territory: enemies can't even see the holds inside it; smoke that hides a flank attack; fire turning smoke black.
13 Shield Wall: ✓ shields across the path in Tower stop shots at the towers; ✓ Territory: the hold blocks every other arriving troop; shields that crack and glow as they're hit; a shield wall that walks forward.
14 Vampire Bite: ✓ drain particles from the victim to the killer; ✓ Tower: the base drinks what the towers deal; a vampire bat swarm; a blood moon making it stronger.
15 King of the Hill: ✓ match point when the score is reached early (the battle still runs its length); ✓ a ring that fills as they hold it; a hill that moves halfway through; a crown for the holder.
16 Tug of War: ✓ the losing side pulls harder (Territory grows 15% faster); ✓ a knot riding the rope; a rope snap at the end; both armies' chants.
17 Siege: ✓ a gate in the middle of the wall; ✓ the gate falling is a big moment (banner, shake, commentator); ladders over the wall; boiling oil from the walls.
18 Boss Rush: ✓ the boss is picked by era (no dice); ✓ Territory: three kingdoms ally against a Titan Empire for 30 s; a boss rage phase at half health; a second boss in overtime.
19 Last Stand: ✓ the last troop heals a third and runs 20% faster; ✓ Tower: the base below a fifth enrages every tower; a last stand speech card; allies' ghosts fighting beside it.
20 Weather: ✓ snow always on snowy maps and at Christmas; ✓ no weather during a blackout; puddles after rain; lightning flashes in storms.
21 Dusk to night: ✓ torches, banners and fire troops glow as it gets dark; ✓ Territory's holds light lamps; stars coming out; a full moon rising.
22 Slow-motion replay: ✓ half speed with a slow push in, film bars and a pulsing REPLAY tag; ✓ no extra length (it plays over the start of the outro); replay from another angle; a freeze frame on the killing blow.
23 MVP card: ✓ Army: the troop itself in a ring of its colour; ✓ Tower: the best tower and its title; Territory: the hold that launched the most captures; an MVP streak across videos; the MVP's line in the description.
25 Commentator: ✓ never twice the same line in a video; ✓ reacts 0.15 s after the moment, like a person; a second commentator for banter; lines in Rellz's own voice later.
26 Crowd: ✓ a seamless loop; ✓ bigger swells for titans, gates and capitals; boos when a traitor turns; a hush in the last seconds.
27 Map music: ✓ festive at Christmas; ✓ Territory's island themes too; a theme per holiday; the map's theme in the outro fanfare.

**In Territory Clash** (new `tc-picks.js` mixed into `TCSim`; drawing in `tc-draw.js`; `render.js`, `pick.js`, `plan-day.js`):
- Every kingdom gets the same heroes: its capital's Stone Golem splits when attackers kill 40% of the capital's troops in 2 s (the halves march to its nearest holds, +4 each); its Bard sings every 9 s (its orders march 30% faster for 3 s, notes over the troops); a Plague Doctor leads an attack on a big hold (it stops growing, its own orders crawl); one neutral village is a Mimic chest that bites the first six arrivals; a Ghost Knight takes its first head-on clash straight through; a Battering Ram leads attacks of 16+ on forts and capitals (and breaks walls); three Traitors defect from a big hold falling below half; once a battle, eight Bomb Rats (each kills two defenders, never takes land). The hero leads its order (drawn at the front; golem halves and rats are the whole order).
- Spells: each kingdom casts twice (24 s and 42 s) the one it wants most, no dice: Lightning Chain, Frost Nova, Healing Rain, Smoke Bomb (enemies can't see its holds), Shield Wall, Vampire Bite.
- New formats in the rotation (`rules.picks.modes`): King of the Hill (hold the middle 25 s in all and win at the bell), Tug of War (a knot on the land bar; the side behind grows 15% faster), The Siege (one kingdom walled, the other one hold bigger; rams break walls), Boss Rush (a Titan Empire against three allied kingdoms for 30 s). With titles, descriptions and notices. Last Stand: a kingdom down to its last hold defends and grows 50% harder.
- Looks: weather (the Frostwild and Christmas always snow) and dusk with lamps lighting in the holds, the replay over the start of the result, and an MVP pill on the result (the winner's hold that launched the most captures). Sound: Territory now also has `music.levels` (effects -14, music -19), the commentator and the crowd.
- Holidays (`holiday.js`, now in Territory too): the holiday in the title, description and tags, and a fitting island look (Christmas: the Frostwild).
- Checked: picks off = the pushed version (`balance.js`); with picks on, `node balance.js 100` over all ten formats: no crashes, every kingdom between x0.83 and x1.14 of a fair share; Siege's walled kingdom wins 42%, the Titan Empire 46% (tuned from 15% and 75%). The golem first split in every battle because orders leaving a capital counted as losses; only troops killed by attackers count now.
- `CLAUDE.md`: the "start the workflow by hand after every change" rule is replaced by Rellz's 2026-11-16 rule (no test uploads; the next scheduled post shows the change), as in the other two.

## 2026-11-17: the family look, medieval sound

Rellz asked for an electric intro like the other two games, a march like Army Clash's charge, medieval music with variety, clearer voices, arrows that don't touch the numbers, water, unique medieval sounds, a polished thumbnail like Army/Tower Clash, and polish everywhere.

- Intro: the electric face-off (faceoff.js, Army Clash's newer copy with taunting champions) for every line-up; this copy also draws four kingdoms (three seams).
- The march: Army Clash's charge move for move (film bars, READY…, camera push, flash, shockwave, speed lines, colour slashes, the word trembling then rushing at the camera). The cry varies (MARCH! / TO ARMS! / FOR THE CROWN!) and the voice says the same word: new clearer takes in sfx/march-N.wav (sfx/make_march.py: less distortion, more presence, a shorter hall).
- Music: four medieval styles (crusade, tavern, court, highland) with drones, frame drums, lute and horn/recorder/fiddle/chanter; the style turns with the slot and day. Levels match the other games (music.levels).
- Sounds: Territory Clash's own medieval set (tc-sfx.js): horn calls, sword clashes, bells, drum rolls, a herald for lead changes, a horn chord for a conquest.
- Arrows start and end clear of the holds and counts, draw out with a bright tip, and chevrons flow along them.
- The sea: deep water with drifting light, wave crests, glints, turquoise shallows and breathing foam.
- Thumbnail: Army Clash's layout (blurred battle, slanted kingdom bands split by gold bolts, logo, mode ribbon, champions on glowing badges, VS, name plates, the question in gold), all inside the Shorts shelf crop.

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
