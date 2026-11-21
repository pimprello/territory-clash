# Builds Territory Clash's voice: a royal herald for the war cry (march-1..3.wav) and the battle calls (call-*.wav, the files
# commentary.js reads). Rellz (2026-11-21): "make the voice sound royal and have a fade and blend in with the music", "it says
# mmm- ... em em em dash, fix it". So: plain words only (no made-up roars like "Haaa!" that the voice spells out), a British
# voice taken slower and a little deeper, warm rather than driven, then a stone throne room, two soft echoes and a long fade
# so each line sinks into the music instead of stopping dead.
# Run once by hand: python3 sfx/make_royal.py <folder with en_GB-alan-medium.onnx and .onnx.json>
# (the voice: https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-en_GB-alan-medium.tar.bz2)
# Needs numpy, scipy and piper. The videos only read the wavs.
import os, sys, subprocess, tempfile, numpy as np, scipy.io.wavfile as wf, scipy.signal as ss
SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
VOICE = sys.argv[1] if len(sys.argv) > 1 else '.'
NAME = 'en_GB-alan-medium'
CRIES = ['March!', 'To arms!', 'For the crown!']
# same ids as commentary.js expects; the words fit a kingdom war
CALLS = {
    'first-blood': 'First blood!', 'and-were-off': 'The war begins!',
    'what-a-combo': 'Land after land!', 'unstoppable': 'Unstoppable!', 'triple-kill': 'Three lands taken!',
    'titan-down': 'The titan falls!', 'the-giant-falls': 'The giant falls!',
    'what-a-hit': 'What a blow!', 'ouch': 'A heavy loss!', 'crushed': 'Crushed!',
    'last-one-standing': 'Last kingdom standing!', 'hold-the-line': 'Hold the line!',
    'split-in-two': 'The realm is split!', 'traitor': 'Treachery!', 'switched-sides': 'They have turned their banner!',
    'gate-is-down': 'The gate is down!', 'what-a-spell': 'What sorcery!', 'unbelievable': 'Unbelievable!',
    'theyre-finished': 'They are finished!', 'what-a-finish': 'What a finish!', 'its-all-over': 'It is over!',
}
def lowpass(x, hz): b, a = ss.butter(2, hz / (SR / 2)); return ss.lfilter(b, a, x).astype(np.float32)
def highpass(x, hz): b, a = ss.butter(2, hz / (SR / 2), 'high'); return ss.lfilter(b, a, x).astype(np.float32)
def band(x, lo, hi): b, a = ss.butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band'); return ss.lfilter(b, a, x).astype(np.float32)
def norm(x): return (x / (np.abs(x).max() + 1e-9)).astype(np.float32)
def pitch(x, p): idx = np.arange(0, len(x) - 1, p); return np.interp(idx, np.arange(len(x)), x).astype(np.float32)
def say(text, speed=1.05):
    with tempfile.TemporaryDirectory() as d:
        raw = os.path.join(d, 'v.wav')
        subprocess.run(['piper', '-m', f'{VOICE}/{NAME}.onnx', '-c', f'{VOICE}/{NAME}.onnx.json', '--length-scale', str(speed), '-f', raw],
                       input=text.encode(), check=True, capture_output=True)
        sr, x = wf.read(raw)
    x = x.astype(np.float32) / 32768.0
    if x.ndim > 1: x = x.mean(1)
    x = ss.resample_poly(x, SR, sr).astype(np.float32)
    on = np.where(np.abs(x) > 0.02 * np.abs(x).max())[0]
    return x[max(0, on[0] - int(0.01 * SR)):on[-1] + int(0.05 * SR)]
def royal(x):
    # a little deeper and fuller, warm (soft saturation, not a crunch), clear on a phone (gentle 3 kHz lift)
    x = norm(pitch(x, 0.95)); x = highpass(x, 85)
    x = np.tanh(x * 1.25) / np.tanh(1.25)
    x = x + 0.22 * lowpass(x, 260) + 0.18 * band(x, 2400, 4200)
    return norm(x)
def hall(L, R, seed, secs=2.2, decay=0.5, wet=0.3):
    # a stone throne room, then two soft echoes off the far wall (darker and quieter each time)
    n = int(SR * secs); t = np.arange(n) / SR; out = []
    for ch, s in ((L, 1), (R, 2)):
        ir = np.random.default_rng(seed + s).standard_normal(n).astype(np.float32) * np.exp(-t / decay)
        ir[:int(0.012 * SR)] = 0; ir = lowpass(ir, 3800); ir /= np.sqrt((ir ** 2).sum())
        y = ch + ss.fftconvolve(ch, ir)[:len(ch)].astype(np.float32) * wet
        for d, g, lp in ((0.24 + 0.01 * s, 0.24, 2600), (0.49 + 0.015 * s, 0.11, 1700)):
            k = int(d * SR); e = np.zeros_like(y); e[k:] = lowpass(ch, lp)[:len(ch) - k] * g; y += e
        out.append(y)
    return out
def finish(L, R, out, fade_in=0.03, fade_out=0.9):
    st = np.stack([L, R], 1); n = len(st)
    on = np.where(np.abs(st).max(1) > 0.003 * np.abs(st).max())[0]; st = st[:on[-1] + 1] if len(on) else st; n = len(st)
    fi = int(fade_in * SR); st[:fi] *= np.linspace(0, 1, fi)[:, None]
    fo = min(n // 2, int(fade_out * SR)); st[-fo:] *= (np.linspace(1, 0, fo) ** 1.6)[:, None]
    st *= 0.89 / (np.abs(st).max() + 1e-9)
    wf.write(out, SR, (st * 32767).astype(np.int16))
def cry(text, seed, out):
    rng = np.random.default_rng(seed)
    lead = say(text, 1.12); v = royal(lead)
    n = len(v) + int(3.2 * SR); L = np.zeros(n, np.float32); R = np.zeros(n, np.float32)
    L[:len(v)] += v * 0.9; R[:len(v)] += v * 0.9
    # the armies answer with the same words, far off and spread wide, under the herald (never over his words)
    for k in range(9):
        e = lowpass(norm(pitch(lead, 0.8 + 0.25 * rng.random())), 1500 + 900 * rng.random())
        s = int((len(v) / SR * 0.85 + 0.15 * rng.random()) * SR); a = rng.uniform(0, np.pi / 2); m = min(len(e), n - s)
        L[s:s + m] += e[:m] * 0.12 * np.cos(a); R[s:s + m] += e[:m] * 0.12 * np.sin(a)
    # a swell of the host behind it (vowel-band noise), rising with the answer and dying away
    t = np.arange(n) / SR; t0 = len(v) / SR * 0.8; env = np.clip((t - t0) / 0.3, 0, 1) * np.exp(-np.clip(t - t0 - 0.4, 0, None) / 0.8)
    for ch, s in ((L, 5), (R, 6)): ch += band(np.random.default_rng(seed + s).standard_normal(n).astype(np.float32), 300, 1300) * env * 0.05
    L, R = hall(L, R, seed)
    finish(L, R, out, fade_out=1.2)
def call(text, out):
    v = royal(say(text, 1.02)); n = len(v) + int(2.0 * SR)
    L = np.zeros(n, np.float32); L[:len(v)] = v; R = L.copy()
    L, R = hall(L, R, hash(out) & 0xFFFF, secs=1.8, decay=0.4, wet=0.24)
    finish(L, R, out, fade_out=0.8)
for i, c in enumerate(CRIES): cry(c, 40 + i, os.path.join(HERE, f'march-{i + 1}.wav')); print('march', i + 1, c)
for k, text in CALLS.items(): call(text, os.path.join(HERE, f'call-{k}.wav'))
print('ok', len(CALLS), 'calls')
