/**
 * Colores del video. La persona elige 2-3 colores (o un preset) en `theme.json` y acá se derivan todos los tokens.
 * Funciones puras (testeadas en test/theme.test.ts). Contraste según WCAG 2.x.
 */
export type Theme = {
  dark: boolean; bg: string; bg2: string; surface: string; surface2: string; line: string; grid: string;
  ink: string; muted: string; faint: string; accent: string; onAccent: string; ok: string; okSoft: string;
  review: string; reviewSoft: string; highlighter: string; glow: string; danger: string;
};

/** Lo que escribe la persona en theme.json. */
export type ThemeInput = {
  preset?: string;
  mode?: 'dark' | 'light';
  accent?: string; background?: string; ok?: string; review?: string; danger?: string;
  /** El "antes" en papel claro (por defecto) o con el mismo tema. */
  before?: 'paper' | 'same';
};

const hex = (h: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
  if (!m) throw new Error(`color inválido: ${h} (usar #RRGGBB)`);
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (c: number[]): string => `#${c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
/** Mezcla a→b en proporción t (0 = a, 1 = b). */
export const mix = (a: string, b: string, t: number): string => {
  const A = hex(a);
  const B = hex(b);
  return toHex(A.map((v, i) => v + (B[i]! - v) * t));
};
export const rgba = (h: string, alpha: number): string => {
  const [r, g, b] = hex(h);
  return `rgba(${r},${g},${b},${alpha})`;
};
const lum = (h: string): number => {
  const ch = hex(h).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
};
export const contrast = (a: string, b: string): number => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
};

/** Nocturno: el tema aprobado del video de referencia (medianoche + azul eléctrico + menta). */
const NOCTURNO: Theme = {
  dark: true, bg: '#060914', bg2: '#0B1022', surface: '#0F1630', surface2: '#141D3B', line: '#1F2A4D', grid: 'rgba(91,140,255,0.07)',
  ink: '#EEF2FF', muted: '#8F9ABD', faint: '#3D4870', accent: '#5B8CFF', onAccent: '#FFFFFF', ok: '#34E0A1', okSoft: 'rgba(52,224,161,0.12)',
  review: '#FFC547', reviewSoft: 'rgba(255,197,71,0.15)', highlighter: 'rgba(255,197,71,0.32)', glow: 'rgba(91,140,255,0.40)', danger: '#FF5D6C',
};

/** Papel: el "antes" (lo manual), claro y cálido. */
export const PAPER: Theme = {
  dark: false, bg: '#ECE8DF', bg2: '#F6F3EC', surface: '#FFFFFF', surface2: '#F7F5F0', line: '#DDD7CA', grid: 'rgba(60,50,30,0.05)',
  ink: '#1D2128', muted: '#6A6F7A', faint: '#B9B4A8', accent: '#1F6F5C', onAccent: '#FFFFFF', ok: '#1F6F5C', okSoft: 'rgba(31,111,92,0.1)',
  review: '#C98500', reviewSoft: 'rgba(230,160,20,0.18)', highlighter: 'rgba(255,196,0,0.4)', glow: 'rgba(0,0,0,0.1)', danger: '#C0392B',
};

/** Construye un tema completo desde el acento (y opcionalmente fondo y colores de estado). */
export const buildTheme = (inp: ThemeInput): Theme => {
  const accent = (inp.accent ?? '#5B8CFF').toUpperCase();
  const dark = (inp.mode ?? 'dark') === 'dark';
  if (dark) {
    const bg = (inp.background ?? mix(accent, '#000000', 0.93)).toUpperCase();
    const ink = mix(accent, '#FFFFFF', 0.92);
    const ok = inp.ok ?? '#34E0A1';
    const review = inp.review ?? '#FFC547';
    return {
      dark, bg, bg2: mix(bg, accent, 0.05), surface: mix(bg, accent, 0.1), surface2: mix(bg, accent, 0.14), line: mix(bg, accent, 0.22),
      grid: rgba(accent, 0.07), ink, muted: mix(ink, bg, 0.42), faint: mix(ink, bg, 0.74), accent,
      onAccent: contrast('#FFFFFF', accent) >= 3 ? '#FFFFFF' : '#0A0F1E', ok, okSoft: rgba(ok, 0.12), review, reviewSoft: rgba(review, 0.15),
      highlighter: rgba(review, 0.32), glow: rgba(accent, 0.4), danger: inp.danger ?? '#FF5D6C',
    };
  }
  const bg = (inp.background ?? mix(accent, '#FFFFFF', 0.95)).toUpperCase();
  const ink = mix(accent, '#000000', 0.86);
  const ok = inp.ok ?? '#0B8A5E';
  const review = inp.review ?? '#B37400';
  return {
    dark, bg, bg2: mix(bg, '#FFFFFF', 0.5), surface: '#FFFFFF', surface2: mix(bg, '#FFFFFF', 0.6), line: mix(bg, accent, 0.18),
    grid: rgba(accent, 0.06), ink, muted: mix(ink, bg, 0.4), faint: mix(ink, bg, 0.72), accent,
    onAccent: contrast('#FFFFFF', accent) >= 3 ? '#FFFFFF' : '#0A0F1E', ok, okSoft: rgba(ok, 0.12), review, reviewSoft: rgba(review, 0.16),
    highlighter: rgba(review, 0.3), glow: rgba(accent, 0.25), danger: inp.danger ?? '#C62F3E',
  };
};

export const PRESETS: Record<string, Theme> = {
  nocturno: NOCTURNO,
  claro: buildTheme({mode: 'light', accent: '#2F6BFF'}),
  calido: buildTheme({mode: 'dark', accent: '#FF8A3D', background: '#120B07'}),
};

/** Advertencias de legibilidad (vacío = todo bien). */
export const checkTheme = (t: Theme): string[] => {
  const w: string[] = [];
  const need = (a: string, b: string, min: number, what: string) => {
    const c = contrast(a, b);
    if (c < min) w.push(`${what}: contraste ${c.toFixed(2)} (mínimo ${min})`);
  };
  need(t.ink, t.bg, 7, 'texto principal sobre el fondo');
  need(t.muted, t.bg, 3, 'texto secundario sobre el fondo');
  need(t.accent, t.bg, 3, 'color de acento sobre el fondo');
  need(t.onAccent, t.accent, 3, 'texto sobre botones de acento');
  need(t.ok, t.bg, 3, 'verde de "resuelto" sobre el fondo');
  need(t.review, t.bg, 3, 'color de "a revisar" sobre el fondo');
  return w;
};

/** theme.json -> Theme (preset por nombre o colores propios). */
export const resolveTheme = (inp: ThemeInput): Theme => {
  if (inp.preset) {
    const t = PRESETS[inp.preset];
    if (!t) throw new Error(`preset desconocido: ${inp.preset} (disponibles: ${Object.keys(PRESETS).join(', ')})`);
    return t;
  }
  return buildTheme(inp);
};
