# Builds Territory Clash's war cries (sfx/march-1..3.wav): a herald's clear shout ("March!", "To arms!", "For the crown!"),
# the kingdoms' armies shouting it back, a roar and a hall. Rellz (2026-11-16): "make the voices clearer".
# Clearer than Army Clash's charge: the lead is pitched down only a little, barely driven (a shout, not a crunch), given a
# presence lift around 3 kHz and kept mostly dry and in front; the crowd and the hall sit well under it.
# Run once by hand: python3 make_march.py <voice.onnx> (needs piper-tts, numpy, scipy). The videos only read the wavs.
import sys, os, subprocess, tempfile, numpy as np, scipy.io.wavfile as wf, scipy.signal as ss
SR = 48000
MODEL = sys.argv[1] if len(sys.argv) > 1 else 'en-us-ryan-high.onnx'
OUT = os.path.dirname(os.path.abspath(__file__))
LINES = ['March!', 'To arms!', 'For the crown!']
ROARS = ['Haaa!', 'Raaah!', 'Hoorah!']
tmp = tempfile.mkdtemp()
def say(text, n, speed=0.85):
    p = f'{tmp}/{n}.wav'
    subprocess.run(['piper', '-m', MODEL, '--length_scale', str(speed), '-f', p], input=text.encode(), check=True, capture_output=True)
    sr, x = wf.read(p); x = x.astype(np.float32) / 32768.0
    if x.ndim > 1: x = x.mean(1)
    return ss.resample_poly(x, SR, sr).astype(np.float32)
def pitch(x, p):
    idx = np.arange(0, len(x) - 1, p); return np.interp(idx, np.arange(len(x)), x).astype(np.float32)
def lowpass(x, hz): b, a = ss.butter(2, hz / (SR / 2)); return ss.lfilter(b, a, x).astype(np.float32)
def highpass(x, hz): b, a = ss.butter(2, hz / (SR / 2), 'high'); return ss.lfilter(b, a, x).astype(np.float32)
def band(x, lo, hi): b, a = ss.butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band'); return ss.lfilter(b, a, x).astype(np.float32)
def norm(x): return x / (np.abs(x).max() + 1e-9)
def put(L, R, x, t, g, pan):
    s = int(t * SR); n = min(len(x), len(L) - s)
    if n <= 0: return
    a = (pan + 1) * np.pi / 4; L[s:s + n] += x[:n] * g * np.cos(a); R[s:s + n] += x[:n] * g * np.sin(a)
def make(text, seed, out):
    rng = np.random.default_rng(seed); dur = 3.2; L = np.zeros(int(SR * dur), np.float32); R = np.zeros_like(L)
    lead = norm(say(text, 'lead'))
    # the herald: a touch deeper, lightly driven, rumble cut, a presence lift so every word reads on a phone speaker
    v = norm(pitch(lead, 0.93)); v = np.tanh(v * 1.6) / np.tanh(1.6); v = highpass(v, 110)
    v = v + 0.55 * band(v, 2200, 4200) + 0.18 * lowpass(v, 220); v = norm(v)
    put(L, R, v, 0.0, 1.0, 0.0)
    # the armies shout it back, softer, later and spread wide (so they never blur the herald's words)
    for k in range(7):
        e = norm(pitch(lead, 0.82 + 0.22 * rng.random())); e = lowpass(np.tanh(e * 2.0), 2000 + 1200 * rng.random())
        put(L, R, e, 0.32 + 0.18 * rng.random(), 0.16, rng.uniform(-0.9, 0.9))
    # the roar
    roars = [norm(say(r, f'r{i}', 0.9)) for i, r in enumerate(ROARS)]
    for k in range(12):
        e = norm(pitch(roars[k % 3], 0.7 + 0.35 * rng.random())); e = lowpass(np.tanh(e * 2.0), 1600 + 1400 * rng.random())
        put(L, R, e, 0.75 + 0.45 * rng.random(), 0.15, rng.uniform(-1, 1))
    t = np.arange(len(L)) / SR; env = np.clip((t - 0.7) / 0.35, 0, 1) * np.exp(-np.clip(t - 1.1, 0, None) / 0.7)
    for ch, s in ((L, 1), (R, 2)):
        ch += band(np.random.default_rng(seed + s).standard_normal(len(L)).astype(np.float32), 280, 1400) * env * 0.06
    # a stone hall, light, so the words stay crisp
    n_ir = int(SR * 1.3); ti = np.arange(n_ir) / SR
    for ch, s in ((L, 3), (R, 4)):
        ir = np.random.default_rng(seed + s).standard_normal(n_ir).astype(np.float32) * np.exp(-ti / 0.32)
        ir = lowpass(ir, 4500); ir /= np.sqrt((ir ** 2).sum())
        ch += ss.fftconvolve(ch, ir)[:len(ch)].astype(np.float32) * 0.2
    st = np.stack([L, R], 1); st *= 0.92 / (np.abs(st).max() + 1e-9)
    st *= np.clip((dur - t) / 0.4, 0, 1)[:, None]
    wf.write(out, SR, (st * 32767).astype(np.int16))
for i, line in enumerate(LINES):
    make(line, 40 + i, os.path.join(OUT, f'march-{i + 1}.wav')); print('wrote', f'march-{i + 1}.wav', line)
