"""Arma un video showcase desde su guion: locución, tiempos por palabra, escenas en grilla musical, música, SFX y mezcla.

Uso (desde la raíz del repo):
  python scripts/build.py projects/<proyecto>                      # versión larga (script.json)
  python scripts/build.py projects/<proyecto> --script script-corto.json --tag corto
  python scripts/build.py projects/<proyecto> --draft              # sin voz (2,6 palabras/s): para revisar la composición rápido
Entradas: <proyecto>/script.json (+ theme.json). Voz de referencia: voice/<voz>.wav + .txt (por defecto locutor-ar).
Salidas: work/<proyecto>/<tag>/{mix.wav, props.json, timeline.txt, voice-only.wav, music-only.wav} y video/public/audio/<proyecto>-<tag>.wav.
Reglas: la narración manda el tiempo; cada escena se redondea hacia arriba a la grilla de pulsos del BPM; cada beat visual se ata a la
primera palabra de la escena que empieza así (si no está, el build se detiene); las cifras dichas deberían estar en "evidence".
"""
import hashlib
import json
import math
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import CFG, ROOT, SR, lufs, movavg, norm, read_mono, safe_out, write_wav  # noqa: E402

PRE, GAP, POST = 0.35, 0.5, 0.75
TARGET_LUFS = -14.0
KNOWN = {"opener", "intro", "before", "turn", "design", "input", "process", "check", "table-check", "scan", "review", "learn",
         "deliver", "impact", "close", "outro"}
NEEDS_SCAN = {"scan", "review", "deliver"}
NUMBER_WORDS = {"cero", "uno", "una", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "quince",
                "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa", "cien", "ciento", "doscientos",
                "trescientos", "cuatrocientos", "quinientos", "mil", "millon", "millones", "hora", "horas", "minuto", "minutos", "porciento"}
ORDINAL_OK = {"uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez"}  # "Paso tres": no es una cifra


# ------------------------------------------------------------------ validación (pura)
def validate(sc: dict) -> list:
    """Errores del guion (lista vacía = válido)."""
    err = []
    scenes = sc.get("scenes") or []
    if not scenes:
        return ["el guion no tiene escenas"]
    ids = [s.get("id") for s in scenes]
    if len(set(ids)) != len(ids):
        err.append("hay ids de escena repetidos")
    for s in scenes:
        sid = s.get("id", "?")
        if s.get("type") not in KNOWN:
            err.append(f"[{sid}] tipo desconocido: {s.get('type')} (válidos: {', '.join(sorted(KNOWN))})")
        if not isinstance(s.get("lines", []), list) or not all(isinstance(x, str) for x in s.get("lines", [])):
            err.append(f"[{sid}] 'lines' tiene que ser una lista de frases")
        for k, v in (s.get("beats") or {}).items():
            if not isinstance(v, str) or not v.strip():
                err.append(f"[{sid}] beat '{k}' tiene que ser una palabra de la locución")
        if s.get("type") == "design" and len((s.get("params") or {}).get("nodes", [])) > 5:
            err.append(f"[{sid}] el diseño admite hasta 5 nodos (más se vuelve largo)")
    steps = sorted({s["step"] for s in scenes if s.get("step") is not None})
    if steps and steps != list(range(1, len(steps) + 1)):
        err.append(f"los pasos tienen que ser 1..N sin saltos (hay {steps})")
    acts = {s.get("act") for s in scenes}
    for ch in sc.get("chapters") or []:
        if ch.get("act") not in acts:
            err.append(f"capítulo '{ch.get('label')}' apunta a un acto inexistente: {ch.get('act')}")
    if any(s.get("type") in NEEDS_SCAN for s in scenes):
        scan = (sc.get("dataset") or {}).get("scan")
        if not scan or "total" not in scan or "auto" not in scan:
            err.append("las escenas scan/review/deliver necesitan dataset.scan con total y auto")
        elif scan["auto"] > scan["total"]:
            err.append("dataset.scan: auto no puede ser mayor que total")
    return err


def spoken_numbers(sc: dict) -> list:
    """Palabras numéricas o cifras dichas en la locución que no están cubiertas por 'evidence' (se ignoran los ordinales de "Paso N")."""
    ev = " ".join(norm(w) for k in (sc.get("evidence") or {}) for w in k.split())
    out = []
    for s in sc.get("scenes", []):
        for ln in s.get("lines", []):
            toks = [norm(t) for t in ln.split()]
            for i, t in enumerate(toks):
                if not t:
                    continue
                is_num = t.isdigit() or t in NUMBER_WORDS
                if not is_num:
                    continue
                if t in ORDINAL_OK and i > 0 and toks[i - 1] == "paso":
                    continue
                if t not in ev.split():
                    out.append(t)
    return sorted(set(out))


# ------------------------------------------------------------------ armado en la grilla (puro)
def layout(scene_defs: list, audio: dict, bpm: int) -> list:
    """audio[texto] = {"dur": s, "words": [{"text","start","end"}]} -> escenas con start, dur, lines y beats (segundos de la escena)."""
    beat_s = 60.0 / bpm
    out, t0 = [], 0.0
    for sc in scene_defs:
        t, placed = PRE, []
        for ln in sc.get("lines", []):
            placed.append({"text": ln, "start": round(t, 3), "dur": round(audio[ln]["dur"], 3)})
            t += audio[ln]["dur"] + GAP
        narr_end = t - GAP
        dur = max(narr_end + sc.get("post", POST), sc.get("min_s", 0), beat_s)
        dur = math.ceil(dur / beat_s - 1e-6) * beat_s
        words = [(norm(w["text"]), ln["start"] + w["start"]) for ln in placed for w in audio[ln["text"]]["words"]]
        beats = {}
        for k, pref in (sc.get("beats") or {}).items():
            hit = next((tm for w, tm in words if w.startswith(norm(pref))), None)
            if hit is None:
                raise SystemExit(f"[{sc['id']}] beat '{k}': la palabra '{pref}' no está en la locución de la escena")
            beats[k] = round(float(hit), 3)
        out.append({"id": sc["id"], "act": sc.get("act", sc["id"]), "type": sc["type"], "step": sc.get("step"), "step_label": sc.get("step_label"),
                    "params": sc.get("params", {}), "start": round(t0, 3), "dur": round(dur, 3), "lines": placed, "beats": beats})
        t0 += dur
    return out


# ------------------------------------------------------------------ locución
def tts(texts, voice):
    ref = ROOT / "voice" / f"{voice}.wav"
    ref_txt = ROOT / "voice" / f"{voice}.txt"
    if not ref.exists():
        raise SystemExit(f"falta la voz de referencia {ref}")
    out = ROOT / "work" / "_voz" / voice
    out.mkdir(parents=True, exist_ok=True)
    key = lambda t: hashlib.sha1(f"{voice}|{t}".encode()).hexdigest()[:16]  # noqa: E731
    req = [{"id": key(t), "text": t} for t in dict.fromkeys(texts)]
    rq = out / "_pedido.json"
    rq.write_text(json.dumps(req, ensure_ascii=False), encoding="utf-8")
    env = {**__import__("os").environ, "HF_HOME": CFG["hf_home"], "SHOWCASE_TTS_DEVICE": CFG["tts_device"]}
    subprocess.run([CFG["tts_python"], str(ROOT / "scripts" / "tts_qwen.py"), "lines", str(ref), str(ref_txt), str(rq), str(out)], check=True, env=env)
    return {t: out / f"{key(t)}.wav" for t in texts}, out


def clean_line(p):
    """48 kHz mono, recorta silencios de punta y normaliza a un RMS de voz común."""
    x = read_mono(p)
    win = int(0.01 * SR)
    env = np.sqrt(np.convolve(x ** 2, np.ones(win) / win, mode="same"))
    on = np.where(env > 10 ** (-42 / 20))[0]
    if len(on):
        a, b = max(0, on[0] - int(0.05 * SR)), min(len(x), on[-1] + int(0.08 * SR))
        x = x[a:b]
    rms = np.sqrt(np.mean(x[np.abs(x) > 1e-3] ** 2)) or 1.0
    x = x * (0.1 / rms)
    fade = int(0.01 * SR)
    x[:fade] *= np.linspace(0, 1, fade)
    x[-fade:] *= np.linspace(1, 0, fade)
    return x.astype(np.float32)


def word_times(text, x48):
    from align import align, asr_words
    toks = text.split()
    tm = align(toks, asr_words(x48[::3].copy(), text))
    return [{"text": t, "start": round(a, 3), "end": round(b, 3)} for t, (a, b) in zip(toks, tm)]


# ------------------------------------------------------------------ SFX sintetizados (sin whoosh entre escenas: suena feo)
def _env(ln, dec):
    t = np.arange(int(ln * SR)) / SR
    return t, np.exp(-t / dec)


def sfx(kind):
    rng = np.random.default_rng(sum(map(ord, kind)))
    if kind == "click":
        t, e = _env(0.06, 0.008)
        return 0.35 * np.sin(2 * np.pi * 2400 * t) * e + 0.15 * rng.normal(0, 1, len(t)) * np.exp(-t / 0.002)
    if kind == "ok":
        out = np.zeros(int(0.9 * SR))
        for i, f in enumerate((880.0, 1318.5)):
            t, e = _env(0.7, 0.25)
            a = int(i * 0.09 * SR)
            out[a:a + len(t)] += 0.22 * (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * e * np.minimum(1, t / 0.004)
        return out
    if kind == "data":
        out = np.zeros(int(1.6 * SR))
        for i in range(48):
            t, e = _env(0.012, 0.003)
            a = int(i * 1.6 / 48 * SR)
            out[a:a + len(t)] += 0.12 * np.sin(2 * np.pi * (3000 + 900 * (i % 5)) * t) * e
        return out
    if kind == "error":
        t, e = _env(0.5, 0.18)
        return 0.25 * np.sign(np.sin(2 * np.pi * 180 * t)) * e * 0.5 + 0.2 * np.sin(2 * np.pi * 120 * t) * e
    if kind == "drop":
        t, e = _env(0.25, 0.05)
        return 0.3 * np.sin(2 * np.pi * np.cumsum(500 - 300 * t / t[-1]) / SR) * e
    raise ValueError(kind)


SFX_MAP = {  # tipo de escena -> [(beat, sfx, desplazamiento_s)]
    "before": [("mismatch", "error", 0.05)],
    "input": [("drop", "drop", 0.35), ("click", "click", 0.55)],
    "process": [("count", "data", 0.0)],
    "check": [("ok", "ok", 0.1)],
    "table-check": [("compare", "ok", 0.4)],
    "scan": [("scan", "data", 0.2), ("amber", "click", 0.0)],
    "review": [("open", "click", 0.1), ("fix", "click", 0.35), ("ok", "click", 0.0), ("ok", "ok", 0.15)],
    "learn": [("next", "ok", 0.0)],
    "deliver": [("load", "ok", 0.3)],
}


# ------------------------------------------------------------------ principal
def main(argv):
    if len(argv) < 2:
        raise SystemExit(__doc__)
    proj = Path(argv[1]).resolve()
    script_name = argv[argv.index("--script") + 1] if "--script" in argv else "script.json"
    tag = argv[argv.index("--tag") + 1] if "--tag" in argv else "largo"
    voice = argv[argv.index("--voice") + 1] if "--voice" in argv else "locutor-ar"
    draft = "--draft" in argv
    sc_def = json.loads((proj / script_name).read_text(encoding="utf-8"))
    errs = validate(sc_def)
    if errs:
        raise SystemExit("guion inválido:" + "".join(f"{chr(10)}  - {e}" for e in errs))
    missing = spoken_numbers(sc_def)
    if missing:
        print(f"AVISO: cifras dichas sin origen en 'evidence': {', '.join(missing)} (el QA final lo marca como error)")
    theme_path = proj / "theme.json"
    theme_input = json.loads(theme_path.read_text(encoding="utf-8")) if theme_path.exists() else sc_def.get("theme", {"preset": "nocturno"})
    if theme_path.exists():
        r = subprocess.run(["node", str(ROOT / "video" / "scripts" / "theme-check.ts"), str(theme_path)], capture_output=True, text=True, cwd=ROOT / "video")
        if r.returncode == 0 and r.stdout.strip():
            chk = json.loads(r.stdout.strip().splitlines()[-1])
            for w in chk.get("warnings", []):
                print(f"AVISO de color: {w}")
    fps, bpm = sc_def.get("format", {}).get("fps", 30), sc_def.get("bpm", 120)
    work = safe_out(ROOT / "work" / proj.name / tag / "x").parent
    texts = [ln for sc in sc_def["scenes"] for ln in sc.get("lines", [])]
    audio = {}
    if draft:
        voice = "BORRADOR"
        for t in texts:
            toks = t.split()
            d = len(toks) / 2.6
            ws = [{"text": w, "start": round(i * d / len(toks), 3), "end": round((i + 1) * d / len(toks), 3)} for i, w in enumerate(toks)]
            audio[t] = {"x": np.zeros(int(d * SR), dtype=np.float32), "dur": d, "words": ws}
    else:
        wavs, cache_dir = tts(texts, voice)
        cache = cache_dir / "_palabras.json"
        wcache = json.loads(cache.read_text(encoding="utf-8")) if cache.exists() else {}
        for t in texts:
            x = clean_line(wavs[t])
            k = f"{wavs[t].stem}:{len(x)}"
            if k not in wcache:
                wcache[k] = word_times(t, x)
            audio[t] = {"x": x, "dur": len(x) / SR, "words": wcache[k]}
        cache.write_text(json.dumps(wcache, ensure_ascii=False, indent=1), encoding="utf-8")

    scenes = layout(sc_def["scenes"], audio, bpm)
    total = round(scenes[-1]["start"] + scenes[-1]["dur"], 3)
    captions = []
    for s in scenes:
        for li, ln in enumerate(s["lines"]):
            ws = audio[ln["text"]]["words"]
            for i, w in enumerate(ws):
                st = s["start"] + ln["start"] + w["start"]
                en = s["start"] + ln["start"] + (ws[i + 1]["start"] if i + 1 < len(ws) else w["end"])
                captions.append({"text": w["text"], "startMs": round(st * 1000), "endMs": round(en * 1000), "line": f"{s['id']}-{li}"})

    # ---- mezcla: voz + música (baja bajo la voz) + SFX, a −14 LUFS
    import music
    n = int(total * SR)
    vox = np.zeros(n, dtype=np.float32)
    for s in scenes:
        for ln in s["lines"]:
            x = audio[ln["text"]]["x"]
            a = int((s["start"] + ln["start"]) * SR)
            vox[a:a + len(x)] += x[: max(0, n - a)]
    beat_s = 60.0 / bpm
    hits = [s["start"] + s["beats"][k] for s in scenes for ty, k in (("turn", "flip"), ("close", "title"), ("opener", "title"))
            if s["type"] == ty and k in s["beats"]]
    hits = [round(d / beat_s) * beat_s for d in hits]
    mus = music.build(total, [(s["start"], s["start"] + s["dur"], s["type"]) for s in scenes], bpm, hits)
    mus = np.pad(mus, (0, max(0, n - len(mus))))[:n]
    env = movavg(np.abs(vox), int(0.3 * SR))
    present = movavg((env > 0.01).astype(np.float32), int(0.4 * SR))
    duck = 1.0 - 0.62 * np.clip(present * 1.4, 0, 1)
    fx = np.zeros(n, dtype=np.float32)
    events = []
    for s in scenes:
        for bk, kind, off in SFX_MAP.get(s["type"], []):
            if bk in s["beats"]:
                tt = s["start"] + s["beats"][bk] + off
                x = sfx(kind)
                a = int(tt * SR)
                fx[a:a + len(x)] += x[: max(0, n - a)]
                events.append({"t": round(tt, 3), "sfx": kind, "scene": s["id"]})
    mix = 1.0 * vox + 0.42 * mus * duck + 0.5 * fx
    raw = work / "mix.raw.wav"
    write_wav(raw, mix / (np.max(np.abs(mix)) or 1) * 0.7)
    dst = work / "mix.wav"
    gain, src = 0.0, raw
    for _ in range(4):  # el limitador corre el integrado: se mide la SALIDA y se corrige hasta quedar a ±0,3 LU
        integ = lufs(src)
        if src == dst and abs(integ - TARGET_LUFS) <= 0.3:
            break
        gain += TARGET_LUFS - integ
        subprocess.run([CFG["ffmpeg"], "-v", "error", "-y", "-i", str(raw), "-af", f"volume={gain:.2f}dB,alimiter=limit=0.89:attack=4:release=60:level=disabled",
                        "-ar", str(SR), "-ac", "2", str(dst)], check=True)
        src = dst
    raw.unlink()
    write_wav(work / "voice-only.wav", vox / (np.max(np.abs(vox)) or 1) * 0.8)
    write_wav(work / "music-only.wav", mus * 0.8)
    audio_name = f"{proj.name}-{tag}.wav"
    shutil.copyfile(dst, safe_out(ROOT / "video" / "public" / "audio" / audio_name))
    props = {"id": sc_def.get("id", proj.name), "title": sc_def.get("title", proj.name), "fps": fps, "bpm": bpm, "duration_s": total,
             "durationInFrames": int(round(total * fps)), "audio": f"audio/{audio_name}", "voice": voice,
             "voice_note": f"Voz sintética (Qwen3-TTS, local): '{voice}'. No es una persona real.",
             "publication": sc_def.get("publication", ""), "chapters": sc_def.get("chapters", []), "scenes": scenes, "captions": captions,
             "sfx": events, "theme_input": theme_input, "dataset": sc_def.get("dataset", {}), "evidence": sc_def.get("evidence", {})}
    (work / "props.json").write_text(json.dumps(props, ensure_ascii=False, indent=1), encoding="utf-8")
    lines = [f"{proj.name} · {tag} · voz {voice} · {total:.2f} s ({props['durationInFrames']} cuadros) · {bpm} BPM"]
    for s in scenes:
        lines.append(f"{s['start']:7.2f} +{s['dur']:5.2f}  {s['type']:11} {s['id']:22} {s['beats']}")
    (work / "timeline.txt").write_text(chr(10).join(lines), encoding="utf-8")
    print(chr(10).join(lines))
    print(f"props: {work / 'props.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
