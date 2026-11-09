---
name: video-showcase
description: Arma videos verticales (9:16) de "antes y después" de un proceso con IA — guion, voz sintética local, música por código, animaciones con Remotion y QA técnico. Usala cuando alguien pide un video showcase, una demo animada o un explicativo de un proceso o de una herramienta nueva.
---

# Video showcase de procesos (antes → después con IA)

Producís un video vertical 1080×1920 a 30 fps que cuenta cómo un proceso pasó de hacerse a mano a hacerse con IA,
con el **control humano como protagonista**. Todo corre local: voz Qwen3-TTS, subtítulos alineados con faster-whisper,
música original generada por código y render con Remotion.

- **Formato por defecto: LARGO** (2–3 min, detallado, para dirección o para quien decide).
  Estructura: apertura → intro con agenda (4 capítulos) → "¿Cómo se hacía antes?" → HOY → diseño (≤ 5 nodos) →
  paso a paso → impacto → cierre → outro de marca opcional.
- **Corto (≈ 45–75 s) solo a pedido**, generado desde el largo.
- La persona cuenta la idea y elige los colores. Vos proponés el guion; **nada se renderiza en limpio sin su aprobación**.

Antes de escribir un guion, leé:
- `references/aprendizajes.md` — reglas de dirección que el video tiene que cumplir (obligatorio).
- `references/escenas.md` — tipos de escena, beats y parámetros.
- `references/honestidad-y-privacidad.md` — rótulos REAL / ILUSTRATIVO / ESTIMACIÓN / CONCEPTUAL y datos sensibles.
- `references/problemas-comunes.md` — si algo falla.
- `examples/pedidos/` — un guion largo completo de referencia (caso ficticio).

## Preparación (una vez por máquina)
1. Chequeá el entorno: `scripts/setup.ps1` (Windows) o `bash scripts/setup.sh` (Mac/Linux) en modo chequeo.
   Necesita Node 22+, Python 3.12 y FFmpeg. **La instalación completa baja ≈ 6 GB** (torch, modelos de voz y de
   transcripción): pedí permiso antes de instalar.
2. Si no existe `config.json`, copiá `config.example.json` y ajustá las rutas (FFmpeg, Python del TTS, caché de modelos).
3. Licencia de Remotion: es gratis para personas, organizaciones sin fines de lucro y empresas de hasta 3 personas;
   con más, hace falta una licencia paga (desde USD 25 por usuario por mes). Avisalo la primera vez si el video es
   para una empresa.
4. En los comandos de abajo, `PY` es el Python del pipeline (`.venv/Scripts/python` en Windows, `.venv/bin/python` en
   Mac/Linux). En Windows, definí `PYTHONIOENCODING=utf-8` para que la consola muestre bien los acentos.

## Flujo (con 2 compuertas humanas)

### 1. Entrevista
Preguntá lo que falte, de a pocas preguntas por vez, en lenguaje simple:
1. ¿Qué proceso o herramienta muestra el video? ¿Cuál es la idea central (una frase)?
2. ¿Para quién es? **Interno/dirección** o **el propio cliente** (si es el cliente: sin CTA ni precios).
3. ¿Va el nombre del cliente o de la empresa? (Se pueden hacer las dos variantes: con y sin nombre.)
4. ¿Cómo se hacía antes? Pasos, herramientas, dolores (errores, retrabajo, tiempo).
5. ¿Cómo se hace ahora? Pasos de la herramienta nueva, qué hace la IA, **qué controla y decide la persona experta**, y
   cómo sus correcciones se vuelven reglas nuevas.
6. Cifras: volumen, cuánto resuelve solo, cuántas excepciones, tiempos antes/ahora. **Para cada una: ¿de dónde sale?**
   (medición, grabación, estimación). Sin origen, no va o va como ESTIMACIÓN.
7. **¿Hay grabaciones de pantalla del proceso anterior y del actual?** (pedí la ruta).
8. Colores: 2–3 colores (acento, fondo, modo claro u oscuro) o un preset (`nocturno`, `claro`, `calido`).
9. Marca para el outro (opcional) y firma.

### 2. Si hay grabaciones: basá el guion en lo REAL
```
PY scripts/analyze_video.py <grabación-antes> --as antes --project projects/<proyecto>
PY scripts/analyze_video.py <grabación-ahora> --as ahora --project projects/<proyecto>
```
Salen cuadros en cada cambio de pantalla, planchas (`plancha_NN.png`), transcripción y una plantilla `analisis.md` en
`work/<proyecto>/analisis/<antes|ahora>/`. Mirá las planchas y la transcripción, completá `analisis.md` (pasos con su
segundo, tiempos medidos, cifras visibles, textos de la interfaz, dolores, **datos sensibles vistos**) y usalo así:
- los pasos del guion siguen los pasos observados, en ese orden;
- los textos de la interfaz recreada (botones, columnas, estados) copian los reales, **sin datos de clientes**;
- los tiempos medidos alimentan `real_s` (acelerado ×N) y la escena `impact`, rotulados REAL;
- el "antes" recrea los dolores que se ven en la grabación vieja.
Las grabaciones no se modifican ni se suben a ningún lado. Los datos sensibles vistos van a `work/privacidad.txt`.

### 3. Guion propuesto → COMPUERTA 1
1. Creá `projects/<proyecto>/` copiando `examples/pedidos/script.json` y `theme.json`, y reescribí todo para el caso.
   Respetá `references/aprendizajes.md`. Toda cifra dicha va a `evidence` con su origen y rótulo.
2. Validá rápido (sin voz): `PY scripts/build.py projects/<proyecto> --draft`. Corregí errores y avisos.
3. Mostrale a la persona una **tabla**: escena · tipo · locución · qué se ve · rótulo · origen de las cifras, más la
   duración estimada (`work/<proyecto>/largo/timeline.txt`) y la ruta del `script.json`.
4. **Pará y esperá la aprobación explícita.** Ajustá lo que pida y volvé a mostrar. No avances sin un "sí".

### 4. Borrador visual
```
PY scripts/build.py projects/<proyecto> --draft
PY scripts/render.py projects/<proyecto> --draft
```
El render deja `work/<proyecto>/largo/borrador.mp4` (media resolución), una plancha general y **planchas por escena**
(`borrador_escenas_NN.png`: dos cuadros por escena, armándose y completa). Miralas todas y corregí choques: textos
cortados, cajas que se pisan, subtítulos tapando algo, rótulos faltantes. Repetí hasta que estén limpias.
Mostrale las planchas a la persona si quiere ver el borrador.

### 5. Voz, render final y QA
```
PY scripts/build.py projects/<proyecto>            # voz + mezcla (en segundo plano: ~11 s de CPU por s de audio)
PY scripts/render.py projects/<proyecto>           # -> entregables/<proyecto>/vN/<proyecto>_largo_vN.mp4
PY scripts/qa.py entregables/<proyecto>/vN/<proyecto>_largo_vN.mp4 projects/<proyecto>
```
- La voz de un largo tarda 30–40 min en CPU: corré el build en segundo plano y avisá el tiempo estimado.
- No corras el QA en paralelo con un render.
- El QA tiene que dar `ok_tecnico: true`: formato, −14 LUFS (±1) y pico ≤ −1 dBTP, sincronía (mediana ≤ 80 ms),
  evidencia de cifras y lista de privacidad. Si algo falla, corregí y repetí.
- Revisá las planchas por escena del render final igual que en el borrador.
- Variante con nombre del cliente: copiá el guion a `script-cliente.json` con `params.client` en `close` y corré
  `build.py ... --script script-cliente.json --tag cliente`, `render.py ... --tag cliente`, `qa.py ... --tag cliente`.

### 6. Corto (solo si lo piden)
```
PY scripts/make_short.py projects/<proyecto>        # -> script-corto.json (usa los bloques "short" de cada escena)
PY scripts/build.py projects/<proyecto> --script script-corto.json --tag corto
PY scripts/render.py projects/<proyecto> --tag corto
PY scripts/qa.py <video-corto.mp4> projects/<proyecto> --tag corto
```
El corto no tiene agenda ni diseño; una frase por paso. Si una escena no tiene `short`, se quita (salvo apertura,
HOY y outro). Revisá que el corto siga contando antes → hoy → control humano → resultado.

### 7. Revisión final → COMPUERTA 2
Entregá: ruta del video (cada render queda en su propia `vN/`, nunca se pisa), planchas por escena, `qa.json`, la
lista de qué es REAL / ILUSTRATIVO / ESTIMACIÓN / CONCEPTUAL, y **lo que no pudiste verificar**. La aprobación final es
humana: el QA técnico no mira las imágenes ni juzga el relato. Con cambios, volvé al paso que corresponda y generá
una versión nueva.

## Reglas que no se negocian
- Movimiento desde el primer cuadro; sin whoosh entre escenas; solo el procesamiento va acelerado (y lo dice).
- Diseño en una pantalla, hasta 5 nodos. El control humano es el protagonista; sus correcciones generan reglas nuevas.
- Primero el volumen completo bajando rápido, después las pocas excepciones; `scan` y `review` seguidas, sin corte.
- Promesas = lo REAL. Cada cifra dicha tiene origen en `evidence`; cada pantalla, su rótulo.
- Nada identificable de clientes en pantalla ni en la voz. Voz sintética: nunca clonar a una persona real sin su
  consentimiento.
- Sin CTA cuando el público es el cliente.

## Mapa del repo
- `video/` motor Remotion (escenas en `src/engine/scenes/`, colores en `src/engine/theme.ts`).
- `scripts/` pipeline: `build.py`, `render.py`, `qa.py`, `make_short.py`, `analyze_video.py`, `tts_qwen.py`, `music.py`.
- `voice/locutor-ar.wav` + `.txt` voz de referencia sintética (rioplatense, cálida).
- `projects/<proyecto>/` guiones de cada video (fuera de git). `work/` intermedios y `entregables/` videos (fuera de git).
