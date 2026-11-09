"""Música tech ORIGINAL generada por código (numpy puro; sin samples ni licencias de terceros).

La pista sigue la dramaturgia del guion: cada escena declara un tipo y el tipo define la energía y las capas:
  hook/intro -> pulso + arpegio filtrado, sin batería completa (expectativa)
  design    -> pad y arpegio presentes, bombo suave (explicación del diseño)
  before    -> dron oscuro + tic-tac, pero con bombo y bajo: lo viejo pesa, sin perder el pulso
  turn      -> subida (riser) que termina en un impacto + entrada del groove (el "hoy")
  input/check/table-check/review/learn/deliver -> groove medio: bombo suave, hats, pad con sidechain, bajo, arpegio
  process/scan                                 -> groove alto (procesamiento): semicorcheas, filtro abierto
  impact    -> groove medio-alto
  opener/close -> groove pleno (cierre épico, con riser + impacto en el título) y acorde final que se resuelve y se apaga
Tempo fijo (BPM del guion); el build redondea la duración de cada escena a la grilla de pulsos, así los cambios de
sección caen en tiempo. Determinista (semilla fija).
"""
import numpy as np

SR = 48000

# Am9 - Fmaj7 - Cmaj7 - Em7 (raíz, y notas del acorde en Hz) — color "tech" moderno, menor y luminoso.
PROG = [
    (110.00, [220.00, 261.63, 329.63, 392.00, 493.88]),
    (87.31, [174.61, 220.00, 261.63, 329.63, 440.00]),
    (130.81, [196.00, 261.63, 329.63, 392.00, 493.88]),
    (82.41, [164.81, 196.00, 246.94, 293.66, 392.00]),
]

LEVELS = {  # pad, arp, bass, kick, hats, hats16, clap, drone, clock
    "hook":    (0.8, 0.8, 0.6, 0.0, 0.25, 0.0, 0.0, 0.0, 0.0),
    "before":  (0.3, 0.0, 0.6, 0.6, 0.35, 0.0, 0.0, 0.6, 0.5),  # con pulso: el "antes" solo con dron y tic-tac aburre
    "turn":    (0.7, 0.5, 0.7, 0.7, 0.6, 0.0, 0.0, 0.0, 0.0),
    "step":    (0.8, 0.8, 0.8, 0.8, 0.7, 0.0, 0.5, 0.0, 0.0),
    "process": (0.9, 1.0, 0.9, 0.9, 0.7, 0.8, 0.6, 0.0, 0.0),
    "design":  (0.9, 0.9, 0.7, 0.5, 0.5, 0.0, 0.0, 0.0, 0.0),
    "impact":  (0.9, 0.8, 0.9, 0.9, 0.7, 0.4, 0.6, 0.0, 0.0),
    "close":   (1.0, 0.9, 1.0, 1.0, 0.8, 0.6, 0.7, 0.0, 0.0),
}
KIND = {"opener": "close", "intro": "hook", "before": "before", "turn": "turn", "design": "design",
        "process": "process", "scan": "process", "impact": "impact", "close": "close", "outro": "hook"}


def kind_of(scene_type):
    return KIND.get(scene_type, "step")


def _fft_filter(x, lo=None, hi=None):
    """Filtro de fase cero en frecuencia (pendiente suave) — sin scipy."""
    n = len(x)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    g = np.ones_like(f)
    if hi:
        g *= 1 / np.sqrt(1 + (f / hi) ** 4)
    if lo:
        g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** 4)
    return np.fft.irfft(X * g, n)


def _reverb(x, secs=2.4, seed=5):
    n = int(secs * SR)
    rng = np.random.default_rng(seed)
    t = np.arange(n) / SR
    ir = rng.normal(0, 1, n) * np.exp(-t * 6.9 / secs)
    ir = _fft_filter(ir, lo=180, hi=6500)
    ir[: int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))
    ir /= np.sqrt(np.sum(ir ** 2))
    m = len(x) + n
    y = np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[: len(x)]
    return y


def _saw(f, t, harm=12, bright=1.0):
    y = np.zeros_like(t)
    for k in range(1, harm + 1):
        if f * k > 9000:
            break
        y += np.sin(2 * np.pi * f * k * t) / k * np.exp(-(k - 1) * (0.35 / max(bright, 0.05)))
    return y


def _put(buf, start_s, x, gain=1.0):
    a = int(round(start_s * SR))
    if a >= len(buf) or a + len(x) <= 0:
        return
    if a < 0:
        x, a = x[-a:], 0
    b = min(len(buf), a + len(x))
    buf[a:b] += gain * x[: b - a]


def _kick():
    t = np.arange(int(0.42 * SR)) / SR
    f = 45 + 95 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / 0.16) + 0.25 * np.exp(-t / 0.002) * np.sin(2 * np.pi * 1800 * t)


def _hat(rng, dec=0.028, ln=0.12):
    t = np.arange(int(ln * SR)) / SR
    return _fft_filter(rng.normal(0, 1, len(t)), lo=7000) * np.exp(-t / dec)


def _clap(rng):
    t = np.arange(int(0.3 * SR)) / SR
    env = np.exp(-t / 0.07) * (1 + 0.6 * (np.sin(2 * np.pi * 90 * t) > 0) * (t < 0.03))
    return _fft_filter(rng.normal(0, 1, len(t)), lo=900, hi=5000) * env


def _pluck(f, ln=0.32, bright=1.0):
    t = np.arange(int(ln * SR)) / SR
    return _saw(f, t, harm=8, bright=bright * (0.6 + 0.4 * np.exp(-t / 0.05)).mean()) * np.exp(-t / 0.09) * np.minimum(1, t / 0.003)


def riser(secs):
    rng = np.random.default_rng(11)
    t = np.arange(int(secs * SR)) / SR
    p = t / secs
    noise = rng.normal(0, 1, len(t))
    out = np.zeros_like(t)
    for i, (a, b) in enumerate(zip(np.linspace(0, 1, 9)[:-1], np.linspace(0, 1, 9)[1:])):  # barrido por tramos
        seg = (p >= a) & (p < b)
        out[seg] = _fft_filter(noise, lo=300 + 2600 * a, hi=900 + 7000 * b)[seg]
    tone = np.sin(2 * np.pi * np.cumsum(180 + 900 * p ** 2) / SR)
    return (0.6 * out + 0.25 * tone) * p ** 2.2


def impact():
    t = np.arange(int(2.2 * SR)) / SR
    f = 30 + 70 * np.exp(-t / 0.08)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.55)
    rng = np.random.default_rng(13)
    hiss = _fft_filter(rng.normal(0, 1, len(t)), lo=2000) * np.exp(-t / 0.35) * 0.35
    return boom + hiss


def build(dur, sections, bpm=120, downbeats=()):
    """sections: [(start_s, end_s, scene_type)]. downbeats: instantes de impacto (giro). Devuelve mono float32."""
    n = int((dur + 3.0) * SR)
    beat = 60.0 / bpm
    bar = 4 * beat
    rng = np.random.default_rng(7)
    pad, arp, bass, drums, drone, clock, fx = (np.zeros(n) for _ in range(7))
    side = np.ones(n)
    kick = _kick()

    def level_at(ts):
        for a, b, ty in sections:
            if a - 1e-6 <= ts < b:
                return LEVELS[kind_of(ty)], ty
        return LEVELS["close"], "close"

    nbeats = int(dur / beat) + 1
    for bi in range(nbeats):
        ts = bi * beat
        lv, ty = level_at(ts)
        p_pad, p_arp, p_bass, p_kick, p_hat, p_h16, p_clap, p_drone, p_clock = lv
        chord_root, chord = PROG[int(ts // bar) % len(PROG)]
        b_in_bar = bi % 4
        if p_kick:
            _put(drums, ts, kick, 0.9 * p_kick)
            a = int(ts * SR)
            ln = min(int(0.28 * SR), n - a)
            side[a:a + ln] = np.minimum(side[a:a + ln], 1 - 0.55 * np.exp(-np.arange(ln) / SR / 0.09))
        if p_hat:
            _put(drums, ts + beat / 2, _hat(rng, 0.05, 0.2), 0.22 * p_hat)
        if p_h16:
            for q in (0.25, 0.75):
                _put(drums, ts + beat * q, _hat(rng), 0.10 * p_h16)
        if p_clap and b_in_bar in (1, 3):
            _put(drums, ts, _clap(rng), 0.28 * p_clap)
        if p_clock:
            tt = np.arange(int(0.04 * SR)) / SR
            f = 2300 if b_in_bar % 2 == 0 else 1700
            _put(clock, ts, np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.006), 0.22 * p_clock)
        if p_bass:
            for e in (0, 0.5):
                t = np.arange(int(beat * 0.48 * SR)) / SR
                x = np.tanh(1.6 * (np.sin(2 * np.pi * chord_root * t) + 0.3 * np.sin(4 * np.pi * chord_root * t)))
                _put(bass, ts + e * beat, x * np.minimum(1, t / 0.006) * np.exp(-t / 0.22), 0.30 * p_bass)
        if p_arp:
            pat = [0, 2, 4, 1, 3, 2, 4, 1]
            steps = 4 if kind_of(ty) != "hook" else 2
            for s in range(steps):
                note = chord[pat[(bi * steps + s) % len(pat)] % len(chord)] * 2
                bright = 1.4 if kind_of(ty) == "process" else 0.8
                _put(arp, ts + s * beat / steps, _pluck(note, bright=bright), 0.10 * p_arp)
        if b_in_bar == 0:
            t = np.arange(int((bar + 0.6) * SR)) / SR
            env = np.minimum(1, t / 0.5) * np.clip((bar + 0.6 - t) / 0.6, 0, 1)
            if p_pad:
                x = sum(_saw(f, t, harm=10, bright=0.5) + _saw(f * 1.004, t, harm=10, bright=0.5) for f in chord[:4]) / 8
                _put(pad, ts, x * env, 0.30 * p_pad)
            if p_drone:
                x = _saw(55.0, t, harm=14, bright=0.35) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.25 * t)) + 0.5 * _saw(82.41, t, harm=8, bright=0.3)
                _put(drone, ts, x * env, 0.24 * p_drone)

    arp = arp + 0.32 * np.roll(arp, int(beat * 0.75 * SR)) + 0.12 * np.roll(arp, int(beat * 1.5 * SR))
    for d in downbeats:
        _put(fx, d - 2 * bar / 2, riser(bar), 0.22)
        _put(fx, d, impact(), 0.55)
    end_chord = PROG[0][1]
    last = sections[-1][0] if sections else dur
    t = np.arange(int(6.0 * SR)) / SR
    big = sum(_saw(f, t, harm=12, bright=0.7) for f in end_chord) / 5 * np.minimum(1, t / 0.02) * np.exp(-t / 2.4)
    imp = impact()
    big[: len(imp)] += 0.6 * imp[: len(big)]
    _put(fx, max(0.0, dur - 4.2), big, 0.18)

    wet = pad * side + arp * side + 0.5 * drone
    mix = pad * side + arp * side + bass * side + drums + drone + clock + fx
    mix += 0.35 * _reverb(wet + 0.3 * fx + 0.15 * drums)
    _ = last
    fade = np.minimum(1, np.arange(n) / SR / 0.8) * np.clip((dur + 2.5 - np.arange(n) / SR) / 2.5, 0, 1)
    mix *= fade
    mix = mix[: int(dur * SR)]
    return (mix / (np.max(np.abs(mix)) or 1) * 0.9).astype(np.float32)
