# The cartoon stings under the fun layer's captions (fun.js; Rellz 2026-11-28: "make the videos funnier"). All synthesised here
# from sine waves and noise, so they are original. The same file in all three Clash games; writes sfx/fun/<name>.wav (48 kHz).
# Run once by hand:  python3 sfx/make_fun.py
import os, numpy as np, scipy.io.wavfile as wf, scipy.signal as ss

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'fun')
rng = np.random.default_rng(7)

def t_(sec): return np.arange(int(sec * SR)) / SR
def env(n, a=0.005, r=0.2, shape=2.0):
    e = np.ones(n); ai = max(1, int(a * SR)); e[:ai] = np.linspace(0, 1, ai)
    ri = min(n, int(r * SR)); e[-ri:] *= np.linspace(1, 0, ri) ** shape; return e
def tone(freqs, sec, kind='sine'):
    # freqs: a float or an array of instantaneous frequencies
    n = int(sec * SR); f = np.broadcast_to(np.asarray(freqs, float), (n,)) if np.ndim(freqs) == 0 else np.asarray(freqs, float)
    ph = 2 * np.pi * np.cumsum(f) / SR
    if kind == 'square': return np.sign(np.sin(ph)) * 0.6
    if kind == 'saw': return 2 * ((ph / (2 * np.pi)) % 1) - 1
    if kind == 'tri': return 2 * np.abs(2 * ((ph / (2 * np.pi)) % 1) - 1) - 1
    return np.sin(ph)
def lp(x, hz): b, a = ss.butter(2, hz / (SR / 2)); return ss.lfilter(b, a, x)
def hp(x, hz): b, a = ss.butter(2, hz / (SR / 2), 'high'); return ss.lfilter(b, a, x)
def bp(x, lo, hi): b, a = ss.butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band'); return ss.lfilter(b, a, x)

def boing():
    s = 0.7; tt = t_(s); f = 180 + 260 * np.exp(-tt * 5) * (1 + 0.35 * np.sin(2 * np.pi * 14 * tt) * np.exp(-tt * 3))
    return tone(f, s, 'tri') * env(len(tt), 0.003, 0.5, 1.5) * 0.8
def bonk():
    s = 0.35; tt = t_(s); f = 900 * np.exp(-tt * 9) + 260
    body = tone(f, s) * np.exp(-tt * 18); click = bp(rng.standard_normal(len(tt)), 1500, 5000) * np.exp(-tt * 120) * 0.6
    wood = bp(rng.standard_normal(len(tt)), 500, 1400) * np.exp(-tt * 40) * 0.5
    return (body + click + wood) * 0.9
def slide():
    s = 1.0; tt = t_(s); f = 1400 * np.exp(-tt * 2.2) + 180 + 18 * np.sin(2 * np.pi * 6 * tt)
    x = tone(f, s) * 0.7 + 0.15 * tone(f * 2, s); thud = lp(rng.standard_normal(len(tt)), 180) * np.exp(-np.maximum(0, tt - 0.82) * 25) * (tt > 0.82) * 2.5
    return x * env(len(tt), 0.01, 0.25) + thud
def tada():
    out = []
    for f0, d in [(523.25, 0.11), (659.25, 0.11), (783.99, 0.11), (1046.5, 0.5)]:
        tt = t_(d); vib = 1 + 0.012 * np.sin(2 * np.pi * 7 * tt)
        x = (tone(f0 * vib, d, 'saw') * 0.5 + tone(f0 * 2 * vib, d, 'square') * 0.15)
        x = lp(x, 3200) * env(len(tt), 0.008, min(d * 0.6, 0.3), 1.4); out.append(x)
    return np.concatenate(out) * 0.7
def dundun():
    out = []
    for f0, d in [(146.8, 0.22), (138.6, 0.22), (130.8, 0.75)]:
        tt = t_(d); x = sum(tone(f0 * m, d, 'saw') / (i + 1) for i, m in enumerate([1, 1.5, 2, 3]))
        out.append(lp(x, 1800) * env(len(tt), 0.01, d * 0.7, 1.2))
    return np.concatenate(out) * 0.55
def scratch():
    s = 0.55; tt = t_(s); n = rng.standard_normal(len(tt))
    sweep = 1 + 0.9 * np.sin(2 * np.pi * 4.2 * tt)
    x = np.zeros_like(n)
    # a band of noise whose centre swings, like a record pulled back and forth
    for i in range(0, len(tt), 480):
        seg = n[i:i + 480]; c = 900 * sweep[i] + 300
        x[i:i + 480] = bp(seg, max(80, c * 0.6), min(20000, c * 1.6))
    return x * env(len(tt), 0.005, 0.12) * 1.4
def knock():
    out = np.zeros(int(0.6 * SR))
    for at in (0.0, 0.2):
        tt = t_(0.18); k = bp(rng.standard_normal(len(tt)), 180, 900) * np.exp(-tt * 45) + tone(140, 0.18) * np.exp(-tt * 35) * 0.8
        i = int(at * SR); out[i:i + len(k)] += k
    return out * 1.1
def sparkle():
    s = 0.9; out = np.zeros(int(s * SR))
    notes = [1318.5, 1568, 1760, 2093, 2637, 3136]
    for j, f0 in enumerate(notes):
        tt = t_(0.35); x = tone(f0, 0.35) * np.exp(-tt * 9) + 0.3 * tone(f0 * 2.01, 0.35) * np.exp(-tt * 14)
        i = int(j * 0.07 * SR); out[i:i + len(x)] += x
    return out * 0.45
def pop():
    s = 0.25; tt = t_(s); f = 300 + 1500 * np.exp(-tt * 40)
    return (tone(f, s) * np.exp(-tt * 30) + hp(rng.standard_normal(len(tt)), 2000) * np.exp(-tt * 90) * 0.4) * 0.9

def quack():
    # a rubber-duck squeak-quack: a buzzy tone through two nasal formants, falling in pitch
    s = 0.22; tt = t_(s); f = 620 * np.exp(-tt * 2.5)
    x = tone(f, s, 'saw'); x = bp(x, 900, 1500) * 1.2 + bp(x, 2200, 3000) * 0.6
    return x * env(len(tt), 0.01, 0.09, 1.5)

def airhorn():
    # three quick blasts of a brassy horn (a stack of detuned saws through a bright band)
    out = []
    for d in (0.12, 0.12, 0.42):
        tt = t_(d); f = 466 * (1 + 0.004 * np.sin(2 * np.pi * 30 * tt))
        x = sum(tone(f * m * (1 + dt), d, 'saw') for m, dt in [(1, 0), (1, 0.006), (1.5, 0.003), (2, -0.004)])
        x = bp(x, 400, 4200) * env(len(tt), 0.006, min(0.06, d * 0.4), 1.2); out.append(x); out.append(np.zeros(int(0.04 * SR)))
    return np.concatenate(out) * 0.6
def boom():
    # a deep sub boom with a little crack on top
    s = 1.1; tt = t_(s); f = 70 * np.exp(-tt * 1.6) + 32
    x = tone(f, s) * np.exp(-tt * 3.2) * 1.2 + lp(rng.standard_normal(len(tt)), 900) * np.exp(-tt * 18) * 0.5
    return np.tanh(x * 1.6)
def crickets():
    # a quiet field at night: two crickets chirping (for the boring bits)
    s = 1.6; tt = t_(s); out = np.zeros(len(tt))
    for f0, rate, off in [(4300, 3.1, 0.0), (4700, 2.6, 0.17)]:
        gate = (np.sin(2 * np.pi * rate * (tt + off)) > 0.55).astype(float)
        pulses = (np.sin(2 * np.pi * 32 * tt) > 0).astype(float)
        out += tone(f0, s) * lp(gate * pulses, 400) * 0.5
    return out * env(len(tt), 0.05, 0.3)

def write(name, x):
    x = np.asarray(x, np.float32); x = x / (np.abs(x).max() + 1e-9) * 0.85
    f = int(0.004 * SR); x[-f:] *= np.linspace(1, 0, f)
    os.makedirs(OUT, exist_ok=True)
    wf.write(os.path.join(OUT, name + '.wav'), SR, (np.stack([x, x], 1) * 32767).astype(np.int16))

if __name__ == '__main__':
    for fn in [boing, bonk, slide, tada, dundun, scratch, knock, sparkle, pop, quack, airhorn, boom, crickets]: write(fn.__name__, fn())
    print('ok', len(os.listdir(OUT)), 'stings')
