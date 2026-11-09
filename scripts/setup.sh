#!/usr/bin/env bash
# Chequea (y con --install, instala) lo necesario para video-showcase en Mac o Linux.
#   bash scripts/setup.sh             -> solo chequea Node 22+, Python 3.12 y FFmpeg
#   bash scripts/setup.sh --install   -> además instala dependencias (pide confirmación: baja ~6 GB)
#   bash scripts/setup.sh --install --yes   -> sin preguntar
set -euo pipefail
cd "$(dirname "$0")/.."
INSTALL=0; YES=0
for a in "$@"; do
  case "$a" in --install) INSTALL=1 ;; --yes) YES=1 ;; esac
done
ok=1
say() { printf '%s\n' "$*"; }

if command -v node >/dev/null 2>&1; then
  NV=$(node -p 'process.versions.node.split(".")[0]')
  if [ "$NV" -ge 22 ]; then say "OK  Node $(node --version)"; else say "FALTA Node 22 o más (tenés $(node --version)): https://nodejs.org"; ok=0; fi
else say "FALTA Node 22 o más: https://nodejs.org"; ok=0; fi

PY=""
for c in python3.12 python3; do
  if command -v "$c" >/dev/null 2>&1 && "$c" -c 'import sys; sys.exit(0 if sys.version_info[:2]==(3,12) else 1)' 2>/dev/null; then PY="$c"; break; fi
done
if [ -n "$PY" ]; then say "OK  Python $($PY --version 2>&1 | cut -d' ' -f2) ($PY)"; else say "FALTA Python 3.12 (Mac: brew install python@3.12)"; ok=0; fi

if command -v ffmpeg >/dev/null 2>&1 && command -v ffprobe >/dev/null 2>&1; then say "OK  $(ffmpeg -version | head -n1 | cut -d' ' -f1-3)"
else say "FALTA FFmpeg con ffprobe (Mac: brew install ffmpeg)"; ok=0; fi

if [ "$INSTALL" -eq 0 ]; then
  [ "$ok" -eq 1 ] && say "Todo listo para instalar: bash scripts/setup.sh --install" || say "Instalá lo que falta y volvé a correr este chequeo."
  exit 0
fi
[ "$ok" -eq 1 ] || { say "No se puede instalar: falta algo de arriba."; exit 1; }

say ""
say "Se va a descargar e instalar (~6 GB en total):"
say "  - paquetes de npm de Remotion (~0,3 GB) en video/node_modules"
say "  - entorno del pipeline .venv (numpy, faster-whisper; ~0,2 GB)"
say "  - entorno de voz .venv-tts (torch, qwen-tts; ~2 GB)"
say "  - la primera vez que generes voz: modelo Qwen3-TTS Base 1.7B (~4,3 GB) y faster-whisper small (~0,5 GB)"
if [ "$YES" -eq 0 ]; then
  read -r -p "¿Seguimos? [s/N] " r
  case "$r" in s|S|si|sí|y|Y) ;; *) say "Cancelado."; exit 0 ;; esac
fi

(cd video && npm ci)
"$PY" -m venv .venv && .venv/bin/python -m pip install -r requirements.txt
"$PY" -m venv .venv-tts && .venv-tts/bin/python -m pip install -r requirements-tts.txt

if [ ! -f config.json ]; then
  DEV=cpu
  if [ "$(uname -s)" = "Darwin" ] && [ "$(uname -m)" = "arm64" ]; then DEV=mps; fi
  cat > config.json <<CFG
{
 "ffmpeg": "$(command -v ffmpeg)",
 "ffprobe": "$(command -v ffprobe)",
 "tts_python": ".venv-tts/bin/python",
 "hf_home": ".cache/huggingface",
 "tts_device": "$DEV"
}
CFG
  say "config.json creado (tts_device: $DEV)."
fi
say "Listo. Probá: .venv/bin/python scripts/build.py examples/pedidos --draft"
