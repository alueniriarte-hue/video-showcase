/** Composición completa: escenas en secuencia, marca de capítulo, HUD de pasos, subtítulos por frase y audio (voz + música + SFX). */
import {Audio} from '@remotion/media';
import type {JSX} from 'react';
import {AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {DataCtx, FONTS_READY, MONO, PLEX, Shell, ThemeCtx, useTh} from './kit.tsx';
import type {Scene, VideoProps} from './kit.tsx';
import {chapterAt, chunkCaptions, k01, stepSpan} from './motion.ts';
import type {Cap, Chapter} from './motion.ts';
import {BeforeThemeCtx} from './scenes/contexts.ts';
import {PAPER, resolveTheme} from './theme.ts';
import {CheckScene, DeliverScene, InputScene, LearnScene, ProcessScene, ReviewScene, ScanScene, TableCheckScene} from './scenes/steps.tsx';
import {BeforeScene, CloseScene, DesignScene, ImpactScene, IntroScene, OutroScene, TurnScene} from './scenes/story.tsx';

void FONTS_READY; // las fuentes del repo se registran al cargar el módulo (loadFont bloquea el render hasta que estén)

export const VIEWS: Record<string, (p: {s: Scene}) => JSX.Element> = {
  opener: CloseScene, intro: IntroScene, before: BeforeScene, turn: TurnScene, design: DesignScene,
  input: InputScene, process: ProcessScene, check: CheckScene, 'table-check': TableCheckScene, scan: ScanScene,
  review: ReviewScene, learn: LearnScene, deliver: DeliverScene, impact: ImpactScene, close: CloseScene, outro: OutroScene,
};
const NO_CAPTIONS = new Set(['intro', 'opener', 'outro', 'turn']);
const OVER = 10;

/** HUD del paso a paso: paso actual + riel (un paso puede abarcar varias escenas). */
const StepHud = ({scenes}: {scenes: Scene[]}) => {
  const p = useTh();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const nums = [...new Set(scenes.map((s) => s.step).filter((n): n is number => n !== null))];
  const steps = nums.map((n) => ({n, span: stepSpan(scenes, n)!, label: scenes.find((s) => s.step === n)?.step_label ?? ''}));
  const cur = steps.find((s) => t >= s.span.start && t < s.span.end);
  const first = steps[0];
  const last = steps[steps.length - 1];
  if (!first || !last) return null;
  const on = k01(frame, Math.round(first.span.start * fps) + 4, 12) * (1 - k01(frame, Math.round(last.span.end * fps) - 10, 10));
  if (on <= 0) return null;
  const n = cur?.n ?? 0;
  const k = cur ? k01(frame, Math.round(cur.span.start * fps) + 6, 14) : 0;
  return (
    <div style={{position: 'absolute', left: 60, right: 60, top: 92, height: 92, opacity: on}}>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 18}}>
        <span style={{fontFamily: MONO, fontSize: 24, letterSpacing: 3, color: p.accent}}>PASO {n}/{steps.length}</span>
        <span style={{fontFamily: PLEX, fontWeight: 700, fontSize: 42, color: p.ink, opacity: k, translate: `${(1 - k) * 18}px 0px`}}>{cur?.label ?? ''}</span>
      </div>
      <div style={{display: 'flex', gap: 8, marginTop: 14}}>
        {steps.map((s) => {
          const fill = s.n < n ? 1 : s.n === n ? Math.min(1, Math.max(0, (t - s.span.start) / (s.span.end - s.span.start))) : 0;
          return (
            <div key={s.n} style={{flex: 1, height: 6, borderRadius: 3, background: p.line, overflow: 'hidden'}}>
              <div style={{width: `${fill * 100}%`, height: '100%', background: p.accent, boxShadow: `0 0 10px ${p.glow}`}} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Marca de capítulo (la agenda de la intro, siempre visible): "02 / 04 · DISEÑO DEL PROCESO". */
const ChapterTag = ({chapters, scenes, before}: {chapters: Chapter[]; scenes: Scene[]; before: string}) => {
  const p = useTh();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ch = chapterAt(chapters, scenes, frame / fps);
  if (!ch) return null;
  const a = Math.round(ch.start * fps);
  const b = Math.round(ch.end * fps);
  const on = k01(frame, a + 2, 10) * (1 - k01(frame, b - 8, 8));
  const label = `${String(ch.n).padStart(2, '0')} / ${String(chapters.length).padStart(2, '0')} · ${ch.label.toUpperCase()}`;
  const typed = label.slice(0, Math.max(0, Math.floor((frame - a - 2) * 2.2)));
  const now = scenes.find((s) => frame / fps >= s.start && frame / fps < s.start + s.dur);
  const light = now?.type === 'before';
  return (
    <div style={{position: 'absolute', left: 60, top: 40, display: 'flex', alignItems: 'center', gap: 14, opacity: on}}>
      <div style={{width: 10, height: 10, borderRadius: 2, background: light ? before : p.accent}} />
      <span style={{fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: light ? before : p.muted}}>{typed}</span>
    </div>
  );
};

const NUM = /^([0-9][0-9.,%]*|cero|un[oa]?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|quince|veinte|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|cien|ciento|doscientos|trescientos|cuatrocientos|quinientos|mil|millones?)[.,:;!?…]*$/iu;

/** Subtítulos por frase con la palabra en curso resaltada; franja de lectura fija 1370–1620. */
const Captions = ({caps, scenes, paper}: {caps: Cap[]; scenes: Scene[]; paper: {bg: string; ink: string; faint: string}}) => {
  const p = useTh();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const groups = chunkCaptions(caps.filter((c) => {
    const sc = scenes.find((s) => c.line.startsWith(`${s.id}-`) && /^[0-9]+$/.test(c.line.slice(s.id.length + 1)));
    if (!sc) return true;
    const li = Number(c.line.slice(sc.id.length + 1));
    return !NO_CAPTIONS.has(sc.type) && !((sc.params['nocap'] as number[] | undefined) ?? []).includes(li);
  }), 6);
  const t = frame / fps;
  const now = scenes.find((s) => t >= s.start && t < s.start + s.dur);
  const isBefore = now?.type === 'before';
  const hasQ = isBefore && now.beats['q'] !== undefined;
  const plateFrom = now ? now.start + (hasQ ? (now.beats['sheet'] ?? 0) - 0.3 : 0) : 0;
  const plateTo = hasQ && now ? now.start + now.dur - 0.8 : Infinity;
  const plateOn = now && !NO_CAPTIONS.has(now.type) ? Math.min(1, Math.max(0, (t - plateFrom) * 3), Math.max(0, (plateTo - t) * 5)) : 0;
  const plate = isBefore ? paper.bg : p.bg;
  const g = groups.find((gr) => ms >= (gr[0]?.startMs ?? 0) - 80 && ms < (gr[gr.length - 1]?.endMs ?? 0) + 220);
  const k = g ? Math.min(1, (ms - ((g[0]?.startMs ?? 0) - 80)) / 140) : 0;
  const sc = g ? scenes.find((s) => g[0]?.line.startsWith(`${s.id}-`)) : undefined;
  const light = sc?.type === 'before';
  return (
    <>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1370, height: 250, opacity: plateOn,
        background: `linear-gradient(to bottom, ${plate}00 0%, ${plate}E6 28%, ${plate}E6 72%, ${plate}00 100%)`}} />
      <div style={{position: 'absolute', left: 60, right: 60, top: 1420, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
        <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: 50, lineHeight: 1.22, opacity: k, translate: `0px ${(1 - k) * 10}px`,
          textShadow: light || !p.dark ? 'none' : '0 2px 18px rgba(0,0,0,0.8)'}}>
          {(g ?? []).map((w, i) => {
            const on = ms >= w.startMs;
            const ink = light ? paper.ink : p.ink;
            const dim = light ? paper.faint : p.faint;
            return <span key={i} style={{color: on ? (NUM.test(w.text) ? p.accent : ink) : dim}}>{w.text} </span>;
          })}
        </div>
      </div>
    </>
  );
};

export const ShowcaseVideo = (props: VideoProps) => {
  const fps = props.fps;
  // el tema sale de theme.json (preset o colores propios); el "antes" va en papel salvo que se pida el mismo tema
  const theme = props.theme ?? resolveTheme(props.theme_input ?? {preset: 'nocturno'});
  const beforeTheme = props.before_theme ?? (props.theme_input?.before === 'same' ? theme : PAPER);
  return (
    <ThemeCtx.Provider value={theme}>
      <BeforeThemeCtx.Provider value={beforeTheme}>
        <DataCtx.Provider value={props.dataset ?? {}}>
          <AbsoluteFill style={{background: theme.bg}}>
            {props.scenes.map((s) => {
              const View = VIEWS[s.type];
              if (!View) throw new Error(`tipo de escena sin vista: ${s.type}`);
              const over = s.type === 'before' ? 3 : OVER;
              const dur = Math.round(s.dur * fps) + over;
              return (
                <Sequence key={s.id} from={Math.round(s.start * fps)} durationInFrames={dur} name={`${s.type}:${s.id}`}>
                  <Shell dur={dur} inLen={s.type === 'turn' ? 3 : OVER} outLen={over}><View s={s} /></Shell>
                </Sequence>
              );
            })}
            <ChapterTag chapters={props.chapters ?? []} scenes={props.scenes} before={beforeTheme.muted} />
            <StepHud scenes={props.scenes} />
            <Captions caps={props.captions} scenes={props.scenes} paper={beforeTheme} />
            {props.audio && <Audio src={staticFile(props.audio)} />}
          </AbsoluteFill>
        </DataCtx.Provider>
      </BeforeThemeCtx.Provider>
    </ThemeCtx.Provider>
  );
};
