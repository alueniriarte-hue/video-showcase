"""Tiempos por palabra: ASR local (faster-whisper small, offline una vez descargado) + alineación con el texto del guion."""
import difflib
import os
from pathlib import Path

from common import CFG, norm

_MODEL = None


def _model():
    global _MODEL
    if _MODEL is None:
        from faster_whisper import WhisperModel
        snap = Path(CFG["hf_home"]) / "hub" / "models--Systran--faster-whisper-small" / "snapshots"
        if snap.exists() and any(snap.iterdir()):
            os.environ.setdefault("HF_HUB_OFFLINE", "1")
            src = str(next(snap.iterdir()))
        else:
            src = "small"  # primera vez: se descarga (~480 MB) a HF_HOME
        _MODEL = WhisperModel(src, device="cpu", compute_type="int8", cpu_threads=max(1, (os.cpu_count() or 4) - 1))
    return _MODEL


def asr_words(a16, prompt=None, language="es"):
    """Audio mono 16 kHz -> [{word, start, end}] en segundos."""
    segs, _ = _model().transcribe(a16, language=language, word_timestamps=True, vad_filter=False, beam_size=5,
                                  initial_prompt=prompt, condition_on_previous_text=False)
    return [{"word": w.word.strip(), "start": w.start, "end": w.end} for s in segs for w in s.words]


def align(script_tokens, asr):
    """Asigna (inicio, fin) a cada palabra del guion usando las reconocidas; los huecos se interpolan."""
    a = [norm(w["word"]) for w in asr]
    s = [norm(t) for t in script_tokens]
    sm = difflib.SequenceMatcher(None, s, a, autojunk=False)
    times = [None] * len(s)
    for tag, i1, i2, j1, _ in sm.get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1):
                times[i1 + k] = (asr[j1 + k]["start"], asr[j1 + k]["end"])
    t_end = asr[-1]["end"] if asr else 0.0
    for i in range(len(s)):
        if times[i] is None:
            lo = next((j for j in range(i - 1, -1, -1) if times[j]), None)
            hi = next((j for j in range(i + 1, len(s)) if times[j]), None)
            t0 = times[lo][1] if lo is not None else 0.0
            t1 = times[hi][0] if hi is not None else t_end
            n = (hi if hi is not None else len(s)) - (lo + 1 if lo is not None else 0)
            pos = i - (lo + 1 if lo is not None else 0)
            step = (t1 - t0) / max(n, 1)
            times[i] = (t0 + pos * step, t0 + (pos + 1) * step)
    return times
