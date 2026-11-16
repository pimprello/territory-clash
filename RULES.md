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
