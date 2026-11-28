# rules.json

| Dial | What it does |
| --- | --- |
| `launched` | false: plan and package only, nothing is uploaded. true (only on Rellz's "autopilot on"): the workflow renders and posts. |
| `schedule` | Upload slots, London time: 10, 14, 18, 22 (the same as Army Clash and Tower Clash), up to 110 minutes late. |
| `video` | 4K (`scale` 2), 60 s of battle, 4.6 s before it (face-off 2.6 s + the map wakes 2.0 s), 3 s after; `pace` 1. |
| `quality` | How many seeds each Short auditions, and the tempos each is tried at; the most dramatic is kept. |
| `modes` | How often each format comes up (weights). No mode twice in a day except Crown War. |
| `launchDay` | The four formats of the very first day. |
| `minColourGap` | How far apart any two kingdoms' colours must be in one battle (Army Clash's value). |
| `events`, `eventChance` | Which world events can happen, and how often a battle gets one. |
| `music` | `music.js` styles in turn (`epic`, `ancient`), volume and ducking, as in Tower Clash. |
| `sound.sfx` | Battle sounds under the music. |
| `thumbnail`, `intro`, `wake` | The thumbnail, the face-off and the map-wakes / MARCH! opening. |
| `ui.noStack`, `ui.noticeSeconds` | One notice at a time; how long each stays. |

## `picks` (Rellz's 26 picks, 2026-11-17, the same dial names in all three games)

`on` turns them all on or off (off: every old seed plays exactly as before; `PICKS=0` turns them off for one render). One dial per idea, each `true`/`false` unless a number:
- Troops: `golem` (`golemSplit`: health share that splits it, 0.4), `bard`, `plague` (`cloudR`, `cloudSecs` 5, `cloudDps`), `mimic` (`mimicBite` 3), `traitor` (`traitorAt` 0.5), `rats` (8 to a nest), `ram`, `troops` (Army: new troops in invented match-ups).
- Spells: `spells` (the six new ones), `chainJumps` 4, `chainDmg`, `novaR`, `novaSecs` 3, `rainR`, `rainSecs` 6, `rainHeal`, `smokeR`, `smokeSecs` 6, `smokeMiss` 2 (every 2nd shot), `wallLen`, `wallSecs` 6, `vampShare` 0.25, `vampSecs` 8.
- Modes: `modes` (weights added to the mode rotation: tug, siege, boss, hill), `hillScore`, `hillTarget` 25 s, `winFrom` 9 (a mode's win only comes in the last 9 s, so battles keep their length), `wallHp`, `bossHp`, `bossDmg`, `bossArmy`, `lastStand`.
- Looks: `weather`, `weatherChance` 0.4, `dusk`, `duskChance` 0.3, `replay`, `replaySecs` 0.8, `mvp`.
- Sound: `commentator`, `maxCalls` 8, `callGap` 6 s, `voice` 0.62, `crowd`, `crowdBed` 0.075, `mapMusic`.
New looks dice: Army and Tower weather `seed ^ 0x5EA7E2` (dusk with it), particles `^ 0x5EA7E3`, `^ 0x5EA7E4`; commentator lines `^ 0xC0AA7E`; Tower troops in waves `^ 0x91C4A5`; Territory picks `^ 0x91C4A6` (Territory's weather and dusk use hashes of the seed).

## `fun` (2026-11-28): the fun layer
`fun.js`, the same in all three games, looks and sound only: comic captions with cartoon stings (`sfx/fun/`, made by `sfx/make_fun.py`) on big moments, reaction faces up the left edge, a hidden golden duck (one in ten a rainbow duck) with a soft quack, and context prompts (find the duck, like if you're stressed, still sure about your pick, last chance to lock in your pick). `on` (false = none of it), `maxCaps` (captions a video, 4), `capGap` (seconds between captions, 7).
