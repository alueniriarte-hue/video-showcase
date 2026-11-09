"""QA técnico de un render (no aprueba nada: la aprobación final es humana).

Uso: python scripts/qa.py <video.mp4> projects/<proyecto> [--tag largo]   -> work/<proyecto>/<tag>/qa.json
Checks:
  formato     1080x1920, 30 fps, H.264 + AAC, duración = props ± 0,1 s
  audio       loudness integrado −14 ± 1 LUFS, true peak ≤ −1 dBTP
  sincronía   ASR sobre la voz sola; error de inicio por palabra (objetivo: mediana ≤ 80 ms)
  evidencia   toda cifra dicha tiene origen declarado en "evidence" del guion
  privacidad  ninguna palabra de work/privacidad.txt (lista local de nombres/datos a vigilar) aparece en guion ni props
"""
import json
import statistics
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build import spoken_numbers  # noqa: E402
from common import CFG, ROOT, norm, read_mono  # noqa: E402


def main(argv):
    if len(argv) < 3:
        raise SystemExit(__doc__)
    render, proj = Path(argv[1]), Path(argv[2]).resolve()
    tag = argv[argv.index("--tag") + 1] if "--tag" in argv else "largo"
    work = ROOT / "work" / proj.name / tag
    props = json.loads((work / "props.json").read_text(encoding="utf-8"))
    out = {"render": str(render), "voz": props["voice"], "checks": {}}
    pr = json.loads(subprocess.run([CFG["ffprobe"], "-v", "error", "-show_streams", "-show_format", "-of", "json", str(render)], capture_output=True, text=True).stdout)
    v = next(s for s in pr["streams"] if s["codec_type"] == "video")
    a = next((s for s in pr["streams"] if s["codec_type"] == "audio"), None)
    dur = float(pr["format"]["duration"])
    out["checks"]["formato"] = {"ok": v["width"] == 1080 and v["height"] == 1920 and v["r_frame_rate"] == "30/1" and v["codec_name"] == "h264"
                                and a is not None and abs(dur - props["duration_s"]) <= 0.1, "w": v["width"], "h": v["height"],
                                "fps": v["r_frame_rate"], "dur_s": round(dur, 3), "props_s": props["duration_s"]}
    meas = subprocess.run([CFG["ffmpeg"], "-hide_banner", "-nostats", "-i", str(render), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    integ = [float(x.split("I:")[1].split()[0]) for x in meas.splitlines() if " I:" in x and "LUFS" in x][-1]
    peak = [float(x.split("Peak:")[1].split()[0]) for x in meas.splitlines() if "Peak:" in x][-1]
    out["checks"]["audio"] = {"ok": abs(integ + 14) <= 1.0 and peak <= -1.0, "lufs": integ, "true_peak_dbtp": peak}
    if props["voice"] != "BORRADOR":
        from align import asr_words
        asr = asr_words(read_mono(work / "voice-only.wav", 16000))
        caps = props["captions"]
        errs, j = [], 0
        for c in caps:
            nc = norm(c["text"])
            for k in range(j, min(j + 6, len(asr))):
                if nc and norm(asr[k]["word"]) == nc:
                    errs.append(abs(asr[k]["start"] * 1000 - c["startMs"]))
                    j = k + 1
                    break
        med = statistics.median(errs) if errs else None
        out["checks"]["sincronia"] = {"ok": med is not None and med <= 80 and len(errs) >= 0.8 * len(caps), "palabras": len(caps), "emparejadas": len(errs),
                                      "mediana_ms": round(med, 1) if med is not None else None}
    script_like = {"scenes": [{"lines": [ln["text"] for ln in s["lines"]]} for s in props["scenes"]], "evidence": props.get("evidence", {})}
    missing = spoken_numbers(script_like)
    out["checks"]["evidencia"] = {"ok": not missing, "sin_origen": missing, "declaradas": props.get("evidence", {})}
    priv = ROOT / "work" / "privacidad.txt"
    names = [x.strip().lower() for x in priv.read_text(encoding="utf-8").splitlines() if x.strip()] if priv.exists() else []
    blob = json.dumps(props, ensure_ascii=False).lower()
    hits = [x for x in names if x in blob]
    out["checks"]["privacidad"] = {"ok": not hits, "lista_local": priv.exists(), "coincidencias": len(hits),
                                   "nota": "La revisión visual cuadro a cuadro sigue siendo humana."}
    out["ok_tecnico"] = all(c["ok"] for c in out["checks"].values())
    (work / "qa.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(out, ensure_ascii=False, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
