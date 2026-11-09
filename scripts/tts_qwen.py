"""Locución con Qwen3-TTS (Apache-2.0, local). Timbre constante: todas las líneas se clonan desde una voz de referencia.

La voz de referencia incluida (voice/locutor-ar.wav + .txt) es SINTÉTICA: la diseñó el modelo VoiceDesign desde una descripción y se
regeneró con el modelo Base sobre una frase neutra (no es una persona real). Para usarla alcanza el modelo Base. Para diseñar
una voz propia: `design` (necesita VoiceDesign).

Uso (con el Python que tiene qwen-tts; ver config.json "tts_python"):
  python scripts/tts_qwen.py lines <ref.wav> <ref.txt> <pedido.json> <carpeta>   # [{"id","text"}] -> <carpeta>/<id>.wav (cachea)
  python scripts/tts_qwen.py design <carpeta> "<descripción de la voz>"          # candidata nueva -> <carpeta>/voz.wav + voz.txt
NUNCA clonar la voz de una persona real sin su consentimiento explícito.
"""
import json
import os
import sys
import time
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
from qwen_tts import Qwen3TTSModel

DESIGN = "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign"
BASE = "Qwen/Qwen3-TTS-12Hz-1.7B-Base"
LANG = os.environ.get("SHOWCASE_TTS_LANG", "Spanish")
SEED = 7
PROBE = ("Así se trabajaba antes: paso por paso, todo a mano. Hoy, con inteligencia artificial, "
         "el equipo revisa solo lo que necesita su criterio. Y en la operación, eso se nota.")


def local_snapshot(repo: str) -> str:
    """Ruta local del modelo si ya está en la caché (HF_HOME): así no se consulta internet. Si no, el id (se descarga)."""
    hub = Path(os.environ.get("HF_HOME", Path.home() / ".cache" / "huggingface")) / "hub" / ("models--" + repo.replace("/", "--")) / "snapshots"
    snaps = sorted(hub.iterdir()) if hub.exists() else []
    return str(snaps[-1]) if snaps else repo


def load(repo):
    repo = local_snapshot(repo)
    dev = os.environ.get("SHOWCASE_TTS_DEVICE", "cpu")
    if dev == "cpu":
        torch.set_num_threads(max(1, (os.cpu_count() or 6) - 1))
    dtype = torch.float32 if dev in ("cpu", "mps") else torch.bfloat16
    return Qwen3TTSModel.from_pretrained(repo, device_map=dev, dtype=dtype)


def design(out_dir: Path, instruct: str):
    out_dir.mkdir(parents=True, exist_ok=True)
    m = load(DESIGN)
    torch.manual_seed(SEED)
    wavs, sr = m.generate_voice_design(text=PROBE, language=LANG, instruct=instruct)
    sf.write(out_dir / "voz.wav", wavs[0], sr)
    (out_dir / "voz.txt").write_text(PROBE, encoding="utf-8")
    print(f"voz diseñada: {out_dir / 'voz.wav'}")


def lines(ref_wav: Path, ref_txt: Path, req: Path, out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    items = [it for it in json.loads(req.read_text(encoding="utf-8")) if not (out_dir / f"{it['id']}.wav").exists()]
    if not items:
        return
    m = load(BASE)
    prompt = m.create_voice_clone_prompt(ref_audio=str(ref_wav), ref_text=ref_txt.read_text(encoding="utf-8").strip())
    for k, it in enumerate(items, 1):
        torch.manual_seed(SEED)
        t1 = time.time()
        wavs, sr = m.generate_voice_clone(text=it["text"], language=LANG, voice_clone_prompt=prompt)
        x = np.asarray(wavs[0], dtype=np.float32)
        sf.write(out_dir / f"{it['id']}.wav", x, sr)
        print(f"[{k}/{len(items)}] {len(x) / sr:.1f} s de voz en {time.time() - t1:.0f} s", flush=True)


if __name__ == "__main__":
    a = sys.argv
    if len(a) >= 2 and a[1] == "lines":
        lines(Path(a[2]), Path(a[3]), Path(a[4]), Path(a[5]))
    elif len(a) >= 2 and a[1] == "design":
        design(Path(a[2]), a[3])
    else:
        raise SystemExit(__doc__)
