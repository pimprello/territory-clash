# Territory Clash: the bible

The third channel in the Clash family (Army Clash, Tower Clash, Territory Clash). Same look, same pace, same rules; a new game: **drag-to-capture territory wars between kingdoms**, with no single lead character. Everything below marked 🆕 is new to the family (invented for this channel); everything else is reused from Army Clash or Tower Clash.

## The world 🆕

**Vael**, an island continent. Long ago one crown ruled it; it shattered into twelve shards, and every shard became a kingdom. Every Short is one battle in **the War of Shards** (season 1). The kingdoms keep their names, colours, crests, champions and grudges from video to video, so viewers can pick a side and follow it.

## How a battle plays 🆕

- The island is cut into 16–26 territories. Each holds a **hold** (capital, fort, farm, village, gold mine, or the Great Crown) with a troop count that grows every second.
- A kingdom's order is a **drag**: a glowing stroke in its colour that draws itself from one of its holds to a neighbour, with a bright dot riding the tip like a finger on glass. Its troops then march along the stroke in a stream (little upright people from the shared cast, or boats on a sea lane).
- Arriving troops fight the hold one for one (times its defence). Take it and it flips to your colour with a white flash.
- Two enemy streams on the same road meet head-on and cancel out: a **mid-road clash**.
- **Last Orders** 🆕: in the final 10 seconds every kingdom goes all in.
- **The Bell** 🆕: at 60 s the kingdom with the most territories wins (level on land: most troops). A kingdom that takes everything wins early.
- Close by design: each Short is the most dramatic of 5 auditioned battles, each tried at 6 tempos (late lead changes, fallen capitals, a one-territory margin).

## The twelve kingdoms 🆕

Colours are fixed per kingdom and chosen so 105 four-kingdom line-ups keep every pair of colours at least 30 apart (Army Clash's `minColourGap`). Crests use Army Clash's tribe emblems; champions and marching troops are from the shared cast and always stand upright.

| Kingdom | Colour | Crest | Champion | Marches as | Capital | Motto | Signature |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 🔥 Emberhold | crimson | flame | pyro | swordsman | Cinderkeep | Burn bright, burn first | Forge March: 15% faster marches, sends almost everything |
| ❄️ Frostmere | white | crane | frost witch | spearman | Rimegate | The cold waits | Hoarfrost Walls: its holds defend 22% harder |
| 🌳 Verdance | green | oak | druid | archer | Thornwood | Root, then reach | Rootgrowth: villages and farms grow 14% faster |
| 💰 The Gilded Throne | amber | star | royal guard | pikeman | Aurum | Every sword has a price | Hired Swords: +5 mercenaries at its capital every 10 s |
| 🌙 Duskveil | indigo | moon | assassin | ninja | Gloamspire | Smile, then strike | Knife in the Dark: hunts kingdoms busy elsewhere; never keeps a pact |
| ⚓ Tidecrown | teal | anchor | musketeer | pirate | Saltreach | The sea remembers | Sea Lanes: can leap one territory along the coast by boat |
| 🛡️ Ironreach | navy | tower | knight | shieldbearer | Bulwark | Nothing gets past the wall | Bastion: forts hold 30% more and defend harder |
| ☀️ Sunspire | orange | sun | paladin | knight | Solace | Dawn comes for everyone | Dawn Surge: every hold +2 every 15 s |
| 🐗 Bramblemoor | brown | boar | berserker | orc | Mirehollow | Take it and run | Raiders: always goes for the weakest hold in reach |
| 🐺 Stormhowl | blue | wolf | storm caller | spearman | Howlmarch | The pack never sleeps | The Pack: small, fast, frequent raids |
| 🌹 Rosegarde | rose | stag | duelist | duelist | Roseford | Honour before land | Honour: never attacks a kingdom down to its last territory |
| 💀 The Hollow Crown | lime | skull | lich | skeleton | The Barrow Throne | We were kings once | Grave Tithe: +1 at its capital whenever any hold falls |

Win rates in 900 headless battles (150 per mode) sit between ×0.82 and ×1.10 of a fair share after balancing (`node balance.js 150`); Bramblemoor and Stormhowl were buffed a little, Gilded Throne, Sunspire, Ironreach and Emberhold tuned down or steadied.

## Rivalries 🆕

| Feud | Kingdoms | The grudge |
| --- | --- | --- |
| The Eternal Thaw | Emberhold vs Frostmere | Fire against ice, since the Crown shattered |
| The Broken Oath | Duskveil vs Rosegarde | Duskveil swore to Rosegarde once. Once |
| The Thorn Feud | Verdance vs Bramblemoor | Bramblemoor keeps burning the forest Verdance keeps growing back |
| The Salt and Sun War | Tidecrown vs Sunspire | The sea against the plateau, over the same coast |
| The Unpaid Debt | Gilded Throne vs Stormhowl | The wolves fought for the Throne. The Throne never paid |
| The Last Wall | Ironreach vs Hollow Crown | Ironreach built its wall to keep the dead out |

## Series formats (modes) 🆕

| Mode | Kingdoms | Hook | Share |
| --- | --- | --- | --- |
| Crown War | 4 | WHO RULES THE MAP? | 4 |
| Three Crowns | 3 | THREE KINGDOMS. ONE ISLAND. | 2 |
| Blood Feud | 2 sworn rivals | WHO TAKES THE LAND? | 2 |
| The Pact | 4; the two smallest swear a pact at ~10 s (Duskveil always breaks it; others 40%) | CAN THE PACT HOLD? | 1 |
| Last Ember | 4; one starts with only its capital (the dice pick 50/50 whether it should survive; the audition makes it close) | CAN THE SMALLEST KINGDOM SURVIVE? | 1 |
| Crown Rush | 3; the Great Crown in the middle counts as 5 territories at the bell | WHO TAKES THE GREAT CROWN? | 1 |

Launch day runs Crown War, Blood Feud, The Pact and Last Ember, and between them shows all twelve kingdoms.

## World events 🆕 (own dice; always hit every kingdom alike)

Peasant Revolt (one border village of every kingdom goes free), Storm Front (all marches at half speed for 6 s), Golden Harvest (double growth for 5 s), Sea Fog (for 6 s everyone attacks only its weakest neighbour). About 70% of battles get one.

## Running jokes and visual gags 🆕 (shown only when they really happen)

- **Frostmere always moves last.** When its first order is the last of all the kingdoms', the notice says FROSTMERE FINALLY MOVES.
- **Duskveil never keeps a pact.** In The Pact, a Duskveil in the pact always breaks it: BETRAYAL! with a dagger slash across the pact chain.
- **The Gilded Throne's coins.** Gold coins pop over Aurum with +5 HIRED SWORDS.
- **Rosegarde spares the fallen.** Its armies stop at the border of a kingdom down to one territory (ROSEGARDE SPARES THEM, planned as a notice).
- **Sheep scatter** in neutral villages when an army marches through (looks only, planned).
- **The ink-wash loop.** The last half second washes the borders back to the opening map, so the replay starts where it began.

## Looks: the family rules, kept

Flat cartoon with black outlines; Barlow Condensed ExtraBold Italic; Army Clash's shine and cast; upright characters (never sideways); UI that glides and fades, never jumps; one notice at a time (a notice that would overlap waits its turn); the Shorts-safe layout (scoreboard in y 60–310, notice at y 350, the island in y 420–1500, nothing important under YouTube's title and buttons); the electric face-off for two sides; thumbnails laid out like Tower Clash's, everything inside y 200–1720, never showing the result; titles true and spoiler-free; original music from `music.js`; 4K at 60 fps; 4 posts a day at 10:00, 14:00, 18:00 and 22:00 London time.

New looks 🆕: the **crown-split face-off** for 3–4 kingdoms (the screen in wedges round the middle, each champion in a ring on its colour, lightning down every seam, WAR in the middle); the **land bar** (every kingdom's share of the island as one bar, unclaimed land grey in the middle); kingdom crests (heater shields with the tribe emblems); drag strokes; holds drawn as small castles, towers, farms, mines and the Great Crown; the bevelled territory map with thick ink borders between owners; six map looks (Ashen Coast, Frostwild, Thornvale, Goldmarch, Duskfen, Saltreach Isles), each skipped when its bare land would look like a kingdom in that battle.

## Risk flags

- **"Clash" is a registered trademark of Supercell** (US reg. 5658581, computer games and entertainment, live). This already applies to Army Clash and Tower Clash; a third "Clash" channel widens it. No Supercell names, art, characters or UI are used anywhere. If YouTube or Supercell ever objects, the family could rename together (for example "… Wars").
- **A web game called "Tower Clash"** (Hong Kong Skyreach Interactive, Playgama, released November 2026) is itself a route-capture territory game. It doesn't affect Territory Clash's name, but it's close to the existing Tower Clash channel and to this game's idea.
- **The drag-to-send genre** (State.io, Galcon, Mushroom Wars, Territorial.io and others) is a game mechanic, not anyone's property, but don't copy any of those games' names, icons, maps or UI, and keep "io games" as a plain search tag, never a claim.
- **No real places, nations or flags.** Unlike Army Clash's nation battles, Territory Clash never uses real countries: a conquest game over real borders reads as politics. All kingdoms, capitals and place names are invented.
