/**
 * Piezas atómicas del motor: tema activo, tipos de props, fondo HUD, entrada de escena, rótulos honestos, puntero guía,
 * foco, cámara virtual, chip de acelerado, ventana de app recreada e ícono de documento. Sin contenido de ningún cliente.
 */
import {loadFont} from '@remotion/fonts';
import type {CSSProperties, ReactNode} from 'react';
import {createContext, useContext} from 'react';
import {AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {cameraAt, cameraTransform, EASE_IO, k01, pathAt, sinceClick} from './motion.ts';
import type {CamKey, Cap, Chapter, PathKey} from './motion.ts';
import {PRESETS} from './theme.ts';
import type {Theme, ThemeInput} from './theme.ts';

export const PLEX = '"IBM Plex Sans", "Segoe UI", system-ui, sans-serif';
export const MONO = '"IBM Plex Mono", Consolas, monospace';

/** Fuentes incluidas en el repo (OFL): se ven igual en cualquier computadora. */
export const FONTS_READY = Promise.all([
  ...[400, 500, 600, 700].map((w) => loadFont({family: 'IBM Plex Sans', url: staticFile(`fonts/ibm-plex-sans-latin-${w}-normal.woff2`), weight: String(w)})),
  ...[400, 700].map((w) => loadFont({family: 'IBM Plex Mono', url: staticFile(`fonts/ibm-plex-mono-latin-${w}-normal.woff2`), weight: String(w)})),
]);

export const ThemeCtx = createContext<Theme>(PRESETS['nocturno']!);
export const useTh = (): Theme => useContext(ThemeCtx);

/** Datos compartidos entre escenas (p. ej. el universo de filas que se escanea y se revisa). */
export type Dataset = Record<string, unknown>;
export const DataCtx = createContext<Dataset>({});
export const useData = (): Dataset => useContext(DataCtx);

export type Line = {text: string; start: number; dur: number};
export type Scene = {
  id: string; act: string; type: string; step: number | null; step_label: string | null;
  params: Record<string, unknown>; start: number; dur: number; lines: Line[]; beats: Record<string, number>;
};
export type VideoProps = {
  id: string; title: string; fps: number; bpm: number; duration_s: number; durationInFrames: number; audio: string;
  voice: string; voice_note: string; publication: string; chapters: Chapter[]; scenes: Scene[]; captions: Cap[];
  sfx: {t: number; sfx: string; scene: string}[]; theme_input: ThemeInput; theme?: Theme; before_theme?: Theme; dataset: Dataset;
};

/** Cuadros de la escena + conversor de beats (segundos relativos a la escena) a cuadros. */
export const useT = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return {frame, fps, f: (s: number) => Math.round(s * fps)};
};
export const beat = (s: Scene, k: string, d: number): number => s.beats[k] ?? d;
export const param = <T,>(s: Scene, k: string, d: T): T => (s.params[k] as T | undefined) ?? d;

/** Fondo: degradado radial, grilla tenue, piso en perspectiva opcional y viñeta. */
export const Backdrop = ({floor = false, speed = 3}: {floor?: boolean; speed?: number}) => {
  const p = useTh();
  const frame = useCurrentFrame();
  const grid = `linear-gradient(${p.grid} 1px, transparent 1px), linear-gradient(90deg, ${p.grid} 1px, transparent 1px)`;
  return (
    <AbsoluteFill style={{background: `radial-gradient(120% 80% at 50% 38%, ${p.bg2} 0%, ${p.bg} 70%)`}}>
      <AbsoluteFill style={{backgroundImage: grid, backgroundSize: '72px 72px', backgroundPosition: '-1px -1px'}} />
      {floor && (
        <div style={{position: 'absolute', left: -600, right: -600, top: 1180, height: 1400, transformOrigin: '50% 0%',
          transform: 'perspective(700px) rotateX(64deg)',
          backgroundImage: `linear-gradient(${p.glow} 2px, transparent 2px), linear-gradient(90deg, ${p.glow} 2px, transparent 2px)`,
          backgroundSize: '120px 120px', backgroundPosition: `0px ${(((frame * speed) % 120) + 120) % 120}px`, opacity: 0.5,
          maskImage: 'linear-gradient(to bottom, black 0%, transparent 75%)'}} />
      )}
      <AbsoluteFill style={{background: `radial-gradient(90% 70% at 50% 45%, transparent 55%, ${p.dark ? 'rgba(0,0,0,0.55)' : 'rgba(90,80,60,0.16)'} 100%)`}} />
    </AbsoluteFill>
  );
};

/** Entrada/salida de escena: aparece con foco (desenfoque → nítido) y sale acercándose con desenfoque. */
export const Shell = ({children, dur, inLen = 12, outLen = 10}: {children: ReactNode; dur: number; inLen?: number; outLen?: number}) => {
  const frame = useCurrentFrame();
  const a = k01(frame, 0, inLen);
  const b = k01(frame, dur - outLen, outLen, EASE_IO);
  return (
    <AbsoluteFill style={{opacity: a * (1 - b), scale: String(1.03 - 0.03 * a + 0.04 * b), filter: `blur(${(1 - a) * 10 + b * 12}px)`}}>
      {children}
    </AbsoluteFill>
  );
};

export const Mono = ({children, style}: {children: ReactNode; style?: CSSProperties}) => {
  const p = useTh();
  return <div style={{fontFamily: MONO, fontSize: 24, letterSpacing: 3, textTransform: 'uppercase', color: p.muted, ...style}}>{children}</div>;
};

/** Rótulo honesto del tipo de imagen o cifra. */
export type TagKind = 'REAL' | 'ILUSTRATIVO' | 'ESTIMACIÓN' | 'CONCEPTUAL';
export const Tag = ({kind}: {kind: TagKind}) => {
  const p = useTh();
  const c = kind === 'REAL' ? p.ok : kind === 'ESTIMACIÓN' ? p.review : p.muted;
  return <span style={{fontFamily: MONO, fontSize: 20, letterSpacing: 2, color: c, border: `1.5px solid ${c}`, borderRadius: 6, padding: '3px 9px', whiteSpace: 'nowrap'}}>{kind}</span>;
};
export const Note = ({kind, children, style}: {kind: TagKind; children: ReactNode; style?: CSSProperties}) => {
  const p = useTh();
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 12, ...style}}>
      <Tag kind={kind} />
      <span style={{fontFamily: MONO, fontSize: 21, letterSpacing: 1, color: p.muted}}>{children}</span>
    </div>
  );
};
/** Notas declaradas en el guion: [{kind, text}]. */
export type NoteDef = {kind: TagKind; text: string};
export const Notes = ({notes, top, on, style}: {notes: NoteDef[]; top: number; on: number; style?: CSSProperties}) => (
  <div style={{position: 'absolute', left: 60, right: 60, top, display: 'flex', flexDirection: 'column', gap: 10, opacity: on, ...style}}>
    {notes.map((n, i) => <Note key={i} kind={n.kind}>{n.text}</Note>)}
  </div>
);

/** Puntero guía: flecha + onda en cada clic. Coordenadas del lienzo de la escena (se mueve con la cámara). */
export const Pointer = ({keys, show = [0, 1e9]}: {keys: PathKey[]; show?: [number, number]}) => {
  const p = useTh();
  const frame = useCurrentFrame();
  const pos = pathAt(keys, frame);
  const since = sinceClick(keys, frame);
  const vis = k01(frame, show[0], 8) * (1 - k01(frame, show[1], 8));
  const press = since !== null && since < 6 ? 0.85 + 0.15 * (since / 6) : 1;
  const ring = since !== null && since < 22 ? since / 22 : 1;
  return (
    <div style={{position: 'absolute', left: pos.x, top: pos.y, width: 0, height: 0, opacity: vis, zIndex: 40, pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: -46, top: -46, width: 92, height: 92, borderRadius: '50%', border: `3px solid ${p.accent}`,
        opacity: 1 - ring, scale: String(0.3 + 0.9 * ring), boxShadow: `0 0 24px ${p.glow}`}} />
      <svg viewBox="0 0 24 24" style={{position: 'absolute', left: -6, top: -4, width: 58, height: 58, scale: String(press), transformOrigin: '6px 4px',
        filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.45))'}}>
        <path d="M5 3l14 8-6.2 1.6L10 19z" fill="#FFFFFF" stroke="#0A0F1E" strokeWidth={1.4} strokeLinejoin="round" />
      </svg>
    </div>
  );
};

/** Foco: oscurece todo menos un rectángulo redondeado (acompaña la mirada del espectador). */
export const Spotlight = ({box, on, radius = 22}: {box: [number, number, number, number]; on: number; radius?: number}) => {
  const p = useTh();
  const [x, y, w, h] = box;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: radius, zIndex: 30, pointerEvents: 'none',
      boxShadow: p.dark ? `0 0 0 4000px rgba(3,6,16,${0.55 * on})` : `0 0 0 4000px rgba(20,24,40,${0.22 * on})`, outline: `2px solid ${p.accent}`, outlineOffset: 6, opacity: on > 0 ? 1 : 0}} />
  );
};

/** Cámara virtual que envuelve el lienzo de la escena. */
export const Camera = ({keys, children}: {keys: CamKey[]; children: ReactNode}) => {
  const frame = useCurrentFrame();
  const c = cameraAt(keys, frame);
  return <AbsoluteFill style={{transformOrigin: '0 0', transform: cameraTransform(c)}}>{children}</AbsoluteFill>;
};

/** Chip de tiempo acelerado: SOLO en procesamiento/conteo; siempre declara que es acelerado. */
export const FastForward = ({on, label, style}: {on: number; label: string; style?: CSSProperties}) => {
  const p = useTh();
  const frame = useCurrentFrame();
  return (
    <div style={{display: 'inline-flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderRadius: 12, background: p.surface2,
      border: `1.5px solid ${p.accent}`, opacity: on, translate: `0px ${(1 - on) * -10}px`, ...style}}>
      <svg viewBox="0 0 24 24" style={{width: 30, height: 30, fill: p.accent, opacity: 0.6 + 0.4 * Math.abs(Math.sin(frame / 4))}}>
        <path d="M3 5l9 7-9 7zM12 5l9 7-9 7z" />
      </svg>
      <span style={{fontFamily: MONO, fontSize: 23, letterSpacing: 2, color: p.ink}}>{label}</span>
    </div>
  );
};

/** Ventana de aplicación (interfaz RECREADA, ilustrativa). */
export const AppWindow = ({title, children, style}: {title: string; children: ReactNode; style?: CSSProperties}) => {
  const p = useTh();
  return (
    <div style={{position: 'absolute', borderRadius: 26, overflow: 'hidden', background: p.surface, border: `1.5px solid ${p.line}`,
      boxShadow: '0 40px 120px rgba(0,0,0,0.45)', ...style}}>
      <div style={{height: 64, display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px', background: p.surface2, borderBottom: `1.5px solid ${p.line}`}}>
        {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => <div key={c} style={{width: 15, height: 15, borderRadius: '50%', background: c, opacity: 0.8}} />)}
        <div style={{marginLeft: 14, fontFamily: MONO, fontSize: 21, letterSpacing: 1, color: p.muted}}>{title}</div>
      </div>
      <div style={{position: 'relative', height: 'calc(100% - 64px)'}}>{children}</div>
    </div>
  );
};

/** Ícono de documento (PDF, pedido, factura…): solapa de color + renglones + etiqueta al pie. */
export const DocIcon = ({label, w = 150, tag = 'PDF', tagColor = '#E5383B'}: {label: string; w?: number; tag?: string; tagColor?: string}) => {
  const p = useTh();
  return (
    <div style={{width: w, height: w * 1.25, borderRadius: 12, background: '#F4F6FB', position: 'relative', boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
      overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 12, top: 12, background: tagColor, color: '#fff', fontFamily: PLEX, fontWeight: 700, fontSize: w * 0.12,
        padding: '3px 8px', borderRadius: 5}}>{tag}</div>
      {Array.from({length: 6}, (_, i) => (
        <div key={i} style={{position: 'absolute', left: 14, right: i % 2 ? 40 : 18, top: w * 0.42 + i * w * 0.1, height: w * 0.035, borderRadius: 3, background: '#C9D0E0'}} />
      ))}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: w * 0.22, background: p.dark ? p.surface2 : '#E4E8F1', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: MONO, fontSize: w * 0.1, color: p.dark ? p.ink : '#1D2128', whiteSpace: 'nowrap', overflow: 'hidden'}}>{label}</div>
    </div>
  );
};
