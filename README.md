# video-showcase

Skill y motor para hacer **videos verticales (9:16) de "antes y después" de un proceso con IA**: contás la idea, el
agente (Codex o Claude Code) arma el guion, te lo muestra para aprobar, y después genera voz, música, animaciones,
subtítulos y un QA técnico. Todo corre en tu máquina.

- **Largo por defecto** (2–3 min, detallado, para dirección); **corto a pedido** (≈ 45–75 s).
- El control humano es el protagonista: la IA hace el volumen y el criterio del experto decide las excepciones.
- Puede analizar grabaciones de pantalla del proceso anterior y del actual para que el antes y el después se basen en
  lo real.
- Cada cifra lleva su rótulo: REAL, ILUSTRATIVO, ESTIMACIÓN o CONCEPTUAL.

Ejemplo incluido: `examples/pedidos/` (una herramienta nueva para pasar pedidos; caso y cifras ficticios). El video de
muestra renderizado no está en el repo (pesa): se publica aparte, en Releases.

## Requisitos
| | Versión | Para qué |
| --- | --- | --- |
| Node.js | 22 o más | Remotion (animación y render) |
| Python | 3.12 | voz, música, mezcla, QA |
| FFmpeg | 6 o más (con ffprobe) | audio, planchas, análisis de grabaciones |
| Disco | ≈ 8 GB libres | dependencias y modelos |

**Descargas la primera vez (≈ 6 GB):** paquetes de npm (~0,3 GB), torch y dependencias de voz (~2 GB), modelo de voz
Qwen3-TTS Base 1.7B (~4,3 GB) y faster-whisper small (~0,5 GB). Después funciona sin internet.

La voz corre en CPU (≈ 11 s de cómputo por segundo de audio: un largo tarda 30–40 min). Con GPU NVIDIA o Mac con Apple
Silicon es mucho más rápido (`"tts_device": "cuda"` o `"mps"` en `config.json`).

## Instalación
Windows (PowerShell):
```
git clone <este-repo> video-showcase
cd video-showcase
powershell -ExecutionPolicy Bypass -File scripts/setup.ps1            # chequea requisitos
powershell -ExecutionPolicy Bypass -File scripts/setup.ps1 -Install   # instala (avisa las descargas antes)
```
Mac / Linux:
```
git clone <este-repo> video-showcase
cd video-showcase
bash scripts/setup.sh             # chequea requisitos
bash scripts/setup.sh --install   # instala (avisa las descargas antes)
```
FFmpeg: en Windows, `winget install Gyan.FFmpeg`; en Mac, `brew install ffmpeg`.

La instalación crea `video/node_modules`, `.venv` (pipeline), `.venv-tts` (voz) y `config.json` (rutas locales).

## Uso con Codex
Abrí Codex en la carpeta del repo y pedí, por ejemplo:

> Quiero un video showcase de cómo cambió la carga de reclamos con la herramienta nueva. Tengo una grabación de cómo
> se hacía antes en `C:/grabaciones/antes.mp4`.

Codex lee `AGENTS.md` y la skill `.agents/skills/video-showcase/SKILL.md`: te va a entrevistar, proponer el guion
(tabla + `script.json`) y esperar tu aprobación antes de generar la voz y el video final.

Para tener la skill disponible en cualquier carpeta, copiala a tu usuario: `~/.codex/skills/video-showcase/`
(la skill igual necesita este repo para el motor).

## Uso con Claude Code
Copiá o enlazá `.agents/skills/video-showcase/` en `.claude/skills/video-showcase/` (del repo o de tu usuario) y pedí
el video igual que arriba. También podés decirle "seguí `.agents/skills/video-showcase/SKILL.md`".

## Uso manual (sin agente)
```
mkdir projects/mi-video && cp examples/pedidos/*.json projects/mi-video/   # y editá los textos
.venv/Scripts/python scripts/build.py projects/mi-video --draft             # Mac/Linux: .venv/bin/python
.venv/Scripts/python scripts/render.py projects/mi-video --draft            # borrador + planchas por escena
.venv/Scripts/python scripts/build.py projects/mi-video                     # con voz (tarda)
.venv/Scripts/python scripts/render.py projects/mi-video                    # entregables/mi-video/v1/
.venv/Scripts/python scripts/qa.py entregables/mi-video/v1/mi-video_largo_v1.mp4 projects/mi-video
```
Corto (a pedido): `make_short.py projects/mi-video` genera `script-corto.json`; después
`build.py projects/mi-video --script script-corto.json --tag corto`, `render.py projects/mi-video --tag corto` y
`qa.py <video> projects/mi-video --tag corto`.

Para previsualizar en el navegador: `cd video && npx remotion studio src/index.ts --props=../work/mi-video/largo/props.json`.

## Estructura
```
.agents/skills/video-showcase/   la skill (SKILL.md + references/)
AGENTS.md                        instrucciones para Codex
examples/pedidos/                guion largo de ejemplo + colores
scripts/                         pipeline Python (build, render, qa, make_short, analyze_video, tts_qwen, music, align)
video/                           motor Remotion (escenas, colores, tests)
voice/                           voz de referencia sintética
projects/  work/  entregables/   tus guiones, intermedios y videos (fuera de git)
```

## Licencias
- **Código de este repo:** MIT (`LICENSE`).
- **Remotion** (motor de video) **no es software libre para todos:** es gratis para personas, organizaciones sin fines
  de lucro y empresas de **hasta 3 personas**; si tu empresa tiene más, necesitás una licencia paga (desde
  **USD 25 por usuario por mes**). Revisá las condiciones vigentes en https://www.remotion.dev/license antes de usarlo
  en una empresa.
- **Música:** original, generada por código en `scripts/music.py` (sin samples de terceros).
- **Voz:** sintética, generada localmente con Qwen3-TTS (modelos Apache-2.0). `voice/locutor-ar.wav` es una voz
  diseñada por el modelo, no la de una persona real. No clones la voz de nadie sin su consentimiento explícito.
- **Subtítulos:** faster-whisper (MIT) con el modelo Whisper small (MIT).
- **Fuente:** IBM Plex Sans y Mono (SIL Open Font License, `video/public/fonts/OFL-LICENSE.txt`).

## Pruebas
```
cd video && npx tsc --noEmit && node --test test/*.test.ts
.venv/Scripts/python -m pytest -q tests
```
