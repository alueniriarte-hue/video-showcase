"""Renderiza un proyecto y guarda la versión sin pisar ninguna anterior; arma planchas de cuadros para revisar.

Uso:
  python scripts/render.py projects/<proyecto> [--tag largo]            -> entregables/<proyecto>/vN/<proyecto>_<tag>_vN.mp4
  python scripts/render.py projects/<proyecto> --draft                  -> work/<proyecto>/<tag>/borrador.mp4 (mitad de resolución)
  python scripts/render.py --sheet <video.mp4> [--n 10]                 -> <video>_plancha.png (10 cuadros repartidos)
  python scripts/render.py --scenes <video.mp4> projects/<proyecto> [--tag largo]
                                                                        -> <video>_escenas_NN.png (2 cuadros por escena: armándose y completa)
Requiere haber corrido antes scripts/build.py (genera work/<proyecto>/<tag>/props.json).
"""
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import CFG, ROOT, safe_out  # noqa: E402


def contact_sheet(video: Path, n: int = 10, out: Path | None = None) -> Path:
    """Plancha de n cuadros repartidos (5 por fila, 360x640 cada uno)."""
    pr = json.loads(subprocess.run([CFG["ffprobe"], "-v", "error", "-show_format", "-of", "json", str(video)], capture_output=True, text=True).stdout)
    dur = float(pr["format"]["duration"])
    tmp = []
    for i in range(n):
        t = dur * (i + 0.5) / n
        f = video.parent / f"_plancha_{i:02d}.png"
        subprocess.run([CFG["ffmpeg"], "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", str(video), "-frames:v", "1", "-vf", "scale=360:640", str(f)], check=True)
        tmp.append(f)
    out = out or video.with_name(video.stem + "_plancha.png")
    cols = 5
    rows = (n + cols - 1) // cols
    subprocess.run([CFG["ffmpeg"], "-v", "error", "-y", "-i", str(video.parent / "_plancha_%02d.png"), "-vf", f"tile={cols}x{rows}", "-frames:v", "1", str(out)], check=True)
    for f in tmp:
        f.unlink()
    return out


def _grab(video: Path, t: float, dst: Path):
    subprocess.run([CFG["ffmpeg"], "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", str(video), "-frames:v", "1", "-vf", "scale=360:640", str(dst)], check=True)


def scene_sheets(video: Path, props_path: Path, per_sheet: int = 12) -> list:
    """Planchas por escena (orden de la línea de tiempo): para cada escena, un cuadro a mitad de la escena y otro con todo armado
    (después del último beat). 6 columnas x 2 filas por plancha = 6 escenas por plancha."""
    props = json.loads(Path(props_path).read_text(encoding="utf-8"))
    times = []
    for s in props["scenes"]:
        a, d = s["start"], s["dur"]
        last = max(s["beats"].values()) if s["beats"] else d * 0.6
        full = min(d - 0.2, max(last + 0.9, d * 0.8))
        times += [a + d * 0.45, a + full]
    out = []
    for k in range(0, len(times), per_sheet):
        chunk = times[k:k + per_sheet]
        for i, t in enumerate(chunk):
            _grab(video, t, video.parent / f"_esc_{i:02d}.png")
        dst = video.with_name(f"{video.stem}_escenas_{k // per_sheet + 1:02d}.png")
        cols = 6
        rows = (len(chunk) + cols - 1) // cols
        subprocess.run([CFG["ffmpeg"], "-v", "error", "-y", "-i", str(video.parent / "_esc_%02d.png"), "-vf", f"tile={cols}x{rows}", "-frames:v", "1", str(dst)],
                       check=True)
        for i in range(len(chunk)):
            (video.parent / f"_esc_{i:02d}.png").unlink()
        out.append(dst)
    return out


def main(argv):
    if "--scenes" in argv:
        v = Path(argv[argv.index("--scenes") + 1])
        proj = Path(argv[argv.index("--scenes") + 2]).resolve()
        tag = argv[argv.index("--tag") + 1] if "--tag" in argv else "largo"
        for p in scene_sheets(v, ROOT / "work" / proj.name / tag / "props.json"):
            print(p)
        return 0
    if "--sheet" in argv:
        v = Path(argv[argv.index("--sheet") + 1])
        n = int(argv[argv.index("--n") + 1]) if "--n" in argv else 10
        print(contact_sheet(v, n))
        return 0
    if len(argv) < 2:
        raise SystemExit(__doc__)
    proj = Path(argv[1]).resolve()
    tag = argv[argv.index("--tag") + 1] if "--tag" in argv else "largo"
    props = ROOT / "work" / proj.name / tag / "props.json"
    if not props.exists():
        raise SystemExit(f"falta {props}: correr antes scripts/build.py {argv[1]}" + (f" --tag {tag}" if tag != "largo" else ""))
    if "--draft" in argv:
        out = safe_out(ROOT / "work" / proj.name / tag / "borrador.mp4")
        extra = ["--scale=0.5"]
    else:
        base = ROOT / "entregables" / proj.name
        n = 1
        while (base / f"v{n}" / f"{proj.name}_{tag}_v{n}.mp4").exists():
            n += 1
        out = safe_out(base / f"v{n}" / f"{proj.name}_{tag}_v{n}.mp4")
        extra = []
    cmd = ["npx", "remotion", "render", "src/index.ts", "Showcase", str(out), f"--props={props}", "--timeout=120000", *extra]
    subprocess.run(cmd, check=True, cwd=ROOT / "video", shell=sys.platform == "win32")
    sheet = contact_sheet(out)
    scenes = scene_sheets(out, props)
    print(f"video: {out}")
    print(f"plancha: {sheet}")
    print("planchas por escena: " + ", ".join(str(p) for p in scenes))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
