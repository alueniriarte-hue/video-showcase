/**
 * Escenas de relato: opener/cierre (la transformación), intro con agenda, "antes" (pregunta + montaje + barrido), giro "HOY",
 * diseño del proceso (≤ 5 nodos + bucle de aprendizaje), impacto (antes/después) y outro de marca.
 * Todo texto sale de `params` del guion; los valores por defecto son neutros.
 */
import type {CSSProperties, JSX} from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {Backdrop, Camera, DocIcon, Mono, MONO, Note, Notes, PLEX, Tag, ThemeCtx, useTh, useT, beat, param} from '../kit.tsx';
import type {NoteDef, Scene, TagKind} from '../kit.tsx';
import {EASE, EASE_IO, k01, rising} from '../motion.ts';
import type {Theme} from '../theme.ts';
import {BeforeThemeCtx} from './contexts.ts';

/* ------------------------------------------------------------------ piezas */
/** Título con revelado por máscara, renglón por renglón (desde `accentFrom`, en acento). */
export const MaskTitle = ({lines, at, top, size, gap = 6, accentFrom}: {lines: string[]; at: number; top: number; size: number; gap?: number; accentFrom?: number}) => {
  const p = useTh();
  const {frame} = useT();
  const acc = accentFrom ?? lines.length - 1;
  return (
    <div style={{position: 'absolute', left: 80, right: 80, top}}>
      {lines.map((ln, i) => {
        const k = k01(frame, at + i * gap, 18);
        const hot = i >= acc;
        return (
          <div key={i} style={{overflow: 'hidden', paddingBottom: '0.08em'}}>
            <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: size, lineHeight: 1.04, letterSpacing: -2, translate: `0px ${(1 - k) * 110}%`,
              color: hot ? p.accent : p.ink, textShadow: hot ? `0 0 46px ${p.glow}` : 'none'}}>{ln}</div>
          </div>
        );
      })}
    </div>
  );
};

const Typed = ({text, at, cps = 1.6, style}: {text: string; at: number; cps?: number; style?: CSSProperties}) => {
  const p = useTh();
  const {frame} = useT();
  const n = Math.max(0, Math.min(text.length, Math.floor((frame - at) * cps)));
  const caret = frame >= at && Math.floor(frame / 8) % 2 === 0;
  return (
    <div style={{fontFamily: MONO, fontSize: 28, letterSpacing: 3, color: p.accent, whiteSpace: 'pre', ...style}}>
      {text.slice(0, n)}<span style={{opacity: caret ? 1 : 0}}>▍</span>
    </div>
  );
};

const Brackets = ({at, top = 330, h = 720}: {at: number; top?: number; h?: number}) => {
  const p = useTh();
  const {frame} = useT();
  const k = k01(frame, at, 16);
  const L = 70;
  const s: CSSProperties = {position: 'absolute', width: L, height: L, borderColor: p.accent, borderStyle: 'solid', opacity: k};
  const inset = 120 - 30 * k;
  return (
    <div style={{position: 'absolute', left: inset, right: inset, top: top - (1 - k) * 30, height: h + (1 - k) * 60}}>
      <div style={{...s, left: 0, top: 0, borderWidth: '4px 0 0 4px'}} />
      <div style={{...s, right: 0, top: 0, borderWidth: '4px 4px 0 0'}} />
      <div style={{...s, left: 0, bottom: 0, borderWidth: '0 0 4px 4px'}} />
      <div style={{...s, right: 0, bottom: 0, borderWidth: '0 4px 4px 0'}} />
    </div>
  );
};

/** Cinta de transformación: documentos entran por la izquierda, cruzan el haz de la IA y salen como filas de datos. */
const TransformStream = ({top, h = 220, tag = 'DOC'}: {top: number; h?: number; tag?: string}) => {
  const p = useTh();
  const {frame} = useT();
  const N = 9;
  const W = 1400;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top, height: h, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: h / 2, height: 1.5, background: p.line}} />
      {Array.from({length: N}, (_, i) => {
        const x = ((frame * 7 + i * (W / N)) % W) - 160;
        const y = 22 + ((i * 5) % 3) * ((h - 104) / 2);
        const edge = Math.min(1, Math.max(0, (x + 160) / 120), Math.max(0, (1240 - x) / 120));
        if (x < 540 - 30) {
          return (
            <div key={i} style={{position: 'absolute', left: x, top: y, width: 56, height: 70, borderRadius: 6, background: '#F4F6FB', opacity: 0.9 * edge,
              boxShadow: '0 8px 20px rgba(0,0,0,0.4)'}}>
              <div style={{position: 'absolute', left: 6, top: 6, height: 10, borderRadius: 2, background: '#E5383B', fontFamily: PLEX, fontSize: 8, fontWeight: 700,
                color: '#fff', padding: '0 3px', lineHeight: '10px'}}>{tag}</div>
              {[0, 1, 2].map((r) => <div key={r} style={{position: 'absolute', left: 6, right: 8 + (r % 2) * 10, top: 26 + r * 12, height: 5, borderRadius: 2, background: '#C9D0E0'}} />)}
            </div>
          );
        }
        return (
          <div key={i} style={{position: 'absolute', left: x, top: y + 8, display: 'flex', flexDirection: 'column', gap: 7, opacity: edge}}>
            {[0, 1, 2].map((r) => (
              <div key={r} style={{display: 'flex', gap: 6}}>
                <div style={{width: 26, height: 9, borderRadius: 3, background: p.accent, opacity: 0.8}} />
                <div style={{width: 70 - r * 12, height: 9, borderRadius: 3, background: r === 1 && i % 4 === 0 ? p.review : p.ok, opacity: 0.85}} />
              </div>
            ))}
          </div>
        );
      })}
      <div style={{position: 'absolute', left: 538, top: 0, bottom: 0, width: 4, background: p.accent, boxShadow: `0 0 30px 8px ${p.glow}`,
        opacity: 0.75 + 0.25 * Math.sin(frame / 4)}} />
      <div style={{position: 'absolute', left: 556, top: 4, fontFamily: MONO, fontSize: 19, letterSpacing: 2, color: p.onAccent, background: p.accent,
        borderRadius: 6, padding: '3px 9px'}}>IA</div>
    </div>
  );
};

/* ------------------------------------------------------------------ INTRO + AGENDA */
const AGENDA_ICONS = [
  'M4 20h16M6 16l9-9 3 3-9 9H6z',
  'M5 5h6v5H5zM13 14h6v5h-6zM8 10v4h8',
  'M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4z',
  'M4 20V10M10 20V4M16 20v-7M22 20H2',
  'M5 12l5 5 9-10',
  'M12 3v18M3 12h18',
];

export const IntroScene = ({s}: {s: Scene}) => {
  const p = useTh();
  const {frame, f, fps} = useT();
  const dur = Math.round(s.dur * fps);
  const title = param<string[]>(s, 'title', ['Transformación', 'de procesos', 'con inteligencia', 'artificial']);
  const sub = param<string>(s, 'subtitle', '');
  const kicker = param<string>(s, 'kicker', '');
  const items = param<string[]>(s, 'agenda', []);
  const showAgenda = items.length > 0;
  const tTitle = f(beat(s, 'title', 0.35));
  const tSub = f(beat(s, 'sub', 2.5));
  const ag = items.map((_, i) => f(beat(s, `a${i + 1}`, 6 + i * 1.5)));
  const cur = ag.findLastIndex((t) => frame >= t - 4);
  const subN = Math.max(0, Math.min(sub.length, Math.floor((frame - tSub + 4) * 1.8)));
  const subK = k01(frame, tSub - 6, 10);
  const push = 1 + 0.045 * (frame / Math.max(1, dur));
  const shimmer = interpolate(frame, [tTitle + 20, tTitle + 56], [-300, 1300], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_IO});
  const first = ag[0] ?? 0;
  const last = ag[ag.length - 1] ?? 0;
  const lineK = k01(frame, first - 8, Math.max(10, last - first + 8), EASE_IO);
  return (
    <AbsoluteFill>
      <Backdrop floor speed={4} />
      <AbsoluteFill style={{scale: String(push)}}>
        <Brackets at={2} top={140} h={1180} />
        {kicker && (
          <div style={{position: 'absolute', left: 0, right: 0, top: 96, display: 'flex', justifyContent: 'center'}}>
            <Typed text={kicker} at={2} cps={2.4} />
          </div>
        )}
        <MaskTitle lines={title} at={tTitle - 8} top={200} size={98} gap={5} accentFrom={Math.max(1, title.length - 2)} />
        <div style={{position: 'absolute', left: shimmer, top: 190, width: 200, height: 440, opacity: 0.5, mixBlendMode: 'screen', rotate: '12deg',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)', filter: 'blur(18px)'}} />
        {sub && (
          <div style={{position: 'absolute', left: 80, top: 650, display: 'flex', alignItems: 'center', gap: 14, opacity: subK, translate: `${(1 - subK) * -24}px 0px`}}>
            <div style={{width: 10, height: 46, borderRadius: 3, background: p.ok, boxShadow: `0 0 16px ${p.okSoft}`}} />
            <div style={{fontFamily: PLEX, fontWeight: 600, fontSize: 44, color: p.ink, whiteSpace: 'pre'}}>
              {sub.slice(0, subN)}<span style={{opacity: subN < sub.length && Math.floor(frame / 6) % 2 === 0 ? 1 : 0, color: p.ok}}>▍</span>
            </div>
          </div>
        )}
        {showAgenda && (
          <div style={{position: 'absolute', left: 80, right: 80, top: 770}}>
            <Mono style={{color: p.muted, opacity: k01(frame, first - 16, 10), marginBottom: 16}}>{param(s, 'agenda_label', 'En este video')}</Mono>
            <div style={{position: 'absolute', left: 37, top: 72, width: 3, height: (items.length - 1) * 112 * lineK, background: p.accent, boxShadow: `0 0 12px ${p.glow}`}} />
            {items.map((it, i) => {
              const a = ag[i] ?? 0;
              const k = k01(frame, a - 6, 12);
              const active = i === cur && frame < dur - 30;
              const next = ag[i + 1] ?? a + 60;
              const prog = active ? Math.min(1, Math.max(0, (frame - a) / Math.max(1, next - a))) : cur > i ? 1 : 0;
              return (
                <div key={it} style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 24, height: 96, marginBottom: 16, borderRadius: 18,
                  padding: '0 22px 0 0', overflow: 'hidden', opacity: k, translate: `${(1 - k) * 60}px 0px`, scale: String(active ? 1.03 : 1),
                  transformOrigin: 'left center', background: active ? p.surface2 : p.surface, border: `1.5px solid ${active ? p.accent : p.line}`,
                  boxShadow: active ? `0 0 30px ${p.glow}` : 'none'}}>
                  <div style={{position: 'absolute', left: 0, bottom: 0, height: 4, width: `${prog * 100}%`, background: p.accent}} />
                  <div style={{width: 78, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 28,
                    color: active || cur > i ? p.onAccent : p.accent, background: active || cur > i ? p.accent : 'transparent'}}>{String(i + 1).padStart(2, '0')}</div>
                  <svg viewBox="0 0 24 24" style={{width: 38, height: 38, fill: 'none', stroke: active ? p.accent : p.muted, strokeWidth: 1.8,
                    rotate: active ? `${Math.sin(frame / 6) * 6}deg` : '0deg'}}><path d={AGENDA_ICONS[i % AGENDA_ICONS.length]} /></svg>
                  <div style={{fontFamily: PLEX, fontWeight: active ? 700 : 500, fontSize: 40, color: active ? p.ink : p.muted}}>{it}</div>
                </div>
              );
            })}
          </div>
        )}
        <TransformStream top={showAgenda ? 1370 : 860} h={showAgenda ? 220 : 300} tag={param(s, 'stream_tag', 'DOC')} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ ANTES: pregunta + montaje rápido + barrido de la IA */
const RewindCard = ({at, out, question, label}: {at: number; out: number; question: string[]; label: string}) => {
  const p = useTh();
  const {frame} = useT();
  const lines = Array.from({length: 7}, (_, i) => ((frame * 23 + i * 290) % 2100) - 120);
  const blink = Math.floor(frame / 8) % 2 === 0;
  return (
    <AbsoluteFill style={{opacity: 1 - out}}>
      <Backdrop floor speed={-9} />
      {lines.map((y, i) => (
        <div key={i} style={{position: 'absolute', left: 0, right: 0, top: y, height: 2 + (i % 3), background: 'rgba(238,242,255,0.10)'}} />
      ))}
      <div style={{position: 'absolute', left: 80, top: 250, display: 'flex', alignItems: 'center', gap: 14, opacity: k01(frame, at - 10, 8)}}>
        <svg viewBox="0 0 24 24" style={{width: 44, height: 44, fill: p.review, opacity: blink ? 1 : 0.4}}><path d="M11 5l-9 7 9 7zM22 5l-9 7 9 7z" /></svg>
        <span style={{fontFamily: MONO, fontSize: 26, letterSpacing: 4, color: p.review}}>{label}</span>
      </div>
      <MaskTitle lines={question} at={at - 6} top={360} size={104} gap={6} accentFrom={1} />
    </AbsoluteFill>
  );
};

const DEFAULT_ROWS = [
  ['02/03', 'Registro recibido', '18.500'], ['03/03', 'Carga de datos', '4.210'], ['05/03', 'Control manual', '111'],
  ['08/03', 'Ajuste de planilla', '9.870'], ['11/03', 'Corrección', '1.250'], ['15/03', 'Registro recibido', '62.000'], ['19/03', 'Retención', '742'],
];

const BeforeInner = ({s, main}: {s: Scene; main: Theme}) => {
  const p = useTh();
  const {frame, f, fps} = useT();
  const dur = Math.round(s.dur * fps);
  const rows = param<string[][]>(s, 'rows', DEFAULT_ROWS);
  const cols = param<string[]>(s, 'columns', ['FECHA', 'CONCEPTO', 'VALOR']);
  const pileTotal = param(s, 'pile_total', 30);
  const hasQ = s.beats['q'] !== undefined;
  const tQ = f(beat(s, 'q', 0.35));
  const tSheet = f(beat(s, 'sheet', 1));
  const tCtl = f(beat(s, 'control', 5));
  const tBad = f(beat(s, 'mismatch', 6));
  const tRedo = f(beat(s, 'redo', 7));
  const paperIn = hasQ ? k01(frame, tSheet - 12, 14, EASE_IO) : 1;
  const prog = interpolate(frame, rising([tSheet, tCtl - 2]), [0, rows.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const rowIdx = Math.floor(prog);
  const rowFrac = prog - rowIdx;
  const ctl = k01(frame, tCtl, 8);
  const stamp = k01(frame, tBad, 9, EASE);
  const redo = k01(frame, tRedo, 12);
  const shake = frame > tBad && frame < tBad + 10 ? Math.sin((frame - tBad) * 2.6) * 10 : 0;
  const loop = frame > tRedo + 2 ? ((frame - tRedo - 2) % 16) / 16 : -1;
  const sweepRow = loop >= 0 ? rows.length - 1 - loop * rows.length : -9;
  const mins = Math.floor(interpolate(frame, rising([tSheet, Math.min(tRedo, dur - 2), dur]), [0, param(s, 'clock_at_redo', 52), param(s, 'clock_end', 95)],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const hand = interpolate(frame, rising([tSheet, dur]), [0, 2600], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const pile = Math.round(interpolate(frame, rising([tSheet, tCtl]), [1, pileTotal], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const wipeY = interpolate(frame, [dur - 22, dur - 1], [1940, -20], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_IO});
  const wiping = frame >= dur - 22;
  return (
    <AbsoluteFill>
      {hasQ && (
        <ThemeCtx.Provider value={main}>
          <RewindCard at={tQ} out={paperIn} question={param<string[]>(s, 'question', ['¿Cómo se hacía', 'antes?'])} label={param(s, 'rewind_label', 'REBOBINANDO · ANTES')} />
        </ThemeCtx.Provider>
      )}
      {wiping && <AbsoluteFill style={{background: main.bg}} />}
      <AbsoluteFill style={{translate: `0px ${(1 - paperIn) * 1920}px`, clipPath: wiping ? `inset(0px 0px ${1920 - wipeY}px 0px)` : undefined}}>
        <Backdrop />
        <div style={{position: 'absolute', left: 80, right: 80, top: 250, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
            <Mono style={{color: p.ink, fontSize: 26}}>{param(s, 'label', 'Antes · a mano')}</Mono>
            <Tag kind={param<TagKind>(s, 'tag', 'ILUSTRATIVO')} />
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 10, fontFamily: MONO, fontSize: 34, fontWeight: 700, color: p.danger}}>
            <svg viewBox="0 0 24 24" style={{width: 40, height: 40, fill: 'none', stroke: p.danger, strokeWidth: 2}}>
              <circle cx="12" cy="13" r="8" /><path d="M9 2h6" />
              <path d="M12 13V8" style={{transformOrigin: '12px 13px', rotate: `${hand}deg`}} />
            </svg>
            {`${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`}
          </div>
        </div>
        <div style={{position: 'absolute', left: 50, top: 350, width: 230, height: 300}}>
          {Array.from({length: Math.min(6, pile)}, (_, i) => (
            <div key={i} style={{position: 'absolute', left: i * 7, top: 40 - i * 8, rotate: `${-8 + i * 2.5}deg`}}>
              <DocIcon label={param(s, 'pile_label', 'Documento')} tag={param(s, 'pile_tag', 'DOC')} w={170} />
            </div>
          ))}
          <div style={{position: 'absolute', left: 120, top: 0, fontFamily: PLEX, fontWeight: 700, fontSize: 30, color: '#fff', background: p.danger, borderRadius: 999,
            padding: '6px 16px', boxShadow: '0 8px 20px rgba(0,0,0,0.25)', whiteSpace: 'nowrap'}}>{pile} de {pileTotal}</div>
        </div>
        <div style={{position: 'absolute', left: 200, right: 50, top: 470, borderRadius: 28, background: p.surface, padding: '30px 34px',
          boxShadow: '0 30px 80px rgba(60,50,30,0.18)', border: `1px solid ${p.line}`, translate: `${shake}px 0px`}}>
          <div style={{display: 'flex', fontFamily: PLEX, fontSize: 24, fontWeight: 700, color: p.muted, letterSpacing: 1, paddingBottom: 12, borderBottom: `2px solid ${p.line}`}}>
            <div style={{width: 100}}>{cols[0]}</div><div style={{flex: 1}}>{cols[1]}</div><div style={{width: 170, textAlign: 'right'}}>{cols[2]}</div>
          </div>
          {rows.map((r, i) => {
            const full = i < rowIdx;
            const cur = i === rowIdx;
            const txt = (str: string, a: number, b: number) => (full ? str : cur ? str.slice(0, Math.floor(str.length * Math.min(1, Math.max(0, (rowFrac - a) / (b - a))))) : '');
            const hot = Math.abs(sweepRow - i) < 0.6;
            const key = cur && frame < tCtl && rowFrac < 0.25;
            return (
              <div key={i} style={{display: 'flex', fontFamily: PLEX, fontSize: 29, color: p.ink, height: 60, alignItems: 'center', borderBottom: `1px solid ${p.line}`,
                background: hot ? p.reviewSoft : key ? p.okSoft : 'transparent'}}>
                <div style={{width: 100, color: p.muted}}>{txt(r[0] ?? '', 0, 0.2)}</div>
                <div style={{flex: 1}}>{txt(r[1] ?? '', 0.2, 0.7)}{cur && frame < tCtl && Math.floor(frame / 4) % 2 === 0 ? '▍' : ''}</div>
                <div style={{width: 170, textAlign: 'right', fontVariantNumeric: 'tabular-nums'}}>{txt(r[2] ?? '', 0.7, 1)}</div>
              </div>
            );
          })}
          <div style={{display: 'flex', alignItems: 'center', marginTop: 20, opacity: ctl, fontFamily: PLEX}}>
            <div style={{flex: 1, fontSize: 30, fontWeight: 700, color: p.ink}}>{param(s, 'total_label', 'Total controlado')}</div>
            <div style={{fontSize: 30, fontWeight: 700, color: stamp > 0 ? p.danger : p.muted}}>
              {stamp > 0 ? param(s, 'mismatch_label', '≠ esperado') : param(s, 'pending_label', 'Sumando…')}
            </div>
          </div>
          <div style={{position: 'absolute', left: '50%', top: '46%', translate: '-50% -50%', rotate: '-11deg', scale: String(1.9 - 0.9 * stamp), opacity: stamp,
            padding: '14px 34px', border: `7px solid ${p.danger}`, borderRadius: 18, color: p.danger, fontFamily: PLEX, fontWeight: 700, fontSize: 84,
            letterSpacing: 4, background: 'rgba(255,255,255,0.72)', whiteSpace: 'nowrap', boxShadow: '0 20px 50px rgba(192,57,43,0.25)'}}>{param(s, 'stamp', 'NO COINCIDE')}</div>
        </div>
        <div style={{position: 'absolute', left: 200, right: 50, top: 1220, display: 'flex', alignItems: 'center', gap: 20, opacity: redo,
          translate: `0px ${(1 - redo) * 20}px`}}>
          <svg viewBox="0 0 24 24" style={{width: 66, height: 66, fill: 'none', stroke: p.review, strokeWidth: 2.2, rotate: `${-frame * 14}deg`}}>
            <path d="M20 12a8 8 0 1 1-2.34-5.66" /><path d="M20 4v5h-5" />
          </svg>
          <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: 56, color: p.ink}}>{param(s, 'redo_label', 'A revisar todo')}</div>
        </div>
      </AbsoluteFill>
      {wiping && frame < dur - 1 && (
        <div style={{position: 'absolute', left: 0, right: 0, top: wipeY, height: 4, background: main.accent, boxShadow: `0 0 34px 8px ${main.glow}`}}>
          <div style={{position: 'absolute', right: 40, top: -40, fontFamily: MONO, fontSize: 22, letterSpacing: 2, color: main.onAccent, background: main.accent,
            borderRadius: 6, padding: '4px 10px'}}>IA</div>
        </div>
      )}
    </AbsoluteFill>
  );
};

/** El "antes" se ve con el tema de papel (o el mismo tema, según theme.json). */
export const BeforeScene = ({s}: {s: Scene}) => {
  const main = useTh();
  return (
    <BeforeThemeCtx.Consumer>
      {(paper) => <ThemeCtx.Provider value={paper}><BeforeInner s={s} main={main} /></ThemeCtx.Provider>}
    </BeforeThemeCtx.Consumer>
  );
};

/* ------------------------------------------------------------------ GIRO: HOY */
export const TurnScene = ({s}: {s: Scene}) => {
  const p = useTh();
  const {frame, f} = useT();
  const tHoy = f(beat(s, 'hoy', 0.4));
  const tFlip = f(beat(s, 'flip', 1.8));
  const hoy = k01(frame, tHoy - 2, 12);
  const flip = k01(frame, tFlip, 10);
  const flash = frame >= tFlip ? Math.max(0, 0.55 - (frame - tFlip) * 0.06) : 0;
  const scan = interpolate(frame, [tFlip, tFlip + 24], [200, 1500], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_IO});
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{opacity: flip}}><Backdrop floor speed={6} /></AbsoluteFill>
      <AbsoluteFill style={{background: p.bg, opacity: 1 - flip}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 560, textAlign: 'center', opacity: hoy, filter: `blur(${(1 - hoy) * 14}px)`}}>
        <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: 250, letterSpacing: -6, color: p.ink, lineHeight: 1, textShadow: `0 0 70px ${p.glow}`}}>
          {param(s, 'word', 'HOY')}
        </div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 850, textAlign: 'center', opacity: flip, translate: `0px ${(1 - flip) * 30}px`}}>
        <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: 120, color: p.accent, letterSpacing: -2, textShadow: `0 0 50px ${p.glow}`}}>{param(s, 'title', 'con IA')}</div>
        <Mono style={{marginTop: 26, color: p.muted}}>{param(s, 'subtitle', 'el mismo proceso · otra operación')}</Mono>
      </div>
      {frame >= tFlip && frame < tFlip + 26 && (
        <div style={{position: 'absolute', left: 0, right: 0, top: scan, height: 3, background: p.accent, boxShadow: `0 0 30px 6px ${p.glow}`}} />
      )}
      <AbsoluteFill style={{background: '#FFFFFF', opacity: flash, mixBlendMode: 'overlay'}} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ DISEÑO DEL PROCESO (≤ 5 nodos, una sola pantalla) */
type NodeKind = 'in' | 'ia' | 'ctl' | 'human' | 'out';
type NodeExtra = {type: 'stack'; from: number; to: number; label: string} | {type: 'checks'; items: string[]} | {type: 'pct'; value: string; label: string};
type FlowNode = {kind: NodeKind; title: string; sub: string; beat?: string; extra?: NodeExtra};
const COL = {x: 60, w: 700};
const LANE = {x: 800, w: 220};
const NODE_H = 120;
const nodeY = (i: number) => 300 + i * 190;
const DEFAULT_BADGES: Record<NodeKind, string> = {in: 'ENTRADA', ia: 'IA', ctl: 'CONTROL', human: 'EQUIPO', out: 'ENTREGA'};

const FlowBox = ({n, y, on, hot, extra, badge}: {n: FlowNode; y: number; on: number; hot: number; extra?: JSX.Element; badge: string}) => {
  const p = useTh();
  const c = n.kind === 'ctl' ? p.ok : n.kind === 'human' ? p.review : p.accent;
  const fill = n.kind === 'ia' ? `linear-gradient(100deg, ${p.glow}, transparent), ${p.surface}` : n.kind === 'human' ? `linear-gradient(100deg, ${p.reviewSoft}, transparent), ${p.surface}` : p.surface;
  const halo = n.kind === 'human' ? p.highlighter : p.glow;
  return (
    <div style={{position: 'absolute', left: COL.x, top: y, width: COL.w, height: NODE_H, borderRadius: 20, background: fill, border: `2px solid ${c}`,
      opacity: on, scale: String((0.94 + 0.06 * on) * (1 + 0.025 * hot)), translate: `0px ${(1 - on) * 24}px`, display: 'flex', alignItems: 'center', gap: 22,
      padding: '0 26px', boxSizing: 'border-box', boxShadow: `0 20px 60px rgba(0,0,0,0.35), 0 0 ${18 + 30 * hot}px ${halo}`}}>
      <div style={{width: 128, flexShrink: 0, fontFamily: MONO, fontSize: 19, letterSpacing: 2, color: n.kind === 'ia' ? p.onAccent : p.bg, background: c,
        borderRadius: 8, padding: '6px 0', textAlign: 'center'}}>{badge}</div>
      <div style={{flex: 1, minWidth: 0}}>
        <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: 38, color: p.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{n.title}</div>
        <div style={{fontFamily: PLEX, fontSize: 25, color: p.muted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{n.sub}</div>
      </div>
      {extra}
    </div>
  );
};

export const DesignScene = ({s}: {s: Scene}) => {
  const p = useTh();
  const {frame, f, fps} = useT();
  const dur = Math.round(s.dur * fps);
  const nodes = param<FlowNode[]>(s, 'nodes', []).slice(0, 5);
  const badges = {...DEFAULT_BADGES, ...param<Partial<Record<NodeKind, string>>>(s, 'badges', {})};
  const store = param<{at: number; title: string; sub: string; sub_after: string} | null>(s, 'store', null);
  const loopDef = param<{from: number; label: string} | null>(s, 'loop', null);
  const at = nodes.map((n, i) => (n.beat && s.beats[n.beat] !== undefined ? f(s.beats[n.beat]!) - 6 : i === 0 ? 10 : Math.round(10 + (i * (dur * 0.7)) / Math.max(1, nodes.length))));
  const tLoop = f(beat(s, 'loop', (dur * 0.75) / fps));
  const tLearn = f(beat(s, 'learn', (dur * 0.85) / fps));
  const activeIdx = at.findLastIndex((t) => frame >= t);
  const sIdx = store?.at ?? -1;
  const sY = nodeY(Math.max(0, sIdx)) - 40;
  const sH = 200;
  const storeOn = sIdx >= 0 ? k01(frame, (at[sIdx] ?? 0) + 4, 14) : 0;
  const arrowIn = sIdx >= 0 ? k01(frame, (at[sIdx] ?? 0) + 14, 12) : 0;
  const loop = loopDef ? k01(frame, tLoop - 4, 30, EASE_IO) : 0;
  const learn = loopDef && frame >= tLearn ? 0.5 + 0.5 * Math.sin((frame - tLearn) / 5) : 0;
  const loopY = nodeY(loopDef?.from ?? 0) + NODE_H / 2;
  const loopPath = `M ${COL.x + COL.w + 4} ${loopY} H ${LANE.x + LANE.w / 2} V ${sY + sH + 12}`;
  const loopLen = Math.abs(LANE.x + LANE.w / 2 - COL.x - COL.w - 4) + Math.abs(loopY - sY - sH - 12);
  const extraFor = (n: FlowNode, i: number): JSX.Element | undefined => {
    const e = n.extra;
    if (!e) return undefined;
    const t0 = at[i] ?? 0;
    if (e.type === 'stack') {
      const v = Math.round(interpolate(frame, [t0 + 6, t0 + 46], [e.from, e.to], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_IO}));
      return (
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6}}>
          <div style={{display: 'flex', flexWrap: 'wrap', width: 110, justifyContent: 'flex-end', gap: 3}}>
            {Array.from({length: Math.min(40, v)}, (_, j) => <div key={j} style={{width: 9, height: 12, borderRadius: 2, background: j % 5 === 0 ? '#E5383B' : '#C9D0E0'}} />)}
          </div>
          <div style={{fontFamily: MONO, fontSize: 20, color: p.accent}}>{v} {e.label}</div>
        </div>
      );
    }
    if (e.type === 'checks') {
      return (
        <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
          {e.items.map((c, j) => <div key={c} style={{fontFamily: MONO, fontSize: 18, color: p.ok, opacity: k01(frame, t0 + 16 + j * 6, 8), whiteSpace: 'nowrap'}}>{c} ✓</div>)}
        </div>
      );
    }
    const k = k01(frame, t0 + 22, 12);
    return (
      <div style={{opacity: k, scale: String(0.8 + 0.2 * k), textAlign: 'right'}}>
        <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: 44, color: p.ok, lineHeight: 1}}>{e.value}</div>
        <div style={{fontFamily: MONO, fontSize: 17, color: p.muted}}>{e.label}</div>
      </div>
    );
  };
  return (
    <AbsoluteFill>
      <Backdrop />
      <Camera keys={[{f: 0, cx: 540, cy: 960, s: 1}, {f: tLoop - 6, cx: 560, cy: 900, s: 1.04, len: 40}]}>
        {nodes.slice(1).map((_, i) => {
          const a = at[i + 1] ?? 0;
          const k = k01(frame, a - 10, 12);
          const y0 = nodeY(i) + NODE_H;
          const h = nodeY(i + 1) - y0;
          const dot = frame > a + 8 ? ((frame - a) % 30) / 30 : -1;
          return (
            <div key={i} style={{position: 'absolute', left: COL.x + COL.w / 2 - 1.5, top: y0, width: 3, height: h}}>
              <div style={{position: 'absolute', inset: 0, background: p.accent, transformOrigin: '50% 0', scale: `1 ${k}`, opacity: 0.7}} />
              {dot >= 0 && <div style={{position: 'absolute', left: -5, top: dot * h - 6, width: 13, height: 13, borderRadius: '50%', background: p.ink,
                boxShadow: `0 0 14px ${p.accent}`}} />}
            </div>
          );
        })}
        {nodes.map((n, i) => (
          <FlowBox key={i} n={n} y={nodeY(i)} on={k01(frame, at[i] ?? 0, 14)} hot={i === activeIdx ? 1 : 0} extra={extraFor(n, i)} badge={badges[n.kind]} />
        ))}
        {store && (
          <div style={{position: 'absolute', left: LANE.x, top: sY, width: LANE.w, height: sH, borderRadius: 20, opacity: storeOn,
            border: `2px solid ${learn > 0 ? p.ok : p.accent}`, background: p.surface2, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 6, boxShadow: `0 0 ${20 + 50 * learn}px ${learn > 0 ? p.okSoft : p.glow}`}}>
            <svg viewBox="0 0 24 24" style={{width: 56, height: 56, fill: 'none', stroke: p.accent, strokeWidth: 1.8}}>
              <ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
            </svg>
            <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: 26, color: p.ink, textAlign: 'center', lineHeight: 1.1, padding: '0 10px'}}>{store.title}</div>
            <div style={{fontFamily: MONO, fontSize: 17, color: learn > 0 ? p.ok : p.muted, textAlign: 'center'}}>{learn > 0 ? store.sub_after : store.sub}</div>
          </div>
        )}
        <svg width={1080} height={1400} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          <defs>
            <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" fill={p.accent} />
            </marker>
            <marker id="ahok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" fill={p.ok} />
            </marker>
          </defs>
          {store && (
            <path d={`M ${LANE.x - 6} ${nodeY(sIdx) + NODE_H / 2} H ${COL.x + COL.w + 12}`} stroke={p.accent} strokeWidth={3} fill="none"
              markerEnd={arrowIn > 0.95 ? 'url(#ah)' : undefined} opacity={arrowIn} strokeDasharray={40} strokeDashoffset={40 * (1 - arrowIn)} />
          )}
          {store && loopDef && (
            <path d={loopPath} stroke={p.ok} strokeWidth={4} fill="none" markerEnd={loop > 0.98 ? 'url(#ahok)' : undefined} opacity={loop > 0 ? 1 : 0}
              strokeDasharray={loopLen} strokeDashoffset={loopLen * (1 - loop)} />
          )}
        </svg>
        {store && loopDef && (
          <div style={{position: 'absolute', left: LANE.x - 10, top: loopY + 24, width: LANE.w + 20, textAlign: 'center', opacity: k01(frame, tLoop + 10, 12),
            fontFamily: MONO, fontSize: 21, letterSpacing: 2, color: p.ok, lineHeight: 1.3}}>{loopDef.label}</div>
        )}
      </Camera>
      <Notes notes={param<NoteDef[]>(s, 'notes', [{kind: 'CONCEPTUAL', text: 'Diseño del proceso'}])} top={92} on={k01(frame, 4, 10)} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ IMPACTO: antes vs. después */
type ImpactCard = {value: string; unit?: string; label: string; tag: TagKind; tone?: 'ok' | 'review' | 'accent'};
export const ImpactScene = ({s}: {s: Scene}) => {
  const p = useTh();
  const {frame, f} = useT();
  const before = param(s, 'before', {label: 'A mano', minutes: 60, tasks: ['Recibir', 'Cargar', 'Controlar', 'Corregir'], caption: 'Todo el tiempo es trabajo manual'});
  const after = param(s, 'after', {label: 'Con IA', ai: 10, review: 5, ai_label: 'IA', detail: '{ai} min de proceso · {review} de revisión', caption: 'El equipo interviene solo en las excepciones'});
  const unit = param(s, 'unit', 'min');
  const cards = param<ImpactCard[]>(s, 'cards', []);
  const W = 900;
  const px = W / before.minutes;
  const tM = f(beat(s, 'manual', 3));
  const tA = f(beat(s, 'ai', 5));
  const tR = f(beat(s, 'review', 6.5));
  const m = k01(frame, 8, Math.max(20, tM - 8), EASE_IO);
  const a = k01(frame, tA - 4, 16);
  const r = k01(frame, tR - 4, 14);
  const tone = (t?: string) => (t === 'review' ? p.review : t === 'accent' ? p.accent : p.ok);
  return (
    <AbsoluteFill>
      <Backdrop />
      <div style={{position: 'absolute', left: 90, right: 90, top: 270, display: 'flex', alignItems: 'center', gap: 18, opacity: k01(frame, 0, 10)}}>
        <Mono style={{color: p.ink, fontSize: 26}}>{param(s, 'label', 'En la operación')}</Mono>
        <Tag kind={param<TagKind>(s, 'tag', 'ESTIMACIÓN')} />
      </div>
      <div style={{position: 'absolute', left: 90, top: 420, width: W}}>
        <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', opacity: k01(frame, 4, 12)}}>
          <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: 50, color: p.muted}}>{before.label}</div>
          <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: 64, color: p.ink}}>≈ {before.minutes} {unit}</div>
        </div>
        <div style={{position: 'relative', height: 92, marginTop: 18, borderRadius: 18, overflow: 'hidden', background: p.surface}}>
          <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: W * m, display: 'flex', gap: 4}}>
            {before.tasks.map((tk) => (
              <div key={tk} style={{flex: 1, background: p.surface2, border: `1px solid ${p.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: p.ink,
                fontFamily: PLEX, fontSize: 26, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap'}}>
                <span style={{opacity: interpolate(m, [0.8, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>{tk}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{fontFamily: PLEX, fontSize: 27, color: p.muted, marginTop: 12, opacity: m}}>{before.caption}</div>
        <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 100, opacity: a}}>
          <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: 50, color: p.ink}}>{after.label}</div>
          <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: 64, color: p.accent, textShadow: `0 0 30px ${p.glow}`}}>≈ {r > 0.01 ? after.ai + after.review : after.ai} {unit}</div>
        </div>
        <div style={{position: 'relative', height: 92, marginTop: 18}}>
          <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: after.ai * px * a, opacity: a, borderRadius: '18px 0 0 18px',
            border: `3px dashed ${p.accent}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: MONO, fontSize: 22, color: p.accent, overflow: 'hidden', whiteSpace: 'nowrap'}}>{after.ai_label}</div>
          <div style={{position: 'absolute', left: after.ai * px + 4, top: 0, bottom: 0, width: after.review * px * r, borderRadius: '0 18px 18px 0', background: p.ok}} />
          <div style={{position: 'absolute', left: (after.ai + after.review) * px + 26, top: 0, bottom: 0, display: 'flex', alignItems: 'center', opacity: r,
            fontFamily: PLEX, fontSize: 30, color: p.ink, fontWeight: 600, whiteSpace: 'nowrap'}}>
            {after.detail.replace('{ai}', String(after.ai)).replace('{review}', String(after.review))}
          </div>
        </div>
        <div style={{fontFamily: PLEX, fontSize: 28, color: p.ok, marginTop: 14, opacity: r, fontWeight: 600}}>{after.caption}</div>
      </div>
      {cards.length > 0 && (
        <div style={{position: 'absolute', left: 90, right: 90, top: 1060, display: 'flex', gap: 24, opacity: k01(frame, tR + 18, 14),
          translate: `0px ${(1 - k01(frame, tR + 18, 14)) * 20}px`}}>
          {cards.slice(0, 3).map((c, i) => (
            <div key={i} style={{flex: 1, padding: '22px 26px', borderRadius: 20, background: p.surface, border: `1.5px solid ${p.line}`}}>
              <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: 54, color: tone(c.tone)}}>{c.value} <span style={{fontSize: 30, color: p.muted}}>{c.unit ?? ''}</span></div>
              <div style={{fontFamily: PLEX, fontSize: 25, color: p.muted, marginTop: 4}}>{c.label}</div>
              <div style={{marginTop: 12}}><Tag kind={c.tag} /></div>
            </div>
          ))}
        </div>
      )}
      <div style={{position: 'absolute', left: 90, right: 90, top: 1300, fontFamily: PLEX, fontSize: 22, color: p.faint, opacity: k01(frame, tM, 20)}}>
        {param<string>(s, 'disclaimer', '')}
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ OPENER / CIERRE: la transformación */
const RINGS = [{r: 0, n: 1}, {r: 190, n: 6}, {r: 380, n: 12}, {r: 590, n: 18}, {r: 820, n: 24}];
const NET = RINGS.flatMap((ring, ri) => Array.from({length: ring.n}, (_, i) => {
  const ang = (i / ring.n) * Math.PI * 2 + ri * 0.37;
  return {ri, x: Math.cos(ang) * ring.r, y: Math.sin(ang) * ring.r};
}));
const NET_EDGES = NET.flatMap((nd, i) => {
  if (nd.ri === 0) return [];
  const inner = NET.map((m, j) => ({m, j})).filter(({m}) => m.ri === nd.ri - 1);
  const best = inner.reduce((acc, c) => ((c.m.x - nd.x) ** 2 + (c.m.y - nd.y) ** 2 < (acc.m.x - nd.x) ** 2 + (acc.m.y - nd.y) ** 2 ? c : acc), inner[0]!);
  return [{a: best.j, b: i, ri: nd.ri}];
});

/** Red de procesos que se enciende desde el centro hacia afuera. Determinista. */
export const Network = ({at, cx, cy}: {at: number; cx: number; cy: number}) => {
  const p = useTh();
  const {frame} = useT();
  const lit = (ri: number) => k01(frame, at + ri * 7, 12);
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: 0.5}}>
      <g transform={`translate(${cx} ${cy}) rotate(${(frame - at) * 0.06})`}>
        {NET_EDGES.map((e, i) => {
          const A = NET[e.a]!;
          const B = NET[e.b]!;
          const k = lit(e.ri);
          return <line key={i} x1={A.x} y1={A.y} x2={A.x + (B.x - A.x) * k} y2={A.y + (B.y - A.y) * k} stroke={p.accent} strokeWidth={2} opacity={0.7} />;
        })}
        {NET.map((nd, i) => {
          const k = lit(nd.ri);
          const pulse = frame > at + nd.ri * 7 + 12 ? 0.6 + 0.4 * Math.sin((frame + i * 11) / 9) : 1;
          return <circle key={i} cx={nd.x} cy={nd.y} r={(nd.ri === 0 ? 16 : 8) * k} fill={nd.ri % 2 ? p.ok : p.accent} opacity={k * pulse} />;
        })}
      </g>
    </svg>
  );
};

/**
 * `opener` (abre el video con la promesa) y `close` (cierra con el mensaje + el título). Mismo componente:
 * con el beat `msg` muestra primero el mensaje y los pares (`pair1`, `pair2`…); con `proc`/`fast` anima la etiqueta del proceso y la frase final.
 */
export const CloseScene = ({s}: {s: Scene}) => {
  const p = useTh();
  const {frame, f} = useT();
  const hasMsg = s.beats['msg'] !== undefined;
  const tMsg = f(beat(s, 'msg', 0.8));
  const pairs = param<[string, string, string?][]>(s, 'pairs', []);
  const pairBeats = pairs.map((_, i) => f(beat(s, `pair${i + 1}`, 2.5 + i * 2)));
  const tTitle = f(beat(s, 'title', hasMsg ? 7 : 0.35));
  const head = param<string[]>(s, 'headline', ['Transformación', 'de procesos con IA']);
  const client = param<string>(s, 'client', '');
  const outA = k01(frame, tTitle - 8, 10, EASE_IO);
  const flash = frame >= tTitle ? Math.max(0, 0.5 - (frame - tTitle) * 0.04) : 0;
  const scan = interpolate(frame, [tTitle, tTitle + 26], [150, 1500], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_IO});
  const sweep = interpolate(frame, [tTitle + 40, tTitle + 80], [-300, 1300], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_IO});
  const sig = k01(frame, tTitle + 60, 18);
  const procAt = s.beats['proc'] !== undefined ? f(beat(s, 'proc', 2)) - 6 : tTitle + 38;
  const hasFast = s.beats['fast'] !== undefined;
  const fastAt = hasFast ? f(beat(s, 'fast', 3)) - 4 : procAt + 6;
  const proc = k01(frame, procAt, 14);
  const fast = k01(frame, fastAt, 10);
  const brand = param<string>(s, 'brand', '');
  const signature = param<string>(s, 'signature', '');
  const note = param<NoteDef | null>(s, 'note', null);
  const process = param<string>(s, 'process', '');
  const headTop = client ? 470 : 330;
  const headSize = client ? 86 : 90;
  const chipTop = client ? 720 : 590;
  const push = frame >= tTitle ? 1 + Math.min(0.06, (frame - tTitle) * 0.0006) : 1;
  const tone = (t?: string) => (t === 'ok' ? p.ok : t === 'review' ? p.review : p.accent);
  return (
    <AbsoluteFill>
      <Backdrop floor speed={frame >= tTitle ? 5 : 1.5} />
      {frame >= tTitle - 2 && <Network at={tTitle - 2} cx={540} cy={720} />}
      {hasMsg && (
        <AbsoluteFill style={{opacity: 1 - outA, filter: `blur(${outA * 12}px)`, scale: String(1 + 0.08 * outA)}}>
          <MaskTitle lines={param<string[]>(s, 'message', ['Eso es innovar', 'en tu proceso.'])} at={tMsg - 8} top={360} size={100} />
          <div style={{position: 'absolute', left: 90, right: 90, top: 720}}>
            {pairs.map(([left, right, t], i) => {
              const k = k01(frame, (pairBeats[i] ?? 0) - 4, 14);
              return (
                <div key={i} style={{display: 'flex', alignItems: 'center', gap: 22, opacity: k, translate: `${(1 - k) * 40}px 0px`, height: 96}}>
                  <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: 52, color: p.ink, width: 320}}>{left}</div>
                  <svg viewBox="0 0 24 24" style={{width: 46, height: 46, fill: 'none', stroke: tone(t), strokeWidth: 2.4}}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: 52, color: tone(t)}}>{right}</div>
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      )}
      {frame >= tTitle - 4 && (
        <AbsoluteFill style={{scale: String(push)}}>
          {client && (
            <>
              <div style={{position: 'absolute', left: 80, right: 80, top: 300, overflow: 'hidden', paddingBottom: '0.1em'}}>
                <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: 100, lineHeight: 1.04, letterSpacing: -2, color: p.ink,
                  translate: `0px ${(1 - k01(frame, tTitle - 2, 18)) * 110}%`, textShadow: `0 0 40px ${p.glow}`}}>{client}</div>
              </div>
              <div style={{position: 'absolute', left: 80, top: 430, height: 5, width: 280 * k01(frame, tTitle + 10, 16), background: p.accent, boxShadow: `0 0 18px ${p.glow}`}} />
            </>
          )}
          <MaskTitle lines={head} at={client ? tTitle + 14 : tTitle - 2} top={headTop} size={headSize} gap={7} accentFrom={1} />
          <div style={{position: 'absolute', left: sweep, top: 280, width: 220, height: 480, opacity: 0.55, mixBlendMode: 'screen',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)', filter: 'blur(20px)', rotate: '12deg'}} />
          {process && (
            <div style={{position: 'absolute', left: 80, right: 80, top: chipTop, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18, opacity: proc,
              translate: `${(1 - proc) * -30}px 0px`}}>
              <div style={{display: 'inline-flex', alignItems: 'center', gap: 12, padding: '12px 22px', borderRadius: 14, border: `2px solid ${p.ok}`,
                background: p.okSoft, fontFamily: PLEX, fontWeight: 700, fontSize: 34, color: p.ok}}>✓ {process}</div>
              <div style={{fontFamily: PLEX, fontSize: hasFast ? 44 : 30, fontWeight: hasFast ? 700 : 400, color: hasFast ? p.ink : p.muted,
                opacity: hasFast ? fast : 1, scale: String(hasFast ? 0.85 + 0.15 * fast : 1), transformOrigin: 'left center',
                textShadow: hasFast ? `0 0 30px ${p.glow}` : 'none'}}>{param<string>(s, 'tagline', '')}</div>
            </div>
          )}
          {note && <Note kind={note.kind} style={{position: 'absolute', left: 80, top: chipTop + 120, opacity: k01(frame, fastAt + 24, 12)}}>{note.text}</Note>}
          {(brand || signature) && (
            <div style={{position: 'absolute', left: 80, right: 80, top: 1000, opacity: sig, translate: `0px ${(1 - sig) * 24}px`, display: 'flex',
              alignItems: 'center', gap: 22}}>
              {brand && <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: 52, color: p.ink, letterSpacing: 8}}>{brand}</div>}
              {brand && signature && <div style={{width: 2, height: 46, background: p.line}} />}
              {signature && <div style={{fontFamily: PLEX, fontSize: 28, color: p.muted}}>{signature}</div>}
            </div>
          )}
        </AbsoluteFill>
      )}
      {frame >= tTitle && frame < tTitle + 28 && (
        <div style={{position: 'absolute', left: 0, right: 0, top: scan, height: 3, background: p.accent, boxShadow: `0 0 30px 6px ${p.glow}`}} />
      )}
      <AbsoluteFill style={{background: '#FFFFFF', opacity: flash, mixBlendMode: 'overlay'}} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ OUTRO de marca (opcional) */
export const OutroScene = ({s}: {s: Scene}) => {
  const p = useTh();
  const {frame} = useT();
  const brand = param<string>(s, 'brand', '');
  const sweep = interpolate(frame, [30, 62], [-300, 1300], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_IO});
  const line = k01(frame, 20, 16);
  const sig = k01(frame, 28, 14);
  const size = brand.length <= 4 ? 250 : Math.max(110, (900 / Math.max(1, brand.length)) * 1.6);
  return (
    <AbsoluteFill>
      <Backdrop floor speed={2} />
      <Network at={-30} cx={540} cy={900} />
      <div style={{position: 'absolute', left: 40, right: 40, top: 640, display: 'flex', justifyContent: 'center', gap: brand.length <= 4 ? 34 : 4}}>
        {brand.split('').map((ch, i) => {
          const k = k01(frame, 2 + i * Math.max(1, Math.round(15 / Math.max(1, brand.length))), 16);
          return (
            <div key={i} style={{fontFamily: PLEX, fontWeight: 700, fontSize: size, lineHeight: 1, color: p.ink, opacity: k, translate: `0px ${(1 - k) * 90}px`,
              filter: `blur(${(1 - k) * 10}px)`, textShadow: `0 0 ${40 + 20 * Math.sin(frame / 8)}px ${p.glow}`, whiteSpace: 'pre'}}>{ch}</div>
          );
        })}
      </div>
      <div style={{position: 'absolute', left: sweep, top: 600, width: 200, height: 340, opacity: 0.5, mixBlendMode: 'screen', rotate: '12deg',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)', filter: 'blur(18px)'}} />
      <div style={{position: 'absolute', left: 540 - 180 * line, top: 935, width: 360 * line, height: 5, background: p.accent, boxShadow: `0 0 18px ${p.glow}`}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 975, textAlign: 'center', opacity: sig, translate: `0px ${(1 - sig) * 16}px`,
        fontFamily: PLEX, fontSize: 38, color: p.muted}}>{param<string>(s, 'signature', '')}</div>
    </AbsoluteFill>
  );
};
