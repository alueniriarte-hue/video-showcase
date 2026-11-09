# Honestidad y privacidad

## Rótulos: qué es cada cosa en pantalla
| Rótulo | Cuándo | Ejemplo |
| --- | --- | --- |
| **REAL** | Medido, o visto en la grabación del proceso (con su segundo en `analisis.md`), o dato que la persona confirmó con su fuente. | "212 de 220 resueltos solos" si salió de una corrida real. |
| **ILUSTRATIVO** | Recreado para el video: interfaces, filas de ejemplo, nombres ficticios, cifras de muestra. | La ventana de carga dibujada por el motor. |
| **ESTIMACIÓN** | Cálculo razonado pero no medido (se dice de dónde sale). | "≈ 3 h por día" estimado por el equipo. |
| **CONCEPTUAL** | Diagrama de cómo funciona, no una pantalla. | El diseño del proceso, la regla de ejemplo. |

Reglas:
1. **Toda cifra dicha por la voz** tiene que estar en `evidence` del guion con su origen y su rótulo. El build avisa y el
   QA falla si falta. Las cifras que solo se ven en pantalla también llevan rótulo (`notes` o `tag`).
2. **Las promesas coinciden con lo REAL.** Si no hay dato real para "en minutos", no se promete "en minutos": se usa
   una frase sin cifra o se rotula ESTIMACIÓN.
3. **El acelerado se dice.** Si el procesamiento va acelerado, el cartel "proceso acelerado" queda visible. El "×N" solo
   con segundos reales (`real_s`).
4. **No se inventan resultados del cliente.** En un caso real, nada de "ahorro 80 %" sin medición. Si la persona quiere
   cifras, se pregunta de dónde salen.
5. **La voz es sintética** (Qwen3-TTS, local) y se aclara en `props.voice_note`. Nunca se clona la voz de una persona
   real sin su consentimiento explícito y por escrito.

## Privacidad
1. **Las grabaciones del proceso son material sensible.** `analyze_video.py` solo las lee; los cuadros, planchas y
   transcripciones quedan en `work/` (fuera de git). No se suben a ningún servicio: todo corre local.
2. **Nada identificable en pantalla**: nombres de clientes, números de documento o de identificación fiscal, importes reales, correos,
   teléfonos, direcciones. En el video se usan nombres ficticios y montos enmascarados (los componentes ya enmascaran
   los valores de `check` y `table-check`).
3. **Anotá lo sensible que viste** en la sección "Datos sensibles vistos" de `analisis.md`, para no usarlo por error.
4. **Lista local de vigilancia:** `work/privacidad.txt` (una palabra o nombre por renglón, fuera de git). `qa.py` la
   busca en el guion y en las props y falla si encuentra algo. Cargala con los nombres reales del cliente.
5. **Variantes con y sin nombre del cliente**: la versión para terceros va sin `client` y sin datos del cliente.
6. **Revisión visual humana**: el QA no mira imágenes. Antes de entregar, alguien mira el video entero (o las planchas
   por escena) buscando datos reales que se hayan colado.
7. Los proyectos (`projects/`) y las salidas (`work/`, `entregables/`) están en `.gitignore`: no se publican por
   accidente. Si un proyecto se quiere compartir como ejemplo, se pasa a `examples/` con datos ficticios.
