"""Tests de la lógica pura del pipeline: validación del guion, grilla musical, beats, cifras con origen y versión corta."""
import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from build import layout, spoken_numbers, validate  # noqa: E402
from make_short import make_short  # noqa: E402


def words(text, step=0.3):
    return [{"text": w, "start": round(i * step, 3), "end": round((i + 1) * step, 3)} for i, w in enumerate(text.split())]


def audio_for(lines):
    return {ln: {"dur": len(ln.split()) * 0.3, "words": words(ln)} for ln in lines}


def test_validate_acepta_un_guion_minimo():
    sc = {"scenes": [{"id": "a", "type": "intro", "lines": ["Hola"], "beats": {}}]}
    assert validate(sc) == []


def test_validate_detecta_tipos_pasos_y_datos_faltantes():
    sc = {"chapters": [{"n": 1, "act": "fantasma", "label": "X"}],
          "scenes": [{"id": "a", "type": "inventado", "lines": []}, {"id": "b", "type": "scan", "step": 2, "lines": []}]}
    errs = " | ".join(validate(sc))
    assert "tipo desconocido" in errs
    assert "1..N" in errs
    assert "acto inexistente" in errs
    assert "dataset.scan" in errs


def test_validate_limita_el_diseno_a_cinco_nodos():
    sc = {"scenes": [{"id": "d", "type": "design", "lines": [], "params": {"nodes": [{}] * 6}}]}
    assert any("5 nodos" in e for e in validate(sc))


def test_layout_redondea_a_la_grilla_y_ata_los_beats_a_la_palabra():
    lines = ["Cargás los pedidos del día.", "La IA los valida."]
    sc = [{"id": "s1", "type": "input", "lines": lines, "beats": {"drop": "pedidos", "ia": "IA"}}]
    out = layout(sc, audio_for(lines), bpm=120)
    s = out[0]
    assert s["dur"] % 0.5 == pytest.approx(0, abs=1e-9), "duración múltiplo del pulso (120 BPM = 0,5 s)"
    assert s["beats"]["drop"] == pytest.approx(0.35 + 2 * 0.3), "PRE + tercera palabra"
    assert s["beats"]["ia"] > s["beats"]["drop"]


def test_layout_se_detiene_si_el_beat_no_esta_en_la_locucion():
    lines = ["Hola equipo."]
    with pytest.raises(SystemExit):
        layout([{"id": "x", "type": "intro", "lines": lines, "beats": {"k": "inexistente"}}], audio_for(lines), bpm=120)


def test_spoken_numbers_ignora_ordinales_de_paso_y_respeta_la_evidencia():
    sc = {"scenes": [{"lines": ["Paso tres: quedan diecisiete pedidos de doscientos."]}], "evidence": {"doscientos": "ILUSTRATIVO"}}
    missing = spoken_numbers(sc)
    assert "tres" not in missing
    assert "doscientos" not in missing


def test_make_short_fusiona_bloques_short_y_renumera_pasos():
    long = {"id": "demo", "title": "Demo", "chapters": [{"n": 1, "act": "a", "label": "A"}], "scenes": [
        {"id": "op", "type": "opener", "lines": ["Hola."]},
        {"id": "in", "type": "intro", "lines": ["Agenda."]},
        {"id": "p1", "type": "input", "step": 1, "lines": ["Largo uno."], "short": {"lines": ["Corto uno."], "beats": {}}},
        {"id": "p2", "type": "check", "step": 2, "lines": ["Largo dos."], "short": False},
        {"id": "p3", "type": "scan", "step": 3, "lines": ["Largo tres."], "short": {"lines": ["Corto tres."]}},
        {"id": "out", "type": "outro", "lines": []},
    ]}
    sh = make_short(long)
    ids = [s["id"] for s in sh["scenes"]]
    assert ids == ["op", "p1", "p3", "out"]
    assert [s.get("step") for s in sh["scenes"] if s.get("step")] == [1, 2]
    assert sh["scenes"][1]["lines"] == ["Corto uno."]
    assert sh["chapters"] == []


def test_el_ejemplo_incluido_es_valido():
    for name in ("script.json",):
        sc = json.loads((ROOT / "examples" / "pedidos" / name).read_text(encoding="utf-8"))
        assert validate(sc) == [], name
        assert spoken_numbers(sc) == [], "toda cifra del ejemplo declara su origen"


def test_el_corto_del_ejemplo_es_valido_y_sin_cifras_sueltas():
    long = json.loads((ROOT / "examples" / "pedidos" / "script.json").read_text(encoding="utf-8"))
    sh = make_short(long)
    assert validate(sh) == []
    assert spoken_numbers(sh) == []
    types = [s["type"] for s in sh["scenes"]]
    assert "intro" not in types and "design" not in types, "el corto no lleva agenda ni diseño"
    assert types.index("scan") + 1 == types.index("review"), "sin corte entre la lista y la revisión"
