/**
 * Funciones puras del movimiento (sin React): curvas, trayectorias del puntero, cámara virtual y subtítulos por frase.
 * Todo depende solo del número de cuadro: render determinista y testeable (video/test/motion.test.ts).
 */

/** Bézier cúbica (x1,y1,x2,y2) como en CSS, resuelta por Newton + bisección. */
export const bezier = (x1: number, y1: number, x2: number, y2: number) => {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const e = sx(t) - x;
      const d = dx(t);
      if (Math.abs(e) < 1e-6) return sy(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0, hi = 1;
    t = x;
    for (let i = 0; i < 30; i++) {
      const v = sx(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (v < x) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return sy(t);
  };
};

/** Curva de la casa: arranque decidido, llegada muy suave. */
export const EASE = bezier(0.22, 1, 0.36, 1);
export const EASE_IO = bezier(0.65, 0, 0.35, 1);

/** 0→1 entre `start` y `start+len` cuadros, con curva; fuera del tramo queda fijo. */
export const k01 = (frame: number, start: number, len: number, ease: (x: number) => number = EASE): number =>
  ease(Math.min(1, Math.max(0, (frame - start) / Math.max(1, len))));

/** Fuerza un rango estrictamente creciente (cada punto al menos 1 cuadro después del anterior): los beats que faltan
 * caen en valores por defecto que pueden empatar o invertirse en escenas cortas, e interpolate() lo rechaza. */
export const rising = (xs: number[]): number[] => xs.reduce<number[]>((acc, x) => [...acc, acc.length ? Math.max(x, acc[acc.length - 1]! + 1) : x], []);

export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

/** Clave de trayectoria: en el cuadro `f` el puntero está en (x,y); `click` dispara una onda en ese cuadro. */
export type PathKey = {f: number; x: number; y: number; click?: boolean};

/**
 * Posición del puntero: quieto en cada clave y viaja a la siguiente durante `travel` cuadros ANTES de llegar
 * (llega justo en `f`, como una mano que anticipa la palabra). Antes de la primera clave y después de la última queda fijo.
 */
export const pathAt = (keys: PathKey[], frame: number, travel = 14): {x: number; y: number} => {
  if (keys.length === 0) return {x: 0, y: 0};
  const first = keys[0]!;
  if (frame <= first.f) return {x: first.x, y: first.y};
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1]!;
    const b = keys[i]!;
    if (frame <= b.f) {
      const len = Math.min(travel, Math.max(1, b.f - a.f));
      const k = EASE_IO(Math.min(1, Math.max(0, (frame - (b.f - len)) / len)));
      return {x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k)};
    }
  }
  const last = keys[keys.length - 1]!;
  return {x: last.x, y: last.y};
};

/** Cuadros desde el último clic ocurrido, o null si todavía no hubo. Sirve para la onda y el "apretado" del botón. */
export const sinceClick = (keys: PathKey[], frame: number): number | null => {
  let best: number | null = null;
  for (const k of keys) if (k.click && frame >= k.f) best = frame - k.f;
  return best;
};

/** Cámara virtual: centro (cx,cy) y zoom s; interpola con EASE_IO durante `len` cuadros desde cada clave. */
export type CamKey = {f: number; cx: number; cy: number; s: number; len?: number};
export const cameraAt = (keys: CamKey[], frame: number): {cx: number; cy: number; s: number} => {
  if (keys.length === 0) return {cx: 540, cy: 960, s: 1};
  let cur = {cx: keys[0]!.cx, cy: keys[0]!.cy, s: keys[0]!.s};
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i]!;
    if (frame < k.f) break;
    const p = EASE_IO(Math.min(1, (frame - k.f) / Math.max(1, k.len ?? 24)));
    cur = {cx: lerp(cur.cx, k.cx, p), cy: lerp(cur.cy, k.cy, p), s: lerp(cur.s, k.s, p)};
  }
  return cur;
};

/** Transform CSS para que el punto (cx,cy) del lienzo quede en el centro del cuadro con zoom s. */
export const cameraTransform = (c: {cx: number; cy: number; s: number}, w = 1080, h = 1920): string =>
  `translate(${w / 2 - c.cx * c.s}px, ${h / 2 - c.cy * c.s}px) scale(${c.s})`;

/** Subtítulos por frase: corta en cambio de línea, en puntuación (con ≥ 3 palabras) o al llegar a `max` palabras. */
export type Cap = {text: string; startMs: number; endMs: number; line: string};
export const chunkCaptions = (caps: Cap[], max = 6): Cap[][] => {
  const out: Cap[][] = [];
  let cur: Cap[] = [];
  caps.forEach((c, i) => {
    const prev = caps[i - 1];
    if (cur.length && (prev?.line !== c.line || cur.length >= max)) {
      out.push(cur);
      cur = [];
    }
    cur.push(c);
    if (/[.,:;?!…]$/u.test(c.text) && cur.length >= 3) {
      out.push(cur);
      cur = [];
    }
  });
  if (cur.length) out.push(cur);
  return out;
};

/** Contador de 0 a `to` entre `start` y `start+len` cuadros (suave en los extremos, rápido en el medio). */
export const countUp = (frame: number, start: number, len: number, to: number): number =>
  Math.round(to * k01(frame, start, len, EASE_IO));

/** Tramo [start, end) en segundos de un paso del HUD, aunque el paso abarque varias escenas seguidas. */
type Span = {start: number; dur: number};
export const stepSpan = (scenes: (Span & {step: number | null})[], n: number): {start: number; end: number} | null => {
  const own = scenes.filter((s) => s.step === n);
  const first = own[0];
  const last = own[own.length - 1];
  return first && last ? {start: first.start, end: last.start + last.dur} : null;
};

/** Capítulo de la agenda vigente en el segundo t (por el acto de la escena en curso), con su tramo completo. */
export type Chapter = {n: number; act: string; label: string};
export const chapterAt = (chapters: Chapter[], scenes: (Span & {act: string})[], t: number): (Chapter & {start: number; end: number}) | null => {
  const now = scenes.find((s) => t >= s.start && t < s.start + s.dur);
  const ch = now ? chapters.find((c) => c.act === now.act) : undefined;
  if (!ch) return null;
  const own = scenes.filter((s) => s.act === ch.act);
  const last = own[own.length - 1]!;
  return {...ch, start: own[0]!.start, end: last.start + last.dur};
};
