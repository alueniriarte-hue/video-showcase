# AGENTS.md

Este repo es una herramienta para hacer **videos showcase de procesos** (antes → después con IA, 9:16) y su skill.

## Cuando te pidan un video
Seguí la skill `.agents/skills/video-showcase/SKILL.md` paso a paso. Tiene dos compuertas humanas: no renderices la
versión final sin que la persona apruebe el guion, y la aprobación del video terminado también es de ella.

## Convenciones
- Hablá en español, simple y directo. La persona que usa esto no necesita saber de Remotion ni de Python.
- Los guiones de cada video van en `projects/<proyecto>/` (`script.json` + `theme.json`). Usá `examples/pedidos/`
  como modelo. `projects/`, `work/`, `entregables/` y `config.json` no van a git.
- Comandos Python con el entorno del pipeline (`.venv`); la voz usa su propio entorno (`.venv-tts`, ver `config.json`).
- Tareas largas (voz, render) en segundo plano. No corras el QA en paralelo con un render.
- No instales dependencias ni bajes modelos sin avisar antes el tamaño (≈ 6 GB en total la primera vez).
- No publiques nada (videos, grabaciones, datos) en servicios externos.

## Verificar cambios en el código
```
cd video && npx tsc --noEmit && node --test test/*.test.ts
.venv/Scripts/python -m pytest -q tests        # Mac/Linux: .venv/bin/python
```
