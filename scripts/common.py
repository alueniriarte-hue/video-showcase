"""Utilidades compartidas: rutas del repo, configuración (FFmpeg, Python del TTS, caché de modelos) y audio.

Configuración (en orden de prioridad): variables de entorno > config.json en la raíz del repo > autodetección.
  SHOWCASE_FFMPEG / "ffmpeg"          ruta a ffmpeg (por defecto, el del PATH)
  SHOWCASE_FFPROBE / "ffprobe"        ruta a ffprobe (por defecto, junto a ffmpeg)
  SHOWCASE_TTS_PYTHON / "tts_python"  Python con qwen-tts instalado (por defecto, este mismo)
  HF_HOME / "hf_home"                 caché de modelos (por defecto, .cache/huggingface dentro del repo)
  SHOWCASE_TTS_DEVICE / "tts_device"  cpu | cuda | mps (por defecto, cpu)
"""
import json
import os
import shutil
import subprocess
import sys
import unicodedata
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SR = 48000


def config() -> dict:
    cfg = {}
    p = ROOT / "config.json"
    if p.exists():
        cfg = json.loads(p.read_text(encoding="utf-8-sig"))  # -sig: PowerShell 5 escribe UTF-8 con BOM

    def pick(key, env, default):
        return os.environ.get(env) or cfg.get(key) or default

    ffmpeg = pick("ffmpeg", "SHOWCASE_FFMPEG", shutil.which("ffmpeg") or "ffmpeg")
    probe_default = shutil.which("ffprobe") or str(Path(ffmpeg).with_name("ffprobe" + Path(ffmpeg).suffix))
    out = {
        "ffmpeg": ffmpeg,
        "ffprobe": pick("ffprobe", "SHOWCASE_FFPROBE", probe_default),
        "tts_python": pick("tts_python", "SHOWCASE_TTS_PYTHON", sys.executable),
        "hf_home": pick("hf_home", "HF_HOME", str(ROOT / ".cache" / "huggingface")),
        "tts_device": pick("tts_device", "SHOWCASE_TTS_DEVICE", "cpu"),
    }
    for k in ("ffmpeg", "ffprobe", "tts_python", "hf_home"):  # rutas relativas = relativas a la raíz del repo
        v = out[k]
        if ("/" in v or "\\" in v) and not Path(v).is_absolute():
            out[k] = str((ROOT / v).resolve())
    os.environ.setdefault("HF_HOME", out["hf_home"])
    return out


CFG = config()


def norm(w: str) -> str:
    """Normaliza una palabra para comparar (minúsculas, sin tildes ni signos)."""
    w = unicodedata.normalize("NFKD", w.lower())
    return "".join(c for c in w if c.isalnum() and not unicodedata.combining(c))


def read_mono(p, sr=SR) -> np.ndarray:
    r = subprocess.run([CFG["ffmpeg"], "-v", "error", "-i", str(p), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype=np.float32).copy()


def write_wav(p, x, ch=1):
    x16 = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(p), "wb") as f:
        f.setnchannels(ch)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes(x16.tobytes())


def lufs(p) -> float:
    meas = subprocess.run([CFG["ffmpeg"], "-hide_banner", "-nostats", "-i", str(p), "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    return [float(x.split("I:")[1].split()[0]) for x in meas.splitlines() if " I:" in x and "LUFS" in x][-1]


def movavg(x, k):
    """Media móvil centrada en O(n) por suma acumulada."""
    c = np.cumsum(np.concatenate([[0.0], x.astype(np.float64)]))
    idx = np.arange(len(x))
    lo = np.clip(idx - k // 2, 0, len(x))
    hi = np.clip(idx + k // 2 + 1, 0, len(x))
    return ((c[hi] - c[lo]) / np.maximum(1, hi - lo)).astype(np.float32)


def safe_out(p: Path) -> Path:
    """Solo se escribe dentro de work/, entregables/ o video/public/audio del repo (nunca sobre los videos de entrada)."""
    p = Path(p).resolve()
    allowed = [(ROOT / d).resolve() for d in ("work", "entregables", "video/public/audio")]
    if not any(p == a or a in p.parents for a in allowed):
        raise SystemExit(f"escritura fuera de las carpetas de salida: {p}")
    p.parent.mkdir(parents=True, exist_ok=True)
    return p
