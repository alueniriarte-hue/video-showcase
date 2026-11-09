"""Genera la versión CORTA desde el guion largo (formato por defecto = largo; el corto se pide aparte).

Uso: python scripts/make_short.py projects/<proyecto>        -> projects/<proyecto>/script-corto.json
Reglas: cada escena del largo puede declarar "short": {lines, beats, params} (se fusiona) o "short": false (se quita).
Sin bloque "short": se quitan intro (agenda), design y close; opener/turn/outro se mantienen tal cual; el resto se quita.
Los pasos se renumeran 1..N y no hay capítulos (el corto no tiene agenda).
"""
import copy
import json
import sys
from pathlib import Path

KEEP_AS_IS = {"opener", "turn", "outro"}


def make_short(long: dict) -> dict:
    d = copy.deepcopy(long)
    out = []
    for s in long.get("scenes", []):
        sh = s.get("short")
        if sh is False:
            continue
        if isinstance(sh, dict):
            n = copy.deepcopy(s)
            n.pop("short", None)
            for k in ("lines", "beats"):
                if k in sh:
                    n[k] = sh[k]
            n["params"] = {**n.get("params", {}), **sh.get("params", {})}
            for k in ("post", "min_s"):
                if k in sh:
                    n[k] = sh[k]
            out.append(n)
        elif s.get("type") in KEEP_AS_IS:
            n = copy.deepcopy(s)
            n.pop("short", None)
            out.append(n)
    step_map, k = {}, 0
    for s in out:
        st = s.get("step")
        if st is not None:
            if st not in step_map:
                k += 1
                step_map[st] = k
            s["step"] = step_map[st]
    d["scenes"] = out
    d["chapters"] = []
    d["id"] = f"{long.get('id', 'video')}-corto"
    d["title"] = f"{long.get('title', '')} (corto)".strip()
    return d


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    proj = Path(sys.argv[1])
    long = json.loads((proj / "script.json").read_text(encoding="utf-8"))
    short = make_short(long)
    dst = proj / "script-corto.json"
    dst.write_text(json.dumps(short, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{dst}: {len(short['scenes'])} escenas (de {len(long['scenes'])})")
