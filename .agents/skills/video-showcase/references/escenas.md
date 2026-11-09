# Catálogo de escenas y parámetros

Cada escena del guion (`script.json`) tiene esta forma:

```json
{"id": "paso-carga", "type": "input", "act": "proceso", "step": 1, "step_label": "Carga en lote",
 "lines": ["Primero, arrastrás todos los pedidos del día juntos y tocás validar."],
 "beats": {"drag": "arrastrás", "drop": "juntos", "click": "validar"},
 "params": {"button": "Validar con IA"},
 "post": 0.75, "min_s": 0,
 "short": {"lines": ["Cargás todos los pedidos juntos."], "beats": {"drag": "Cargás", "drop": "pedidos", "click": "juntos"}}}
```

- `lines`: lo que dice la voz (frases cortas). La escena dura lo que dura su locución + `post` (respiro; 0,75 s por
  defecto), como mínimo `min_s`, redondeado a la grilla musical.
- `beats`: cada momento de la animación se ata a **la primera palabra de la escena que empieza así** (sin tildes ni
  mayúsculas). Si la palabra no está, el build se detiene. Cuidado con los prefijos cortos ("ia" calza con cualquier
  palabra que empiece con "ia") y con las palabras repetidas: gana la primera aparición en la escena.
- `act`: agrupa escenas en capítulos (`chapters` en la raíz: `{"n", "act", "label"}`), que se ven arriba a la izquierda.
- `step` / `step_label`: numeran el paso a paso (1..N sin saltos; varias escenas pueden compartir paso). Se ven en el HUD.
- `params`: textos y datos de la escena. Todo texto visible sale de acá; si falta, se usa un valor neutro.
- `short`: bloque para el corto (`lines`, `beats`, `params`, `post`, `min_s`), o `false` para quitarla del corto.
- `params.nocap`: lista de índices de `lines` que no llevan subtítulo.

Raíz del guion: `id`, `title`, `bpm` (120), `format` (`fps` 30), `audience` (`interno` | `cliente`), `chapters`,
`evidence` (origen de cada cifra dicha), `dataset.scan` (universo de filas) y, opcionalmente, `theme` (si no hay
`theme.json`).

Las escenas `intro`, `opener`, `turn` y `outro` no llevan subtítulos (el texto grande ya está en pantalla).
Los SFX se agregan solos según el tipo y los beats (sin whoosh entre escenas).

---

## Relato

### `opener` · apertura (promesa con impacto musical)
Mismo componente que `close`. Sin `msg`, el título entra en el beat `title` (ponelo en la primera palabra).
- beats: `title`, `proc` (aparece la etiqueta del proceso), `fast` (aparece la frase final, grande).
- params: `headline` (2 renglones), `process`, `tagline`, `client`, `brand`, `signature`, `note` `{kind, text}`.

### `intro` · título + agenda
- beats: `title`, `sub`, `a1`..`aN` (cada ítem de la agenda se ilumina con su palabra).
- params: `kicker` (texto chico arriba), `title` (renglones; los 2 últimos van en acento), `subtitle`, `agenda`
  (4 ítems = 4 capítulos), `agenda_label`, `stream_tag`.

### `before` · "¿Cómo se hacía antes?"
Montaje rápido en "papel" (claro, aunque el video sea oscuro; con `"before": "same"` en `theme.json` usa el mismo tema).
- beats: `q` (tarjeta de rebobinado con la pregunta; sin `q` arranca directo en la planilla), `sheet` (entra la
  planilla y se tipea), `control` (total), `mismatch` (sello de error + SFX), `redo` (volver a revisar todo).
  Los últimos 22 cuadros son el **barrido de la IA** hacia la escena siguiente: poné `turn` después.
- params: `question` (renglones de hasta ~14 caracteres), `rewind_label`, `label`, `tag` (rótulo), `columns`
  (3: corta, larga, número), `rows` (hasta 7 filas de 3 textos), `pile_label`, `pile_tag`, `pile_total`,
  `total_label`, `pending_label`, `mismatch_label`, `stamp`, `redo_label`, `clock_at_redo`, `clock_end` (minutos
  que marca el reloj).
- Recomendado: `min_s` 12 en el largo.

### `turn` · "HOY"
- beats: `hoy` (aparece la palabra), `flip` (destello + barrido + título).
- params: `word` ("HOY"), `title` ("con IA"), `subtitle`.

### `design` · diseño del proceso (≤ 5 nodos, una pantalla)
- beats: uno por nodo (el nombre que pongas en `nodes[i].beat`), `loop` (se dibuja el bucle), `learn` (el depósito
  de reglas late en verde).
- params: `nodes` (hasta 5) `{kind: in|ia|ctl|human|out, title, sub, beat, extra}`. `extra` es opcional:
  `{type: "stack", from, to, label}` (pila que crece), `{type: "checks", items}` (tildes),
  `{type: "pct", value, label}` (número grande). `store` `{at: índice del nodo, title, sub, sub_after}` (depósito de
  reglas a la derecha), `loop` `{from: índice del nodo humano, label}`, `badges` (texto de las etiquetas por tipo),
  `notes`. Títulos de nodo de hasta ~17 caracteres; subtítulos de hasta ~28 (con `extra`, menos).

### `impact` · antes vs. después
- beats: `manual` (barra del antes), `ai` (barra de la IA), `review` (tramo de revisión humana + tarjetas).
- params: `label`, `tag`, `before` `{label, minutes, tasks (4), caption}`, `after` `{label, ai, review, ai_label,
  detail ("{ai} min de proceso · {review} de revisión"), caption}`, `unit`, `cards` (hasta 3: `{value, unit, label,
  tag, tone: ok|review|accent}`), `disclaimer`.

### `close` · cierre
- beats: `msg` (mensaje), `pair1`..`pairN` (pares "X → Y"), `title` (impacto: título y red que se enciende), `proc`,
  `fast`.
- params: `message` (renglones de hasta ~14 caracteres), `pairs` (`[izquierda, derecha, tono]`; izquierda de hasta
  ~9 caracteres), `headline`, `client` (variante con el nombre del cliente), `process`, `tagline`, `brand`,
  `signature`, `note`.
- Si el público es el cliente: sin CTA (ni "contactanos", ni precios).

### `outro` · marca (opcional)
- Sin locución (`lines: []`, `min_s` 3–4). params: `brand` (hasta 4 letras se ve enorme), `signature`.

---

## Paso a paso (interfaz recreada: rotular ILUSTRATIVO salvo que copie la real)

### `input` · carga
- beats: `drag` (el puntero agarra los archivos), `drop` (los suelta), `click` (botón).
- params: `window_title`, `items` (3 nombres de archivo), `item_tag`, `drop_title`, `drop_sub`, `summary`, `button`,
  `button_busy`, `notes`.

### `process` · procesamiento acelerado
- beats: `read` (empieza; aparece "proceso acelerado"), `count` (contador grande).
- params: `groups` (hasta 4 `{label, count}`), `total` (por defecto, la suma), `unit`, `counter_label`,
  `window_title`, `real_s` (segundos REALES del proceso: muestra "×N"; solo si salen de una medición o de la
  grabación), `notes`.

### `check` · control con ecuación
- beats: `r1`..`r4` (cada renglón), `count` (renglón de cantidades), `groups` (tarjetas), `ok` (resultado).
- params: `title`, `rows` (hasta 4 `[operador, etiqueta]`; el último es el resultado), `compare_label`,
  `count` `{label, left, right, value}` o `null`, `groups` (hasta 3 `{label, detail}`), `result`, `notes`.
  Los valores van enmascarados (barras grises): no se muestran importes.

### `table-check` · control por tabla (calculado vs. referencia), opcional
- beats: `calc` (columna calculada), `compare` (columna de referencia; después recorre las pestañas, acelerado).
- params: `title`, `tabs` (3), `columns` (4), `rows` (hasta 4), `issue` `{tab, rows, label, explain}` (diferencia
  encontrada), `summary` (`{title, value, tone}`), `ok_label`, `notes`.

### `scan` · el universo completo baja rápido y se separan las excepciones
- Usa `dataset.scan` de la raíz: `{total, auto, rows, amber, cards, columns, file, field_label, period, ...}`.
  `total` filas; `auto` resueltas por regla; `total - auto` a revisar; hasta 4 `cards` se vuelven tarjetas.
  `rows`: pares `[registro, dato]` para las filas resueltas; `amber`: `[registro, dato, motivo]` para el resto de
  las excepciones; `period`: `"month"` (fechas dd/mm) o `"day"` (horas de 08:00 a 18:00).
  Textos: `columns` (4), `file`, `field_label`, `review_prefix`, `ok_label`, `review_label`, `badges`.
- beats: `scan` (arranca el barrido), `pct` (porcentaje resuelto solo), `amber` (se separan las excepciones).
- params: `sheet_title`, `scan_label`, `pct_label` (por defecto "NN % · auto de total resueltos solos"), `notes`.

### `review` · control humano (protagonista)
- beats: `human` (banner "CONTROL HUMANO"), `open` (el puntero del equipo abre la primera tarjeta), `expert`
  (subtítulo del banner), `fix` (abre el menú y corrige), `ok` (confirma todo).
- params: `banner_title`, `banner_sub`, `options` (la primera es la corrección; incluí el valor original),
  `pointer_label`, `confirm`, `confirmed`, `notes`.

### `learn` · las correcciones alimentan reglas nuevas
- beats: `prop` (la IA propone la regla), `next` (se guarda para el próximo ciclo), `high` (indicador de resolución).
- params: `header`, `correction_label`, `correction` `{title, from, to}`, `ia_label`, `rule_label`, `rule`
  `{if, then}`, `count`, `store_title`, `store_added` ("+{n} nuevas"), `gauge_label`, `gauge_value`, `gauge_pct`,
  `saved_label`, `new_label`, `notes`.

### `deliver` · entrega
- beats: `load` (fin de la carga acelerada), `ok` (tarjetas de destino en verde).
- params: `window_title`, `columns` (4), `groups` (hasta 3 destinos), `fixed_value` (el valor corregido en `review`),
  `total`, `button`, `counter_label`, `ff_label`, `ok_label`, `notes`.

---

## Rótulos (`notes`, `tag`)
`notes` es una lista de `{kind, text}` con `kind` = `REAL` | `ILUSTRATIVO` | `ESTIMACIÓN` | `CONCEPTUAL`.
Cuándo usar cada uno: `honestidad-y-privacidad.md`.

## Colores (`theme.json`)
Preset: `{"preset": "nocturno"}` (también `"claro"` y `"calido"`).
Colores propios: `{"mode": "dark", "accent": "#8B5CF6", "background": "#0D0A17", "before": "paper"}`.
Con colores propios se derivan todos los tonos y el build avisa si algún contraste no alcanza (texto ≥ 7:1; acento y
estados ≥ 3:1). Opcionales: `ok`, `review`, `danger`. Para probar: `node video/scripts/theme-check.ts <theme.json>`
(desde `video/`).
