// Territory Clash: all the tables. Kingdoms, rivalries, modes, holds, world events, map themes and title formats.
// Everything here is invented for the channel: no real nations, flags, houses or insignia.
'use strict';

// ----- the twelve kingdoms of Vael -----
// colour: a key of the engine's PALETTES (shared with Army Clash and Tower Clash), fixed per kingdom so viewers learn them.
// (chosen so that 105 four-kingdom line-ups keep every pair of colours at least 30 apart, Army Clash's minColourGap, and
// every rivalry's two colours are clearly apart)
// emblem: a drawEmblem() kind from engine.js (the same heraldry as Army Clash's tribes). champion: an upright HUMAN troop
// from the shared cast (face-off rings and thumbnails); line: the troop that marches along the orders.
// AI (all small, balanced by `node balance.js`): speed (march), def (defence of its holds), grow (troop growth),
// send (share of a hold's troops sent per order), margin (how sure it wants to be before attacking: lower = bolder),
// neutral (taste for unclaimed land), cadence (seconds between decisions), plus one signature trait each.
const KINGDOMS = {
  emberhold: { icon: '🔥', name: 'EMBERHOLD', colour: 'CRIMSON', emblem: 'flame', champion: 'pyro', line: 'swordsman', capital: 'CINDERKEEP',
    motto: 'BURN BRIGHT, BURN FIRST', speed: 1.15, def: 1.05, grow: 1, send: 0.78, margin: 3, neutral: 1, cadence: 0.9, trait: 'blitz',
    traitText: 'Forge March: its troops march 15% faster, and it sends almost everything' },
  frostmere: { icon: '❄️', name: 'FROSTMERE', colour: 'WHITE', emblem: 'crane', champion: 'frostwitch', line: 'spearman', capital: 'RIMEGATE',
    motto: 'THE COLD WAITS', speed: 0.95, def: 1.22, grow: 1, send: 0.62, margin: 7, neutral: 0.9, cadence: 1.25, trait: 'hoarfrost',
    traitText: 'Hoarfrost Walls: every Frostmere hold defends 22% harder' },
  verdance: { icon: '🌳', name: 'VERDANCE', colour: 'GREEN', emblem: 'oak', champion: 'druid', line: 'archer', capital: 'THORNWOOD',
    motto: 'ROOT, THEN REACH', speed: 1, def: 1, grow: 1.11, send: 0.7, margin: 4, neutral: 1.6, cadence: 1.05, trait: 'rootgrowth',
    traitText: 'Rootgrowth: its villages and farms grow troops 14% faster' },
  gilded: { icon: '💰', name: 'THE GILDED THRONE', short: 'GILDED THRONE', colour: 'AMBER', emblem: 'star', champion: 'royalguard', line: 'pikeman', capital: 'AURUM',
    motto: 'EVERY SWORD HAS A PRICE', speed: 1, def: 1.0, grow: 0.96, send: 0.68, margin: 5, neutral: 1.1, cadence: 1.1, trait: 'mercs',
    traitText: 'Hired Swords: every 10 seconds, 5 mercenaries join its capital' },
  duskveil: { icon: '🌙', name: 'DUSKVEIL', colour: 'INDIGO', emblem: 'moon', champion: 'assassin', line: 'ninja', capital: 'GLOAMSPIRE',
    motto: 'SMILE, THEN STRIKE', speed: 1.05, def: 1, grow: 1, send: 0.72, margin: 4, neutral: 0.9, cadence: 1, trait: 'opportunist',
    traitText: 'Knife in the Dark: it hunts kingdoms busy fighting someone else, and it never keeps a pact' },
  tidecrown: { icon: '⚓', name: 'TIDECROWN', colour: 'TEAL', emblem: 'anchor', champion: 'musketeer', line: 'pirate', capital: 'SALTREACH',
    motto: 'THE SEA REMEMBERS', speed: 1, def: 1, grow: 1, send: 0.7, margin: 4, neutral: 1.1, cadence: 1.05, trait: 'sealanes',
    traitText: 'Sea Lanes: its orders can leap one territory along the coast by boat' },
  ironreach: { icon: '🛡️', name: 'IRONREACH', colour: 'NAVY', emblem: 'tower', champion: 'knight', line: 'shieldbearer', capital: 'BULWARK',
    motto: 'NOTHING GETS PAST THE WALL', speed: 0.9, def: 1.1, grow: 1, send: 0.6, margin: 6, neutral: 1, cadence: 1.2, trait: 'bastion',
    traitText: 'Bastion: its forts hold 30% more troops and defend harder' },
  sunspire: { icon: '☀️', name: 'SUNSPIRE', colour: 'ORANGE', emblem: 'gear', champion: 'paladin', line: 'knight', capital: 'SOLACE',
    motto: 'DAWN COMES FOR EVERYONE', speed: 1, def: 1, grow: 0.96, send: 0.7, margin: 4, neutral: 1, cadence: 1.05, trait: 'dawn',
    traitText: 'Dawn Surge: every 15 seconds, every Sunspire hold gains 2 troops' },
  bramblemoor: { icon: '🐗', name: 'BRAMBLEMOOR', colour: 'BROWN', emblem: 'boar', champion: 'berserker', line: 'orc', capital: 'MIREHOLLOW',
    motto: 'TAKE IT AND RUN', speed: 1.1, def: 1.04, grow: 1, send: 0.75, margin: 3, neutral: 0.8, cadence: 0.95, trait: 'raider',
    traitText: 'Raiders: it always goes for the weakest hold it can reach' },
  stormhowl: { icon: '🐺', name: 'STORMHOWL', colour: 'BLUE', emblem: 'wolf', champion: 'stormcaller', line: 'spearman', capital: 'HOWLMARCH',
    motto: 'THE PACK NEVER SLEEPS', speed: 1.2, def: 1.0, grow: 1, send: 0.6, margin: 3, neutral: 1, cadence: 0.8, trait: 'pack',
    traitText: 'The Pack: small, fast raids, more often than anyone' },
  rosegarde: { icon: '🌹', name: 'ROSEGARDE', colour: 'ROSE', emblem: 'stag', champion: 'duelist', line: 'duelist', capital: 'ROSEFORD',
    motto: 'HONOUR BEFORE LAND', speed: 1, def: 1.08, grow: 1.02, send: 0.68, margin: 4.5, neutral: 1.1, cadence: 1.05, trait: 'honour',
    traitText: 'Honour: it never attacks a kingdom down to its last territory' },
  hollow: { icon: '💀', name: 'THE HOLLOW CROWN', short: 'HOLLOW CROWN', colour: 'LIME', emblem: 'skull', champion: 'lich', line: 'skeleton', capital: 'THE BARROW THRONE',
    motto: 'WE WERE KINGS ONCE', speed: 1, def: 1, grow: 1, send: 0.7, margin: 3.5, neutral: 1.2, cadence: 1, trait: 'grave',
    traitText: 'Grave Tithe: when any hold falls, the Hollow Crown\'s capital gains 1 troop' },
};
const KINGDOM_KEYS = Object.keys(KINGDOMS);

// ----- rivalries (the feuds the lore and the titles lean on) -----
const RIVALS = [
  { a: 'emberhold', b: 'frostmere', name: 'THE ETERNAL THAW', line: 'Fire against ice, since the Crown shattered' },
  { a: 'duskveil', b: 'rosegarde', name: 'THE BROKEN OATH', line: 'Duskveil swore to Rosegarde once. Once' },
  { a: 'verdance', b: 'bramblemoor', name: 'THE THORN FEUD', line: 'Bramblemoor keeps burning the forest Verdance keeps growing back' },
  { a: 'tidecrown', b: 'sunspire', name: 'THE SALT AND SUN WAR', line: 'The sea against the plateau, over the same coast' },
  { a: 'gilded', b: 'stormhowl', name: 'THE UNPAID DEBT', line: 'The wolves fought for the Gilded Throne. The Throne never paid' },
  { a: 'ironreach', b: 'hollow', name: 'THE LAST WALL', line: 'Ironreach built its wall to keep the dead out' },
];
const rivalOf = k => { const r = RIVALS.find(x => x.a === k || x.b === k); return r ? (r.a === k ? r.b : r.a) : null; };

// ----- holds (what stands in each territory) -----
// grow: troops per second at tempo 1; cap: most troops it can hold; def: defence; garrison: neutral starting troops [min, max]
const HOLDS = {
  capital: { name: 'CAPITAL', grow: 1.6, cap: 99, def: 1.3, value: 3, garrison: [20, 20] },
  fort: { name: 'FORT', grow: 0.55, cap: 60, def: 1.45, value: 1.5, garrison: [14, 20] },
  farm: { name: 'FARM', grow: 1.25, cap: 45, def: 0.9, value: 1.35, garrison: [5, 9] },
  village: { name: 'VILLAGE', grow: 0.8, cap: 50, def: 1, value: 1, garrison: [6, 12] },
  mine: { name: 'GOLD MINE', grow: 0.7, cap: 50, def: 1, value: 1.4, garrison: [10, 14] },
  crown: { name: 'THE GREAT CROWN', grow: 1.2, cap: 99, def: 1.2, value: 4, garrison: [34, 40] },
  // (rules.warfare) a mountain pass: the crossroads in the hills, very hard to take
  pass: { name: 'MOUNTAIN PASS', grow: 0.5, cap: 45, def: 2.0, value: 2.0, garrison: [14, 18] },
};

// ----- modes (series formats) -----
// k: kingdoms in the battle; cells: territories on the map; hook: the question on the face-off and the thumbnail
const MODES = {
  war: { name: 'Crown War', k: 4, cells: [22, 26], hook: 'WHO RULES THE MAP?', start: 2,
    line: 'Four kingdoms, one island: the kingdom with the most land at the bell wins, unless one takes it all first.' },
  three: { name: 'Three Crowns', k: 3, cells: [19, 23], hook: 'THREE KINGDOMS. ONE ISLAND.', start: 2,
    line: 'Three kingdoms, one island: the most land at the bell wins.' },
  feud: { name: 'Blood Feud', k: 2, cells: [16, 19], hook: 'WHO TAKES THE LAND?', start: 2, rivals: true,
    line: 'Two sworn rivals, one island, sixty seconds.' },
  pact: { name: 'The Pact', k: 4, cells: [22, 25], hook: 'CAN THE PACT HOLD?', start: 2, pact: true,
    line: 'Two kingdoms swear a pact against the other two. Pacts on Vael have a habit of breaking.' },
  ember: { name: 'Last Ember', k: 4, cells: [20, 24], hook: 'CAN THE SMALLEST KINGDOM SURVIVE?', start: 3, underdog: true,
    line: 'One kingdom starts with nothing but its capital; the other three start with three territories each.' },
  crown: { name: 'Crown Rush', k: 3, cells: [20, 24], hook: 'WHO TAKES THE GREAT CROWN?', start: 2, crown: true,
    line: 'The Great Crown sits in the middle of the island. Whoever holds it at the bell counts it as five territories.' },
};

// ----- world events (their own dice; always hit every kingdom alike) -----
const EVENTS = {
  revolt: { name: 'PEASANT REVOLT', line: 'one border village of every kingdom rises up and goes free' },
  storm: { name: 'STORM FRONT', line: 'every army on the roads marches at half speed for 6 seconds' },
  harvest: { name: 'GOLDEN HARVEST', line: 'every hold grows troops twice as fast for 5 seconds' },
  fog: { name: 'SEA FOG', line: 'nobody can see far: for 6 seconds every kingdom attacks only its weakest neighbour' },
  rain: { name: 'HEAVY RAIN', line: 'the fords flood: armies wade across them at a crawl, and boats can founder' },
};

// ----- map themes (looks only) -----
const THEMES = {
  ashen: { name: 'THE ASHEN COAST', ground: ['#8C7A5B', '#7C6A4E'], sea: ['#0E3B55', '#06192A'], prop: 'rock' },
  frostwild: { name: 'THE FROSTWILD', ground: ['#C9D6E2', '#AEBFCF'], sea: ['#123A5C', '#081A2E'], prop: 'pine' },
  thornvale: { name: 'THORNVALE', ground: ['#6F9A4B', '#5E8640'], sea: ['#0F4660', '#071E2E'], prop: 'tree' },
  goldmarch: { name: 'THE GOLDMARCH', ground: ['#C8AE62', '#B79B50'], sea: ['#0D4B5E', '#06212B'], prop: 'wheat' },
  duskfen: { name: 'DUSKFEN', ground: ['#5E6B4C', '#4F5B3F'], sea: ['#1C2A44', '#0A1222'], prop: 'reed' },
  saltreach: { name: 'THE SALTREACH ISLES', ground: ['#D6C38E', '#C5B07A'], sea: ['#0B5A73', '#05283A'], prop: 'palm' },
};
const THEME_KEYS = Object.keys(THEMES);

// ----- place names (made up, built from the seed) -----
const NAME_A = ['ASH', 'BRAM', 'CRAG', 'DUN', 'ELM', 'FEN', 'GLEN', 'HAR', 'IVY', 'KEL', 'LOCH', 'MOR', 'NETH', 'OAK', 'PEL', 'RAVEN', 'SALT', 'THORN', 'UL', 'VEL', 'WEST', 'WYRM', 'YARROW', 'COLD', 'STONE', 'BRIGHT', 'HOLLOW', 'MARSH', 'SPIRE', 'GOLD'];
const NAME_B = ['FORD', 'WICK', 'MERE', 'HOLM', 'REACH', 'BURY', 'GATE', 'MOOR', 'STEAD', 'HAVEN', 'WATCH', 'FELL', 'DALE', 'CROSS', 'HOLD', 'TON', 'BROOK', 'RIDGE', 'MOUTH', 'REST'];

module.exports = { KINGDOMS, KINGDOM_KEYS, RIVALS, rivalOf, HOLDS, MODES, EVENTS, THEMES, THEME_KEYS, NAME_A, NAME_B };
