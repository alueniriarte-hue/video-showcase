# Problemas comunes

| Síntoma | Causa | Arreglo |
| --- | --- | --- |
| `beat 'x': la palabra 'y' no está en la locución` | El beat apunta a una palabra que no está en las `lines` de la escena (o tiene otra forma). | Usá una palabra que esté, o su comienzo ("valid" calza con "validados"). Se compara sin tildes ni mayúsculas. |
| La animación pasa en el momento equivocado | El prefijo calza antes con otra palabra de la escena (gana la primera). | Elegí una palabra más específica o reescribí la frase. Mirá `work/<p>/<tag>/timeline.txt`. |
| `AVISO: cifras dichas sin origen en 'evidence'` | La voz dice un número (o "uno/una", "hora", "minutos") que no está en `evidence`. | Agregalo a `evidence` con su origen y rótulo, o reescribí sin cifra. Para "una" como artículo, reescribí ("cada", "alguien"). |
| `AVISO de color: ... contraste` | El acento o el fondo elegidos no se leen bien. | Probá otro tono o un preset. `node video/scripts/theme-check.ts projects/<p>/theme.json` (desde `video/`). |
| Texto cortado con "…" o que se sale de la caja | Títulos o etiquetas demasiado largos. | Acortá (ver límites en `escenas.md`) y revisá la plancha por escena. |
| La voz tarda muchísimo | Qwen3-TTS en CPU: ~11 s de cómputo por segundo de audio. Un largo de 3 min ≈ 30–40 min. | Correlo en segundo plano. Las líneas ya generadas quedan en caché (`work/_voz/`): cambiar una frase solo regenera esa. Con GPU: `"tts_device": "cuda"`; en Mac: `"mps"`. |
| `falta la voz de referencia voice/locutor-ar.wav` | Se borró o se cambió el nombre. | Restaurala desde git o pasá `--voice <nombre>` con un `voice/<nombre>.wav` + `.txt`. |
| La primera corrida descarga modelos | Qwen3-TTS Base (~4,3 GB) y faster-whisper small (~0,5 GB) se bajan una vez a `hf_home`. | Es normal: avisá antes. Después funciona sin internet. |
| `npx remotion render` falla con timeout | Máquina cargada (por ejemplo, la voz corriendo al mismo tiempo). | Esperá a que termine la voz, o subí `--timeout`. No corras el QA en paralelo con un render. |
| QA: `audio` falla | El mix no quedó en −14 LUFS (raro) o el pico supera −1 dBTP. | Volvé a correr `build.py`: corrige la ganancia midiendo la salida. |
| QA: `sincronia` falla | El ASR no reconoce bien algunas palabras (siglas, marcas). | Escribí las siglas como se dicen ("i a", no "IA", solo si molesta) o aceptá si la mediana está cerca y lo revisás a ojo. |
| QA: `formato` falla con un borrador | Los borradores son de media resolución. | El QA es para el render final (sin `--draft`). |
| `npm ci` falla sin internet | No hay caché de npm. | Necesita internet la primera vez (o una caché: `npm ci --cache <carpeta> --prefer-offline`). |
| En Windows, caracteres raros en la consola | Codificación de la consola. | `set PYTHONIOENCODING=utf-8` (cmd) o `$env:PYTHONIOENCODING="utf-8"` (PowerShell). |
| El corto queda largo | Las frases de `short` son largas o hay escenas sin `short: false`. | Una frase por paso; `short: false` en intro, diseño y controles secundarios. |
