"""Analiza una grabación del proceso (el ANTES o el AHORA) para que el guion y las animaciones se basen en lo real.

Uso:
  python scripts/analyze_video.py <grabación> --as antes|ahora --project projects/<proyecto> [--every 10] [--threshold 0.1] [--no-audio]
Salida (en work/<proyecto>/analisis/<antes|ahora>/, fuera de git):
  info.json              duración, resolución, fps, si tiene audio
  cuadros/               cuadros en los cambios de pantalla (umbral --threshold; más bajo = más cuadros) + uno cada --every s,
                         con su minuto y segundo en el nombre (01m23.40s.png)
  plancha_NN.png         planchas de 12 cuadros para mirar de un vistazo
  transcripcion.md/json  lo que se dice, con tiempos (faster-whisper local), si hay audio
  analisis.md            plantilla que completa el agente: pasos observados, tiempos reales, cifras en pantalla, textos a recrear,
                         y DATOS SENSIBLES vistos (que NO deben ir al video)
La grabación original no se modifica ni se copia: solo se lee.
"""
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import CFG, ROOT, read_mono, safe_out  # noqa: E402

TEMPLATE = """# Análisis de la grabación · {label}

Fuente: `{src}` ({dur:.0f} s, {w}x{h}). Cuadros: `cuadros/` · planchas: `plancha_*.png` · transcripción: `transcripcion.md`.
Completar mirando las planchas y la transcripción. Todo lo que se use en el guion como REAL tiene que salir de acá, con su segundo.

## Pasos observados (en orden)
| # | Segundo | Qué se ve en pantalla | Qué hace la persona | Duración aprox. |
| --- | --- | --- | --- | --- |
| 1 |  |  |  |  |

## Tiempos reales medidos (para el "acelerado ×N" y el impacto)
- Inicio del procesamiento: s · fin: s · duración:
- Tiempo total de la tarea en la grabación:

## Cifras visibles en pantalla (REAL, con su segundo)
-

## Textos de interfaz a recrear (nombres de botones, columnas, estados; SIN datos de clientes)
-

## Dolores visibles del proceso (para el "antes")
-

## Datos sensibles vistos (NO van al video: nombres, documentos, importes, correos, teléfonos)
-
"""


def probe(src: Path) -> dict:
    pr = json.loads(subprocess.run([CFG["ffprobe"], "-v", "error", "-show_streams", "-show_format", "-of", "json", str(src)], capture_output=True, text=True).stdout)
    v = next(s for s in pr["streams"] if s["codec_type"] == "video")
    a = next((s for s in pr["streams"] if s["codec_type"] == "audio"), None)
    num, den = (v.get("avg_frame_rate") or "30/1").split("/")
    return {"dur_s": float(pr["format"]["duration"]), "w": v["width"], "h": v["height"], "fps": round(float(num) / max(1.0, float(den)), 2), "audio": a is not None}


def main(argv):
    if len(argv) < 2 or "--as" not in argv or "--project" not in argv:
        raise SystemExit(__doc__)
    src = Path(argv[1]).resolve()
    label = argv[argv.index("--as") + 1]
    proj = Path(argv[argv.index("--project") + 1]).resolve()
    every = float(argv[argv.index("--every") + 1]) if "--every" in argv else 10.0
    thr = float(argv[argv.index("--threshold") + 1]) if "--threshold" in argv else 0.1
    out = safe_out(ROOT / "work" / proj.name / "analisis" / label / "x").parent
    info = probe(src)
    info["fuente"] = str(src)
    (out / "info.json").write_text(json.dumps(info, ensure_ascii=False, indent=1), encoding="utf-8")
    fr = out / "cuadros"
    fr.mkdir(exist_ok=True)
    # cambios de pantalla (umbral thr) + respaldo periódico; el nombre lleva el minuto y segundo del original
    # (un cambio cuenta si pasó al menos 0,8 s desde el cuadro anterior: así una transición no deja 5 cuadros casi iguales)
    vf = f"select='isnan(prev_selected_t)+gt(scene,{thr})*gte(t-prev_selected_t,0.8)+gte(t-prev_selected_t,{every})',scale=720:-2,showinfo"
    for old in fr.glob("*.png"):  # re-análisis: empezar limpio
        old.unlink()
    r = subprocess.run([CFG["ffmpeg"], "-hide_banner", "-i", str(src), "-vf", vf, "-fps_mode", "vfr", str(fr / "c_%04d.png")], capture_output=True, text=True)
    times = [float(x.split("pts_time:")[1].split()[0]) for x in r.stderr.splitlines() if "pts_time:" in x]
    files = sorted(fr.glob("c_*.png"))
    for f, t in zip(files, times):
        dst = fr / f"{int(t // 60):02d}m{t % 60:05.2f}s.png"
        if dst.exists():
            f.unlink()
        else:
            f.rename(dst)
    files = sorted(fr.glob("*.png"))[:240]
    for k in range(0, len(files), 12):
        chunk = files[k:k + 12]
        lst = out / "_lista.txt"
        lst.write_text("".join(f"file '{f.as_posix()}'{chr(10)}" for f in chunk), encoding="utf-8")
        subprocess.run([CFG["ffmpeg"], "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-vf", "scale=360:-2,tile=4x3", "-frames:v", "1",
                        str(out / f"plancha_{k // 12 + 1:02d}.png")], check=True)
        lst.unlink()
    if info["audio"] and "--no-audio" not in argv:
        from align import asr_words
        words = asr_words(read_mono(src, 16000), prompt=None)
        (out / "transcripcion.json").write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding="utf-8")
        lines, cur, t0 = [], [], None
        for w in words:
            t0 = w["start"] if t0 is None else t0
            cur.append(w["word"])
            if w["word"].endswith((".", "?", "!")) or len(cur) >= 18:
                lines.append(f"- [{int(t0 // 60):02d}:{t0 % 60:04.1f}] {' '.join(cur)}")
                cur, t0 = [], None
        if cur:
            lines.append(f"- [{int(t0 // 60):02d}:{t0 % 60:04.1f}] {' '.join(cur)}")
        (out / "transcripcion.md").write_text(f"# Transcripción · {label}{chr(10)}{chr(10)}" + chr(10).join(lines), encoding="utf-8")
    tpl = out / "analisis.md"
    if not tpl.exists():
        tpl.write_text(TEMPLATE.format(label=label, src=src.name, dur=info["dur_s"], w=info["w"], h=info["h"]), encoding="utf-8")
    print(f"{len(files)} cuadros · {len(list(out.glob('plancha_*.png')))} planchas · análisis en {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
