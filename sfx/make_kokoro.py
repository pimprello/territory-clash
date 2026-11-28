# The Clash narrators, made with Kokoro (2026-11-28, Rellz: "use a better voice not the robot voice ... like the one in circuit
# academy ... not that specific voice but those types of voices then add your own effects"). Kokoro is an open neural voice
# (the same family Circuit Academy uses); each channel gets its own blend of two Kokoro voices, its own delivery and its own
# effects, so the three sound related (human, warm) but each is a character:
#   army       the royal announcer (Rellz 2026-11-28: "make army clash voice sound like royal announcer"): two deep British
#              voices blended, slow and grand, a touch lower, every line a proclamation
#   tower      the fortune-teller witch: a clear and a breathy female voice blended, an airy shimmer, a ghostly double voice
#              a hair behind her and a soft echo
#   territory  the royal herald: two British storytellers blended, warm and steady
# Every voice now goes through Tower Clash's effects (Rellz 2026-11-28: "make all voices have same effect as tower clash voice
# ... keep tower voice the same ... keep territory clash the same add effects to all of them like tower clash"): the air on
# top, the ghostly double a hair behind, the gentle squeeze and the two soft echoes; only the pitch is each voice's own.
# The long hall reverb that blends every voice into the music is added at mix time (commentary.js `wet`), so these stay fairly dry.
# Run once by hand:  python3 sfx/make_kokoro.py <army|tower|territory> <folder with kokoro-v1.0.onnx and voices-v1.0.bin> [--missing]
# (--missing makes only the lines that have no file yet, so new quips can be added without touching the old ones)
# (both from https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0; pip install kokoro-onnx soundfile scipy)
# Writes the same files the videos already read, so nothing else changes.
import os, sys, numpy as np, scipy.io.wavfile as wf, scipy.signal as ss

SR = 48000
GAME = sys.argv[1]
MODEL = sys.argv[2] if len(sys.argv) > 2 else '.'
HERE = os.path.dirname(os.path.abspath(__file__))

GENERAL = {   # (the royal announcer's lines; the keys stay the war general's, so commentary.js picks them as before)
    'engage': 'Let the battle begin!', 'first-blood': 'First blood is drawn!', 'open-fire': 'Open fire!',
    'keep-pressure': 'They press on!', 'cut-them-down': 'The ranks are falling!', 'magnificent': 'Magnificent!',
    'titan-fallen': 'Behold! Their titan has fallen!', 'beast-down': 'The beast is slain!',
    'direct-hit': 'A direct hit!', 'what-a-blow': 'What a blow!', 'thats-how': 'Splendid!',
    'hold-the-line': 'They hold the line!', 'stand-your-ground': 'They stand their ground!', 'make-it-count': 'One soldier remains!',
    'steady': 'It splits in two!', 'traitor': 'A traitor in the ranks!', 'turned': 'He has turned his banner!',
    'gate-broken': 'The gate is broken!', 'brace': 'Magic upon the field!', 'unbelievable': 'Unbelievable!',
    'swallowed': 'Swallowed by the void!', 'nothing-left': 'Nothing remains of them!',
    'victory': 'Hear ye! Victory is declared!', 'battle-won': 'The battle is won!', 'stand-down': 'It is over!',
    # (2026-11-28, Rellz: "add a variety of more narrator quips ... so every video feels unique")
    'trumpets': 'Sound the trumpets!', 'glorious': 'Glorious!', 'relentless': 'Relentless!', 'mighty-charge': 'A mighty charge!',
    'giant-slain': 'The giant is slain!', 'colossus-falls': 'The colossus falls!', 'devastating': 'Devastating!',
    'last-hope': 'Their last hope remains!', 'final-stand': 'A final stand!', 'divided': 'Divided, they fight on!',
    'treason': 'Treason!', 'betrayed': 'Betrayed by their own!', 'breach': 'The walls are breached!',
    'sorcery': 'Sorcery upon the field!', 'did-you-see': 'Did you see that?', 'vanished': 'Vanished without a trace!',
    'glory': 'Glory to the victors!', 'history': 'A battle for the history books!', 'long-live': 'Long live the champions!',
    # the opening hook, said over the face-off (a question in the first second keeps people watching)
    'hook-bets': 'Place your bets!', 'hook-one': 'Two armies enter. Only one leaves!', 'hook-crown': 'Who will claim glory today?',
    'hook-choose': 'Choose your side, now!', 'hook-hear': 'Hear ye! The battle of the day!', 'hook-guess': 'Guess the winner before it ends!',
    'hook-comment': 'Who wins? Tell me in the comments!',
}
ORACLE = {
    'first-blood': 'The first soul is claimed.', 'and-were-off': 'And so, it begins.',
    'what-a-combo': 'The cards foretold this!', 'unstoppable': 'Fate itself cannot stop them!', 'triple-kill': 'Three threads, cut!',
    'titan-down': 'Even giants bow to fate.', 'the-giant-falls': "The giant's thread is cut.",
    'what-a-hit': 'Ooh, I saw that coming!', 'ouch': 'Ooh, that will leave a mark.', 'crushed': 'Crushed, as foretold.',
    'last-one-standing': 'Only one thread remains.', 'hold-the-line': 'Hold on, little ones!',
    'split-in-two': 'Two fates, from one!', 'traitor': 'A traitor! The stars warned me.', 'switched-sides': 'Their fate has turned!',
    'gate-is-down': 'The gate falls, as written.', 'what-a-spell': 'Such delicious magic!', 'unbelievable': 'Even I did not see that!',
    'theyre-finished': 'Their fate is sealed.', 'what-a-finish': 'Just as the cards foretold!', 'its-all-over': 'It is written. It is done.',
    # (2026-11-28, Rellz: "add a variety of more narrator quips ... so every video feels unique")
    'here-we-go': 'Here we go, my darlings.', 'surge': 'The threads snap, one by one!', 'rising': 'A storm of fate!',
    'no-mercy': 'No mercy in the stars tonight!', 'rampage': 'I have never seen such fury!',
    'colossus': 'The mighty have fallen!', 'giant-slain': 'Even the stars gasp!', 'mighty-fall': 'So big, so doomed!',
    'all-or-nothing': 'All or nothing now!', 'final-stand': 'The final thread trembles!', 'one-more': 'One more, and it is written!',
    'divided': 'Divided, but not defeated!', 'two-fates': 'Two paths, two fates!', 'betrayed': 'Betrayed! I knew it!',
    'backstab': 'A knife in the back!', 'breach': 'The walls weep!', 'crumble': 'Stone turns to dust!',
    'sorcery': 'The air hums with magic!', 'did-you-see': 'Did you see that?', 'curse': 'A curse upon them!',
    'devastating': 'Devastating!', 'legendary': 'Legendary. Simply legendary.', 'for-the-ages': 'This one is written in the stars.',
    'never-forget': 'None will forget this day.',
    'hook-bets': 'Place your bets, darlings.', 'hook-one': 'Will the base survive? Even the cards are unsure.',
    'hook-crown': 'I see a storm coming.', 'hook-choose': 'Will it stand, or will it fall?', 'hook-hear': 'Shall we peek into the future?',
    'hook-guess': 'Guess before the cards do!', 'hook-comment': 'Tell me your guess in the comments.',
}
HERALD = {
    'first-blood': 'First blood!', 'and-were-off': 'The war begins!',
    'what-a-combo': 'Land after land!', 'unstoppable': 'Unstoppable!', 'triple-kill': 'Three lands taken!',
    'titan-down': 'A capital falls!', 'the-giant-falls': 'The capital is taken!',
    'what-a-hit': 'What a blow!', 'ouch': 'A heavy loss!', 'crushed': 'Crushed!',
    'last-one-standing': 'Last kingdom standing!', 'hold-the-line': 'Hold the line!',
    'split-in-two': 'The realm is split!', 'traitor': 'Treachery!', 'switched-sides': 'They have turned their banner!',
    'gate-is-down': 'The gate is down!', 'what-a-spell': 'What sorcery!', 'unbelievable': 'Unbelievable!',
    'theyre-finished': 'They are finished!', 'what-a-finish': 'What a finish!', 'its-all-over': 'It is over!',
    # (2026-11-28, Rellz: "add a variety of more narrator quips ... so every video feels unique"; here a 'titan' cue is a capital
    # taken and a 'streak' cue a new leader, so the herald says so)
    'here-we-go': 'To war!', 'surge': 'A new kingdom takes the lead!', 'rising': 'The crown changes hands!',
    'no-mercy': 'They seize the lead!', 'rampage': 'The map turns in their favour!',
    'colossus': 'Their crown city falls!', 'giant-slain': 'A capital burns!', 'mighty-fall': 'The royal seat is lost!',
    'all-or-nothing': 'All or nothing!', 'final-stand': 'The final stand!', 'one-more': 'One more land decides it!',
    'divided': 'Divided, but not defeated!', 'two-fates': 'A kingdom torn in two!', 'betrayed': 'Betrayed by their own!',
    'backstab': 'A knife in the back!', 'breach': 'The walls are breached!', 'crumble': 'The walls crumble!',
    'sorcery': 'Dark magic!', 'did-you-see': 'Did you see that?', 'curse': 'A curse upon the land!',
    'devastating': 'Devastating!', 'legendary': 'A legendary war!', 'for-the-ages': 'One for the history books!',
    'never-forget': 'None will forget this day!',
    'hook-bets': 'Place your bets!', 'hook-one': 'Many kingdoms. One crown!', 'hook-crown': 'Who will rule the island?',
    'hook-choose': 'Choose your kingdom, now!', 'hook-hear': 'Hear ye! The war for the island begins!',
    'hook-guess': 'Guess the ruler before the end!', 'hook-comment': 'Who rules? Tell me in the comments!',
}
HERALD_CRIES = ['March!', 'To arms!', 'For the crown!']

PROFILES = {
    'army': dict(lines=GENERAL, file=lambda k: os.path.join(HERE, 'general', f'gen-{k}.wav'), mix=[('bm_george', 0.7), ('bm_daniel', 0.3)],
                 lang='en-gb', speed=0.88, fx='tower', semis=-1.0),
    'tower': dict(lines=ORACLE, file=lambda k: os.path.join(HERE, 'oracle', f'call-{k}.wav'), mix=[('bf_isabella', 0.65), ('af_nicole', 0.35)],
                  lang='en-gb', speed=0.9, fx='witch'),
    'territory': dict(lines=HERALD, file=lambda k: os.path.join(HERE, f'call-{k}.wav'), mix=[('bm_fable', 0.55), ('bm_lewis', 0.45)],
                      lang='en-gb', speed=0.93, fx='tower', semis=-0.6, extra={f'march-{i + 1}': c for i, c in enumerate(HERALD_CRIES)},
                      extra_file=lambda k: os.path.join(HERE, f'{k}.wav')),
}

def bp(x, lo, hi): b, a = ss.butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band'); return ss.lfilter(b, a, x).astype(np.float32)
def hp(x, hz): b, a = ss.butter(2, hz / (SR / 2), 'high'); return ss.lfilter(b, a, x).astype(np.float32)
def lp(x, hz): b, a = ss.butter(2, hz / (SR / 2)); return ss.lfilter(b, a, x).astype(np.float32)
def norm(x, peak=0.9): return (x * peak / (np.abs(x).max() + 1e-9)).astype(np.float32)
def shift(x, semis):  # pitch by resampling (a touch slower when lower, as a bigger voice would be)
    return ss.resample(x, int(len(x) * 2 ** (semis / 12))).astype(np.float32) if semis else x
def comp(x, thr=0.3, ratio=3.5, att=0.004, rel=0.12):
    a1, r1 = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR)); env = 0.0; out = np.empty_like(x)
    for i, v in enumerate(np.abs(x)):
        env = a1 * env + (1 - a1) * v if v > env else r1 * env + (1 - r1) * v
        out[i] = x[i] * (1.0 if env <= thr else (thr + (env - thr) / ratio) / env)
    return out
def echo(x, ms, gain, tone=3000):
    d = int(ms / 1000 * SR); y = np.zeros(len(x) + d, np.float32); y[:len(x)] += x; y[d:] += lp(x, tone) * gain; return y
def chorus(x, ms, depth_ms, rate, gain):
    n = len(x); t = np.arange(n) / SR; d = (ms + depth_ms * np.sin(2 * np.pi * rate * t)) / 1000 * SR
    idx = np.clip(np.arange(n) - d, 0, n - 1); return (x + gain * np.interp(idx, np.arange(n), x)).astype(np.float32)

def effects(x, kind, semis=0.0):
    x = hp(x, 70)
    if kind == 'general':
        x = shift(x, -1.2); x = norm(x)
        x = x + 0.5 * bp(x, 130, 340) + 0.35 * bp(x, 1800, 3600)       # chest and bite
        x = np.tanh(x * 1.9) / np.tanh(1.9)                             # a little grit
        x = lp(x, 7500); x = comp(x); x = echo(x, 75, 0.16, 2400)       # the slap off the field
    elif kind in ('witch', 'tower'):   # Tower Clash's effects ('tower': the same chain at the voice's own pitch)
        x = shift(x, 0.4 if kind == 'witch' else semis); x = norm(x)
        x = x + 0.25 * hp(x, 5200)                                       # air
        x = chorus(x, 14, 3, 0.35, 0.33)                                  # the ghostly double, a hair behind her
        x = comp(x, 0.35, 3.0); x = echo(x, 190, 0.2, 4200); x = echo(x, 380, 0.1, 3000)
    elif kind == 'herald':
        x = shift(x, -0.6); x = norm(x)
        x = x + 0.35 * bp(x, 180, 450) + 0.2 * bp(x, 2200, 4200)        # warm and clear
        x = comp(x, 0.32, 3.0); x = lp(x, 9000); x = echo(x, 95, 0.18, 3200); x = echo(x, 170, 0.1, 2400)
    # trim the silence, a soft start and a long fade so it sinks into the music
    on = np.where(np.abs(x) > 0.02 * np.abs(x).max())[0]
    if len(on): x = x[max(0, on[0] - int(0.02 * SR)):on[-1] + int(0.3 * SR)]
    f = int(0.012 * SR); x[:f] *= np.linspace(0, 1, f); g = int(0.22 * SR); x[-g:] *= np.linspace(1, 0, g) ** 1.6
    return norm(x)

def main():
    from kokoro_onnx import Kokoro
    P = PROFILES[GAME]; k = Kokoro(os.path.join(MODEL, 'kokoro-v1.0.onnx'), os.path.join(MODEL, 'voices-v1.0.bin'))
    style = sum(k.get_voice_style(v) * w for v, w in P['mix'])
    jobs = [(t, P['file'](key)) for key, t in P['lines'].items()] + [(t, P['extra_file'](key)) for key, t in P.get('extra', {}).items()]
    if '--missing' in sys.argv: jobs = [(t, o) for t, o in jobs if not os.path.exists(o)]
    for text, out in jobs:
        a, sr = k.create(text, voice=style, speed=P['speed'], lang=P['lang'])
        x = ss.resample_poly(np.asarray(a, np.float32), SR, sr).astype(np.float32)
        x = effects(x, P['fx'], P.get('semis', 0.0))
        os.makedirs(os.path.dirname(out), exist_ok=True)
        wf.write(out, SR, (np.stack([x, x], 1) * 32767).astype(np.int16))
    print('ok', GAME, len(jobs), 'lines')

if __name__ == '__main__':
    main()
