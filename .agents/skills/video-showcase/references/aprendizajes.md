# Aprendizajes de dirección (reglas que el video tiene que respetar)

Salen de las revisiones de un video de este tipo ya aprobado. No son gustos: cada una corrigió algo que en la
revisión se notó mal. Si una pieza nueva las rompe, se corrige antes de mostrarla.

## Ritmo y montaje
1. **Movimiento desde el primer cuadro.** El video abre con la escena `opener` y su título entra en el cuadro 1
   (beat `title` en la primera palabra). Nada de placas quietas ni fundidos desde negro.
2. **Sin whoosh entre escenas.** Los cambios de escena no llevan efecto de transición sonoro: suena barato.
   Los SFX solo marcan acciones (clic, soltar, OK, error) y ya vienen atados a los beats.
3. **La narración manda el tiempo.** Cada escena dura lo que dura su locución (más un respiro) y se redondea a la
   grilla de pulsos de la música. Si una escena se siente larga, se acorta el texto, no la animación.
4. **Solo el procesamiento va acelerado**, y lo dice en pantalla ("proceso acelerado"). La carga, el control humano
   y la entrega van a ritmo de lectura, con el puntero guiando la mirada.

## Dramaturgia
5. **El "antes" es un montaje rápido**: arranca con la pregunta ("¿Cómo se hacía antes…?") en la tarjeta de rebobinado,
   muestra el trabajo manual, el sello de error ("NO COINCIDE") y termina con el **barrido de la IA** que limpia la
   pantalla y deja paso a "HOY". No se explica el antes en detalle: se siente.
6. **Diseño en una sola pantalla, hasta 5 nodos** (entrada → IA → controles → control humano → entrega), con el bucle
   de aprendizaje. Unos 15–20 s. Más nodos o más pantallas lo vuelven una clase.
7. **El control humano es el protagonista.** La IA hace el volumen; el criterio del experto decide las excepciones y
   **sus correcciones alimentan reglas nuevas**. El video lo muestra (banner "CONTROL HUMANO", el puntero del equipo, la
   corrección concreta) y lo dice.
8. **Primero el volumen completo, después las excepciones.** En la escena `scan` se ven TODAS las filas bajando rápido
   (el universo entero, con su número) y recién después se separan las pocas excepciones. Nunca mostrar solo las
   excepciones: se pierde la escala.
9. **Sin corte entre la lista y la revisión.** `scan` y `review` van seguidas: las tarjetas que se separaron en la lista
   son las mismas que el equipo abre en la revisión.

## Honestidad
10. **Las promesas tienen que coincidir con lo REAL.** Si el título dice "en minutos", los minutos tienen que salir de
    una medición o de la grabación del proceso. Si no hay dato real, se dice sin cifra o se rotula ESTIMACIÓN.
11. **Todo lo que aparece en pantalla lleva su rótulo**: REAL (medido o visto en la grabación), ILUSTRATIVO (recreado
    para el video), ESTIMACIÓN (cálculo razonado, no medido) o CONCEPTUAL (diagrama de cómo funciona). Ver
    `honestidad-y-privacidad.md`.

## Público y variantes
12. **Variantes con y sin el nombre del cliente.** El cierre acepta `client`; se renderiza una versión con el nombre y
    otra sin él (para mostrar a terceros).
13. **Sin CTA cuando el público es el cliente.** Si el video es para el propio cliente, no se cierra con "contactanos",
    precios ni llamados a la acción: se cierra con el mensaje y el proceso. El outro de marca es opcional.

## Formato
14. **Largo por defecto** (2–3 min, detallado, pensado para dirección o para quien decide). **El corto se hace a pedido**
    desde el largo (`make_short.py`): sin agenda ni diseño, una frase por paso.
15. **Una idea por frase, frases cortas.** La voz es sintética: frases de más de ~20 palabras se escuchan apuradas.
