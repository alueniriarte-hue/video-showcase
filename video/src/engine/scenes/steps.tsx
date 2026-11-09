/**
 * Escenas del paso a paso: input (carga), process (procesamiento acelerado), check (control con ecuación), table-check (control
 * por tabla), scan (bajada del universo completo + excepciones), review (control humano), learn (reglas nuevas), deliver (entrega).
 * Ritmo pausado con puntero guía; SOLO el procesamiento y los conteos van acelerados (y lo dicen en pantalla).
 * Interfaz RECREADA (ILUSTRATIVA). Textos desde `params`; el universo de filas desde `dataset.scan`.
 */
import {AbsoluteFill, interpolate} from 'remotion';
import {buildRows} from '../data.ts';
import type {Row, ScanData} from '../data.ts';
import {AppWindow, Backdrop, Camera, DocIcon, FastForward, Mono, MONO, Notes, PLEX, Pointer, Spotlight, useData, useTh, useT, beat, param} from '../kit.tsx';
import type {NoteDef, Scene} from '../kit.tsx';
import {countUp, EASE, EASE_IO, k01, pathAt} from '../motion.ts';

const WIN = {left: 50, top: 300, w: 980, h: 900};
type ScanLabels = {file?: string; columns?: string[]; field_label?: string; review_prefix?: string; ok_label?: string; review_label?: string;
  badges?: {review?: string; fixed?: string; ok?: string}};
type ScanDataset = ScanData & ScanLabels;
const useScan = (): ScanDataset => (useData()['scan'] as ScanDataset | undefined) ?? {total: 60, auto: 56, rows: []};

/* ------------------------------------------------------------------ INPUT · carga */
export const InputScene = ({s}: {s: Scene}) => {
  const p = useTh();
  const {frame, f} = useT();
  const items = param<string[]>(s, 'items', ['Archivo 1', 'Archivo 2', 'Archivo 3']).slice(0, 3);
  const tDrag = f(beat(s, 'drag', 1.2));
  const tDrop = f(beat(s, 'drop', 2.6));
  const tClick = f(beat(s, 'click', 4.2));
  const grab = tDrag - 4;
  const drop = Math.max(tDrop, grab + 18);
  const stack = {x: 800, y: 1300};
  const zone = {x: 540, y: 610};
  const slots = [250, 540, 830];
  const fly = k01(frame, grab + 2, drop - grab - 2, EASE_IO);
  const spread = k01(frame, drop, 16);
  const btn = {x: 540, y: 1115};
  const press = frame >= tClick && frame < tClick + 8;
  const keys = [
    {f: 0, x: 980, y: 1500},
    {f: grab, x: stack.x + 20, y: stack.y - 30, click: true},
    {f: drop, x: zone.x + 20, y: zone.y - 10},
    {f: drop + 10, x: zone.x + 20, y: zone.y - 10},
    {f: tClick, x: btn.x + 120, y: btn.y + 10, click: true},
  ];
  return (
    <AbsoluteFill>
      <Backdrop />
      <Camera keys={[{f: 0, cx: 540, cy: 900, s: 1}, {f: drop - 8, cx: 540, cy: 820, s: 1.06, len: 30}, {f: tClick - 22, cx: 540, cy: 960, s: 1.04, len: 22}]}>
        <AppWindow title={param(s, 'window_title', 'Nueva herramienta')} style={{left: WIN.left, top: WIN.top, width: WIN.w, height: WIN.h}}>
          <div style={{position: 'absolute', left: 40, right: 40, top: 40, height: 470, borderRadius: 22, border: `3px dashed ${spread > 0 ? p.ok : p.accent}`,
            background: fly > 0 && spread < 1 ? p.surface2 : 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
            <div style={{opacity: 1 - spread, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18}}>
              <svg viewBox="0 0 24 24" style={{width: 90, height: 90, fill: 'none', stroke: p.accent, strokeWidth: 1.6}}><path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4" /></svg>
              <div style={{fontFamily: PLEX, fontSize: 38, fontWeight: 600, color: p.ink}}>{param(s, 'drop_title', 'Soltá los archivos acá')}</div>
              <Mono style={{fontSize: 21}}>{param(s, 'drop_sub', 'en lote')}</Mono>
            </div>
          </div>
          <div style={{position: 'absolute', left: 40, right: 40, top: 560, display: 'flex', gap: 18, opacity: spread}}>
            {items.map((it, i) => {
              const k = k01(frame, drop + 8 + i * 5, 12);
              return (
                <div key={i} style={{flex: 1, padding: '16px 18px', borderRadius: 14, background: p.surface2, border: `1.5px solid ${p.line}`, display: 'flex',
                  alignItems: 'center', gap: 12, opacity: k, translate: `0px ${(1 - k) * 14}px`}}>
                  <div style={{width: 30, height: 30, borderRadius: 8, background: p.okSoft, color: p.ok, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: PLEX, fontWeight: 700, fontSize: 22}}>✓</div>
                  <div style={{fontFamily: PLEX, fontSize: 25, color: p.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{it}</div>
                </div>
              );
            })}
          </div>
          <div style={{position: 'absolute', left: 40, right: 40, top: 650, fontFamily: MONO, fontSize: 21, color: p.muted, opacity: spread}}>{param<string>(s, 'summary', '')}</div>
        </AppWindow>
        {(() => {
          const lit = k01(frame, drop + 20, 12);
          const done = frame >= tClick;
          return (
            <div style={{position: 'absolute', left: btn.x - 310, top: btn.y - 50, width: 620, height: 100, borderRadius: 22, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 16, fontFamily: PLEX, fontWeight: 700, fontSize: 38, scale: String(press ? 0.96 : 1),
              background: lit > 0.5 ? p.accent : p.surface2, color: lit > 0.5 ? p.onAccent : p.muted, border: `1.5px solid ${lit > 0.5 ? p.accent : p.line}`,
              boxShadow: lit > 0.5 ? `0 0 ${done ? 60 : 30}px ${p.glow}` : 'none'}}>
              <svg viewBox="0 0 24 24" style={{width: 40, height: 40, fill: lit > 0.5 ? p.onAccent : p.muted}}><path d="M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4z" /></svg>
              {done ? param(s, 'button_busy', 'Procesando…') : param(s, 'button', 'Procesar con IA')}
            </div>
          );
        })()}
        {items.map((it, i) => {
          const x0 = stack.x - 60 + i * 26;
          const y0 = stack.y - 70 - i * 10;
          const xm = zone.x - 75 + (i - 1) * 30;
          const ym = zone.y - 95;
          const x = interpolate(fly, [0, 1], [x0, xm]) + ((slots[i] ?? 540) - 75 - xm) * spread;
          const y = interpolate(fly, [0, 1], [y0, ym]) - 40 * spread;
          const rot = (1 - spread) * ((i - 1) * 8) + (1 - fly) * 4;
          return (
            <div key={i} style={{position: 'absolute', left: x, top: y, rotate: `${rot}deg`, opacity: k01(frame, i * 3, 10), zIndex: 20}}>
              <DocIcon label={it} tag={param(s, 'item_tag', 'DOC')} w={150} />
            </div>
          );
        })}
        <Pointer keys={keys} />
      </Camera>
      <Notes notes={param<NoteDef[]>(s, 'notes', [{kind: 'ILUSTRATIVO', text: 'Interfaz recreada para el video'}])} top={1330} on={1} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ PROCESS · procesamiento acelerado */
export const ProcessScene = ({s}: {s: Scene}) => {
  const p = useTh();
  const {frame, f, fps} = useT();
  const groups = param<{label: string; count: number}[]>(s, 'groups', [{label: 'Grupo 1', count: 40}, {label: 'Grupo 2', count: 30}]).slice(0, 4);
  const total = param(s, 'total', groups.reduce((a, g) => a + g.count, 0));
  const realS = param<number | null>(s, 'real_s', null);
  const unit = param(s, 'unit', 'registros');
  const tRead = f(beat(s, 'read', 1.2));
  const tCount = f(beat(s, 'count', 2.4));
  const end = Math.round(s.dur * fps) - 18;
  const len = end - tRead;
  const speed = realS ? Math.max(2, Math.round(realS / (len / fps) / 10) * 10) : 0;
  const ff = k01(frame, tRead - 6, 10) * (1 - k01(frame, end + 2, 8));
  const counter = countUp(frame, tCount, end - tCount, total);
  const rowH = groups.length > 3 ? 104 : 132;
  return (
    <AbsoluteFill>
      <Backdrop />
      <AppWindow title={param(s, 'window_title', 'Nueva herramienta')} style={{left: WIN.left, top: WIN.top, width: WIN.w, height: WIN.h}}>
        <div style={{position: 'absolute', left: 40, right: 40, top: 36}}>
          <FastForward on={ff} label={speed ? `×${speed} · proceso acelerado` : 'proceso acelerado'} />
        </div>
        {groups.map((g, i) => {
          const a = tRead + i * 4;
          const pr = k01(frame, a, end - a - (groups.length - 1 - i) * 6, EASE_IO);
          const done = pr >= 1;
          return (
            <div key={i} style={{position: 'absolute', left: 40, right: 40, top: 140 + i * rowH, padding: '20px 24px', borderRadius: 18, background: p.surface2,
              border: `1.5px solid ${done ? p.ok : p.line}`}}>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <div style={{fontFamily: PLEX, fontSize: 30, fontWeight: 600, color: p.ink}}>{g.label}</div>
                <div style={{fontFamily: PLEX, fontSize: 30, fontWeight: 700, color: done ? p.ok : p.ink, fontVariantNumeric: 'tabular-nums'}}>
                  {Math.round(g.count * pr)} <span style={{fontSize: 22, fontWeight: 400, color: p.muted}}>{unit}</span>{done ? ' ✓' : ''}
                </div>
              </div>
              <div style={{height: 10, borderRadius: 5, background: p.line, marginTop: 14, overflow: 'hidden'}}>
                <div style={{width: `${pr * 100}%`, height: '100%', background: done ? p.ok : p.accent, boxShadow: `0 0 16px ${p.glow}`}} />
              </div>
            </div>
          );
        })}
        {Array.from({length: 14}, (_, i) => {
          const st = tCount + i * ((end - tCount) / 16);
          const k = k01(frame, st, 10, EASE);
          if (k <= 0 || k >= 1) return null;
          return <div key={i} style={{position: 'absolute', left: 120 + (i % 4) * 170, top: 560 + k * 120, width: 140, height: 10, borderRadius: 5,
            background: p.accent, opacity: (1 - k) * 0.8}} />;
        })}
        <div style={{position: 'absolute', left: 0, right: 0, top: 600, textAlign: 'center', opacity: k01(frame, tCount - 6, 10)}}>
          <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: 190, lineHeight: 1, color: p.ink, letterSpacing: -4, fontVariantNumeric: 'tabular-nums',
            textShadow: `0 0 50px ${p.glow}`}}>{counter}</div>
          <Mono style={{marginTop: 12, color: counter >= total ? p.ok : p.accent}}>{param(s, 'counter_label', `${unit} procesados`)}</Mono>
        </div>
      </AppWindow>
      <Notes notes={param<NoteDef[]>(s, 'notes', [{kind: 'ILUSTRATIVO', text: 'Interfaz recreada'}])} top={1250} on={k01(frame, tCount, 12)} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ CHECK · control con ecuación + cantidades + grupos */
export const CheckScene = ({s}: {s: Scene}) => {
  const p = useTh();
  const {frame, f} = useT();
  const rows = param<[string, string][]>(s, 'rows', [['', 'Valor inicial'], ['+', 'Ingresos'], ['−', 'Egresos'], ['=', 'Valor calculado']]).slice(0, 4);
  const keysT = rows.map((_, i) => f(beat(s, `r${i + 1}`, 1 + i)));
  const count = param<{label: string; left: string; right: string; value: string} | null>(s, 'count', null);
  const groups = param<{label: string; detail?: string}[]>(s, 'groups', []).slice(0, 3);
  const tCount = f(beat(s, 'count', 5));
  const tGroups = f(beat(s, 'groups', 6));
  const tOk = f(beat(s, 'ok', 7));
  const rowY = (i: number) => 400 + i * 100;
  const cmpY = rowY(rows.length - 1) + 100;
  const countY = cmpY + 100;
  const okY = (count ? countY : cmpY) + 96;
  const cmp = k01(frame, (keysT[rows.length - 1] ?? 0) + 4, 14);
  const ok = k01(frame, tOk - 2, 12);
  const cnt = k01(frame, tCount - 4, 12);
  const last = rows.length - 1;
  const focus = count && frame >= tCount - 6 ? 99 : keysT.findLastIndex((t) => frame >= t - 6);
  const spotOn = frame < tGroups - 6 ? k01(frame, (keysT[0] ?? 0) - 6, 8) : 1 - k01(frame, tGroups - 6, 8);
  const spotY = focus === 99 ? countY - 14 : focus >= last ? rowY(last) - 8 : rowY(Math.max(0, focus)) - 8;
  const spotH = focus === 99 ? 92 : focus >= last ? 200 : 92;
  const ptr = [
    {f: 0, x: 980, y: 1350},
    ...keysT.map((t, i) => ({f: t, x: 860, y: (i === last ? cmpY : rowY(i)) + 46})),
    ...(count ? [{f: tCount, x: 900, y: countY + 40}] : []),
    {f: tGroups, x: 860, y: 1150},
  ];
  const mask = (w: number) => <span style={{display: 'inline-block', width: w, height: 26, borderRadius: 6, background: p.line, verticalAlign: 'middle'}} />;
  return (
    <AbsoluteFill>
      <Backdrop />
      <Camera keys={[{f: 0, cx: 540, cy: 820, s: 1.0}, {f: (keysT[0] ?? 0) - 10, cx: 540, cy: 700, s: 1.05, len: 30}, {f: tGroups - 10, cx: 540, cy: 960, s: 1, len: 24}]}>
        <div style={{position: 'absolute', left: 50, right: 50, top: 300, height: okY - 300 + 110, borderRadius: 26, background: p.surface, border: `1.5px solid ${p.line}`,
          boxShadow: '0 40px 120px rgba(0,0,0,0.35)'}}>
          <div style={{position: 'absolute', left: 40, top: 34}}><Mono style={{color: p.ink}}>{param(s, 'title', 'Control')}</Mono></div>
        </div>
        {rows.map(([op, label], i) => {
          const a = k01(frame, (keysT[i] ?? 0) - 6, 12);
          return (
            <div key={i} style={{position: 'absolute', left: 90, right: 90, top: rowY(i), height: 84, display: 'flex', alignItems: 'center', opacity: 0.25 + 0.75 * a,
              borderTop: i === last ? `3px solid ${p.ink}` : 'none'}}>
              <div style={{width: 60, fontFamily: PLEX, fontSize: 56, color: p.accent}}>{op}</div>
              <div style={{flex: 1, fontFamily: PLEX, fontWeight: 700, fontSize: 46, color: p.ink}}>{label}</div>
              {mask(i === last ? 200 : 160)}
            </div>
          );
        })}
        <div style={{position: 'absolute', left: 90, right: 90, top: cmpY, height: 84, display: 'flex', alignItems: 'center', opacity: 0.25 + 0.75 * cmp}}>
          <div style={{width: 60, fontFamily: PLEX, fontSize: 50, color: p.muted}}>⇄</div>
          <div style={{flex: 1, fontFamily: PLEX, fontSize: 40, color: p.muted}}>{param(s, 'compare_label', 'Valor esperado')}</div>
          {mask(200)}
        </div>
        {count && (
          <div style={{position: 'absolute', left: 90, right: 90, top: countY, height: 72, display: 'flex', alignItems: 'center', opacity: 0.25 + 0.75 * cnt,
            borderTop: `1.5px dashed ${p.line}`, paddingTop: 10}}>
            <div style={{width: 60, fontFamily: PLEX, fontSize: 44, color: p.accent}}>#</div>
            <div style={{flex: 1, fontFamily: PLEX, fontWeight: 700, fontSize: 36, color: p.ink, whiteSpace: 'nowrap'}}>{count.label}</div>
            <div style={{fontFamily: PLEX, fontSize: 26, color: p.muted, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums'}}>
              {count.left} <b style={{color: p.ink}}>{count.value}</b> = {count.right} <b style={{color: cnt > 0.5 ? p.ok : p.ink}}>{count.value}</b>{cnt > 0.5 ? ' ✓' : ''}
            </div>
          </div>
        )}
        <div style={{position: 'absolute', left: 90, top: okY, opacity: ok, scale: String(0.94 + 0.06 * ok), transformOrigin: 'left center'}}>
          <div style={{display: 'inline-flex', alignItems: 'center', gap: 16, padding: '16px 28px', borderRadius: 18, background: p.okSoft, border: `3px solid ${p.ok}`}}>
            <span style={{fontFamily: PLEX, fontWeight: 700, fontSize: 46, color: p.ok}}>✓ {param(s, 'result', 'Diferencia: 0')}</span>
          </div>
        </div>
        {groups.length > 0 && (
          <div style={{position: 'absolute', left: 50, right: 50, top: Math.max(okY + 130, 1118), display: 'flex', gap: 16}}>
            {groups.map((g, i) => {
              const k = k01(frame, tGroups + i * 5, 12);
              const gk = k01(frame, tOk + i * 3, 10);
              return (
                <div key={i} style={{flex: 1, padding: '16px 18px', borderRadius: 16, background: p.surface, border: `2px solid ${gk > 0.5 ? p.ok : p.line}`,
                  opacity: k, translate: `0px ${(1 - k) * 20}px`}}>
                  <div style={{fontFamily: PLEX, fontSize: 26, color: p.muted}}>{g.label}</div>
                  <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: 32, color: gk > 0.5 ? p.ok : p.ink, marginTop: 4}}>{gk > 0.5 ? '✓' : '…'}</div>
                  {g.detail && <div style={{fontFamily: MONO, fontSize: 19, color: p.muted, marginTop: 4}}>{g.detail}</div>}
                </div>
              );
            })}
          </div>
        )}
        <Spotlight box={[70, spotY, 940, spotH]} on={spotOn} />
        <Pointer keys={ptr} />
      </Camera>
      <Notes notes={param<NoteDef[]>(s, 'notes', [])} top={1262} on={k01(frame, tOk, 12)} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ TABLE-CHECK · control por tabla (calculado vs. referencia) */
export const TableCheckScene = ({s}: {s: Scene}) => {
  const p = useTh();
  const {frame, f} = useT();
  const tabs = param<string[]>(s, 'tabs', ['Grupo 1', 'Grupo 2', 'Grupo 3']).slice(0, 3);
  const cols = param<string[]>(s, 'columns', ['Concepto', 'Calculado', 'Referencia', 'Diferencia']);
  const rows = param<string[]>(s, 'rows', ['Concepto A', 'Concepto B', 'Concepto C']).slice(0, 4);
  const issue = param<{tab: number; rows: number[]; label: string; explain: string} | null>(s, 'issue', null);
  const summary = param<{title: string; value: string; tone: 'ok' | 'review'}[]>(s, 'summary', []);
  const tCalc = f(beat(s, 'calc', 3));
  const tCmp = f(beat(s, 'compare', 6.5));
  const tabStarts = tabs.map((_, i) => (i === 0 ? 0 : tCmp + 2 + i * 12));
  const tWhy = (tabStarts[tabStarts.length - 1] ?? tCmp) + 10;
  const tab = tabStarts.findLastIndex((t, i) => i === 0 || frame >= t);
  const W = [370, 170, 170, 170];
  const mask = (k: number, c: string) => <span style={{display: 'inline-block', width: 120 * k, height: 22, borderRadius: 6, background: c, verticalAlign: 'middle', opacity: 0.35 + 0.65 * k}} />;
  const why = issue ? k01(frame, tWhy, 12) : 0;
  const issueTop = 240 + rows.length * 92 + 18;
  const cardH = Math.max(650, issue ? issueTop + 120 : 0);
  const summaryTop = 300 + cardH + 40;
  return (
    <AbsoluteFill>
      <Backdrop />
      <div style={{position: 'absolute', left: 50, right: 50, top: 300, height: cardH, borderRadius: 26, background: p.surface, border: `1.5px solid ${p.line}`,
        boxShadow: '0 40px 120px rgba(0,0,0,0.35)', opacity: k01(frame, 0, 12), translate: `0px ${(1 - k01(frame, 0, 14)) * 30}px`}}>
        <div style={{position: 'absolute', left: 40, right: 40, top: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <Mono style={{color: p.ink}}>{param(s, 'title', 'Segundo control')}</Mono>
          <FastForward on={tab > 0 && frame < tWhy + 6 ? 1 : 0} label="acelerado" style={{padding: '6px 12px'}} />
        </div>
        <div style={{position: 'absolute', left: 40, right: 40, top: 96, display: 'flex', gap: 12}}>
          {tabs.map((t, i) => {
            const done = i < tab || (i === tab && frame >= (i === 0 ? tCmp + 12 : (tabStarts[i] ?? 0) + 8));
            const bad = issue?.tab === i && done;
            return (
              <div key={i} style={{flex: 1, height: 58, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: PLEX,
                fontSize: 27, fontWeight: 600, color: i === tab ? p.ink : p.muted, background: i === tab ? p.surface2 : 'transparent', border: `2px solid ${i === tab ? p.accent : p.line}`}}>
                {t}{done ? <span style={{color: bad ? p.review : p.ok}}>{bad ? ' ●' : ' ✓'}</span> : null}
              </div>
            );
          })}
        </div>
        <div style={{position: 'absolute', left: 40, right: 40, top: 186, display: 'flex', fontFamily: MONO, fontSize: 19, letterSpacing: 1.5, color: p.muted,
          paddingBottom: 12, borderBottom: `1.5px solid ${p.line}`}}>
          {cols.map((h, i) => <div key={h} style={{width: W[i]}}>{h.toUpperCase()}</div>)}
        </div>
        {rows.map((r, i) => {
          const base = tab === 0 ? 0 : (tabStarts[tab] ?? 0);
          const kc = tab === 0 ? k01(frame, tCalc + i * 5, 14) : k01(frame, base + i * 2, 6);
          const kb = tab === 0 ? k01(frame, tCmp + i * 5, 14) : k01(frame, base + 4 + i * 2, 6);
          const shown = kb >= 1;
          const bad = issue?.tab === tab && issue.rows.includes(i);
          return (
            <div key={r} style={{position: 'absolute', left: 40, right: 40, top: 240 + i * 92, height: 88, display: 'flex', alignItems: 'center', fontFamily: PLEX,
              fontSize: 30, color: p.ink, borderBottom: `1px solid ${p.line}`, background: bad && shown ? p.reviewSoft : 'transparent'}}>
              <div style={{width: W[0], fontWeight: 600}}>{r}</div>
              <div style={{width: W[1]}}>{mask(kc, p.accent)}</div>
              <div style={{width: W[2]}}>{mask(kb, p.muted)}</div>
              <div style={{width: W[3], fontWeight: 700, color: bad ? p.review : p.ok, opacity: shown ? 1 : 0}}>{bad ? issue.label : param(s, 'ok_label', '✓ 0')}</div>
            </div>
          );
        })}
        {issue && (
          <div style={{position: 'absolute', left: 40, right: 40, top: issueTop, padding: '16px 22px', borderRadius: 16, border: `2px solid ${p.review}`, background: p.reviewSoft,
            opacity: why, translate: `0px ${(1 - why) * 14}px`, display: 'flex', alignItems: 'center', gap: 18}}>
            <svg viewBox="0 0 24 24" style={{width: 40, height: 40, flexShrink: 0, fill: p.review}}><path d="M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4z" /></svg>
            <div style={{fontFamily: PLEX, fontSize: 27, color: p.ink, lineHeight: 1.25}}>{issue.explain}</div>
          </div>
        )}
      </div>
      {summary.length > 0 && (
        <div style={{position: 'absolute', left: 50, right: 50, top: summaryTop, display: 'flex', gap: 18, opacity: k01(frame, tWhy + 14, 14),
          translate: `0px ${(1 - k01(frame, tWhy + 14, 14)) * 30}px`}}>
          {summary.map((c) => (
            <div key={c.title} style={{flex: 1, padding: '22px 26px', borderRadius: 20, background: p.surface, border: `2px solid ${c.tone === 'review' ? p.review : p.ok}`}}>
              <Mono style={{fontSize: 20}}>{c.title}</Mono>
              <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: 36, color: c.tone === 'review' ? p.review : p.ok, marginTop: 8}}>{c.value}</div>
            </div>
          ))}
        </div>
      )}
      <Notes notes={param<NoteDef[]>(s, 'notes', [])} top={Math.max(1250, summaryTop + (summary.length ? 150 : 0))} on={k01(frame, tWhy + 10, 12)} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ SCAN · el universo completo baja rápido; las excepciones se separan */
const ROW_H = 58;
const HEAD_H = 64;
const CARD = {left: 40, top: 300, w: 1000, h: 960};
const BODY_H = CARD.h - HEAD_H;
const COLS = [104, 334, 306, 206];
const cardY = (j: number) => 30 + j * 222;

const SheetHeader = ({nOk, nRev, pct = 0, pctLabel = '', title, file}: {nOk: number; nRev: number; pct?: number; pctLabel?: string; title: string; file: string}) => {
  const p = useTh();
  return (
    <div style={{position: 'absolute', left: CARD.left + 4, right: CARD.left + 4, top: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between'}}>
      <div style={{position: 'relative'}}>
        <div style={{opacity: 1 - pct}}>
          <Mono style={{fontSize: 22}}>{title}</Mono>
          <div style={{fontFamily: MONO, fontSize: 28, color: p.ink, marginTop: 6}}>{file}</div>
        </div>
        <div style={{position: 'absolute', left: 0, bottom: 0, opacity: pct, translate: `0px ${(1 - pct) * 12}px`, whiteSpace: 'nowrap'}}>
          <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: 44, color: p.ok, lineHeight: 1.1}}>{pctLabel}</div>
        </div>
      </div>
      <div style={{display: 'flex', gap: 28, fontFamily: PLEX, fontWeight: 700, fontSize: 40, fontVariantNumeric: 'tabular-nums'}}>
        <span style={{color: p.ok}}>✓ {nOk}</span>
        <span style={{color: p.review}}>● {nRev}</span>
      </div>
    </div>
  );
};

/** Tarjeta de una excepción (en scan aparece; en review se corrige y confirma). */
const ReviewCard = ({r, on, badge, hl, state = 'review', rubro, labels}: {r: Row; on: number; badge: number; hl: number; state?: 'review' | 'fixed' | 'ok'; rubro?: string; labels: ScanLabels}) => {
  const p = useTh();
  const c = state === 'review' ? p.review : p.ok;
  const b = {review: 'CONTROLAR', fixed: 'CORREGIDO', ok: 'OK', ...labels.badges};
  return (
    <div style={{position: 'absolute', left: 34, right: 30, top: 22, opacity: on}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: 34, color: p.ink}}>
          <span style={{fontFamily: MONO, fontWeight: 400, fontSize: 28, color: p.muted, marginRight: 18}}>{r.date}</span>{r.mov}
        </div>
        <div style={{fontFamily: MONO, fontSize: 21, letterSpacing: 2, color: p.bg, background: c, borderRadius: 8, padding: '6px 12px', opacity: badge}}>{b[state]}</div>
      </div>
      <div style={{fontFamily: PLEX, fontSize: 27, color: p.muted, marginTop: 10}}>
        {labels.field_label ?? 'Categoría propuesta'}: <span style={{color: state === 'fixed' ? p.ok : p.muted, fontWeight: state === 'fixed' ? 700 : 400}}>{rubro ?? r.rubro}</span>
      </div>
      <div style={{position: 'relative', display: 'inline-block', marginTop: 14}}>
        <div style={{position: 'absolute', left: -8, top: '18%', height: '72%', width: `calc(${hl * 100}% + 16px)`, background: state === 'review' ? p.highlighter : p.okSoft,
          borderRadius: '6px 14px 8px 16px', transform: 'skewX(-8deg) rotate(-0.6deg)'}} />
        <div style={{position: 'relative', fontFamily: PLEX, fontWeight: 600, fontSize: 30, color: p.ink}}>
          {state === 'review' ? `${labels.review_prefix ?? 'Revisar ·'} ${r.motivo}` : r.motivo}
        </div>
      </div>
    </div>
  );
};

export const ScanScene = ({s}: {s: Scene}) => {
  const p = useTh();
  const {frame, f} = useT();
  const data = useScan();
  const rows = buildRows(data);
  const revIdx = rows.map((r, i) => (r.card ? i : -1)).filter((i) => i >= 0);
  const cols = data.columns ?? ['Fecha', 'Registro', 'Categoría', 'Regla / motivo'];
  const tScan = f(beat(s, 'scan', 1.2));
  const tAmber = f(beat(s, 'amber', 5));
  const tPct = f(beat(s, 'pct', 3.5));
  const scanFrom = tScan - 6;
  const pctK = k01(frame, Math.max(tPct - 4, scanFrom + 30), 12);
  const scrollFrom = scanFrom + 16;
  const scrollTo = Math.max(scrollFrom + 60, tAmber + 4);
  const SPLIT = scrollTo + 10;
  const sEnd = Math.max(0, rows.length * ROW_H - BODY_H);
  const scrollAt = (fr: number) => sEnd * k01(fr, scrollFrom, scrollTo - scrollFrom, EASE_IO);
  const scroll = scrollAt(frame);
  const speedBlur = Math.min(2.6, Math.abs(scroll - scrollAt(frame - 1)) / 45);
  const scanY = frame < scrollTo
    ? interpolate(frame, [scanFrom, scrollFrom], [0, BODY_H * 0.6], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE})
    : interpolate(frame, [scrollTo, scrollTo + 12], [BODY_H * 0.6, BODY_H + 4], {extrapolateRight: 'clamp', easing: EASE_IO});
  const split = k01(frame, SPLIT, 24, EASE_IO);
  const scanOn = frame >= scanFrom ? 1 - split : 0;
  const processed = rows.map((_, i) => frame >= scanFrom && i * ROW_H + ROW_H / 2 - scroll < scanY);
  const nOk = rows.filter((r, i) => processed[i] && !r.review).length;
  const nRev = rows.filter((r, i) => processed[i] && r.review).length;
  const pctLabel = param(s, 'pct_label', `${Math.round((data.auto / data.total) * 100)} % · ${data.auto} de ${data.total} resueltos solos`);
  return (
    <AbsoluteFill>
      <Backdrop />
      <div style={{opacity: k01(frame, 0, 10)}}>
        <SheetHeader nOk={nOk} nRev={nRev} pct={pctK} pctLabel={pctLabel} title={param(s, 'sheet_title', 'Primer entregable')} file={data.file ?? 'revision.xlsx'} />
      </div>
      <div style={{position: 'absolute', left: CARD.left, top: CARD.top, width: CARD.w, height: CARD.h, borderRadius: 22, overflow: 'hidden', background: p.surface,
        border: `1.5px solid ${p.line}`, boxShadow: '0 40px 120px rgba(0,0,0,0.35)', opacity: k01(frame, 0, 12), translate: `0px ${(1 - k01(frame, 0, 14)) * 40}px`}}>
        <div style={{height: HEAD_H, display: 'flex', alignItems: 'center', padding: '0 22px', background: p.surface2, borderBottom: `1.5px solid ${p.line}`, opacity: 1 - split}}>
          {cols.map((h, i) => (
            <div key={h} style={{width: COLS[i], fontFamily: MONO, fontSize: 19, letterSpacing: 1.5, textTransform: 'uppercase', color: p.muted}}>{h}</div>
          ))}
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: HEAD_H, height: BODY_H, overflow: split > 0 ? 'visible' : 'hidden'}}>
          {rows.map((r, i) => {
            const y = i * ROW_H - scroll;
            const isCard = !!r.card;
            if (!isCard && (y < -ROW_H || y > BODY_H)) return null;
            if (isCard && split === 0 && (y < -ROW_H || y > BODY_H)) return null;
            const done = processed[i];
            const j = revIdx.indexOf(i);
            const y0 = Math.max(y, -90);
            const top = isCard ? y0 + (cardY(j) - y0) * split : y;
            const h = isCard ? ROW_H + (196 - ROW_H) * split : ROW_H;
            const tone = !done ? p.faint : r.review ? p.review : p.ok;
            const hl = k01(frame, SPLIT + 28 + j * 8, 14);
            return (
              <div key={i} style={{position: 'absolute', left: isCard ? 22 * split : 0, right: isCard ? 22 * split : 0, top, height: h, borderRadius: 16 * split,
                opacity: isCard ? 1 : 1 - 0.94 * split, filter: !isCard && (split > 0 || speedBlur > 0.3) ? `blur(${3 * split + speedBlur}px)` : undefined,
                background: done && r.review ? `linear-gradient(${p.reviewSoft}, ${p.reviewSoft}), ${p.surface}` : 'transparent',
                boxShadow: isCard && split > 0 ? `0 18px 50px rgba(0,0,0,${0.4 * split})` : 'none', borderBottom: split < 0.5 ? `1px solid ${p.line}` : 'none',
                border: isCard && split > 0.5 ? `1.5px solid ${p.review}` : undefined}}>
                <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: tone, opacity: done ? 1 : 0.4}} />
                <div style={{position: 'absolute', left: 22, right: 22, top: 0, height: ROW_H, display: 'flex', alignItems: 'center', opacity: isCard ? 1 - split : 1,
                  fontFamily: PLEX, fontSize: 24, color: done ? p.ink : p.muted}}>
                  <div style={{width: COLS[0], fontFamily: MONO, fontSize: 22}}>{r.date}</div>
                  <div style={{width: COLS[1], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 12}}>{r.mov}</div>
                  <div style={{width: COLS[2], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 12}}>{r.rubro}</div>
                  <div style={{width: COLS[3], fontWeight: 600, color: tone, whiteSpace: 'nowrap'}}>{!done ? '…' : r.review ? (data.review_label ?? '● Revisar') : (data.ok_label ?? '✓ Regla')}</div>
                </div>
                {isCard && split > 0 && <ReviewCard r={r} on={split} badge={k01(frame, SPLIT + 22 + j * 8, 10)} hl={hl} labels={data} />}
              </div>
            );
          })}
          <div style={{position: 'absolute', left: 0, right: 0, top: scanY, height: 0, opacity: scanOn}}>
            <div style={{position: 'absolute', left: 0, right: 0, top: -1, height: 3, background: p.accent, boxShadow: `0 0 24px 4px ${p.glow}`}} />
            <div style={{position: 'absolute', left: 0, right: 0, top: -80, height: 80, background: `linear-gradient(to top, ${p.glow}, transparent)`, opacity: 0.35}} />
            <div style={{position: 'absolute', right: 18, top: -42, fontFamily: MONO, fontSize: 20, letterSpacing: 2, color: p.onAccent, background: p.accent,
              borderRadius: 6, padding: '4px 10px'}}>{param(s, 'scan_label', 'IA · APLICANDO REGLAS')}</div>
          </div>
        </div>
      </div>
      <Notes notes={param<NoteDef[]>(s, 'notes', [])} top={1290} on={k01(frame, SPLIT + 30, 12)} />
      <div style={{position: 'absolute', left: 60, top: 1290, opacity: k01(frame, scanFrom, 8) * (1 - k01(frame, SPLIT, 8))}}>
        <FastForward on={1} label="acelerado · ilustrativo" />
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ REVIEW · el control humano (protagonista) */
export const ReviewScene = ({s}: {s: Scene}) => {
  const p = useTh();
  const {frame, f} = useT();
  const data = useScan();
  const rows = buildRows(data);
  const cards = rows.filter((r) => r.card);
  const nRevTotal = data.total - data.auto;
  const opts = param<string[]>(s, 'options', ['Opción correcta', 'Otra opción', cards[0]?.rubro ?? 'Propuesta']);
  const fixTo = opts[0] ?? '';
  const tHuman = f(beat(s, 'human', 0.6));
  const tExpert = f(beat(s, 'expert', 2.5));
  const tOpen = f(beat(s, 'open', 1.4));
  const tFix = f(beat(s, 'fix', 4));
  const tOk = f(beat(s, 'ok', 6));
  const ban = k01(frame, tHuman - 8, 14);
  const exp = k01(frame, tExpert - 4, 12);
  const menuOpen = tFix - 12;
  const pick = tFix + 8;
  const bodyTop = CARD.top + HEAD_H;
  const c1 = {x: CARD.left + 22, y: bodyTop + cardY(0), w: CARD.w - 44, h: 196};
  const sel = {x: c1.x + 560, y: c1.y + 76};
  const confirmBtn = {x: 540, y: bodyTop + cardY(Math.max(1, cards.length)) + 40};
  const fixed = frame >= pick;
  const allOk = frame >= tOk;
  const nRev = allOk ? 0 : fixed ? nRevTotal - 1 : nRevTotal;
  const nOk = data.auto + (fixed ? 1 : 0) + (allOk ? nRevTotal - 1 : 0);
  const spot = k01(frame, tOpen - 6, 10) * (1 - k01(frame, pick + 14, 10));
  const menu = frame >= menuOpen && frame < pick + 4 ? k01(frame, menuOpen, 6) : 0;
  const ptr = [
    {f: 0, x: 900, y: 1350},
    {f: tOpen, x: c1.x + 300, y: c1.y + 60},
    {f: menuOpen, x: sel.x + 140, y: sel.y + 20, click: true},
    {f: pick, x: sel.x + 120, y: sel.y + 80, click: true},
    {f: tOk, x: confirmBtn.x + 80, y: confirmBtn.y + 10, click: true},
  ];
  return (
    <AbsoluteFill>
      <Backdrop />
      <div style={{position: 'absolute', left: CARD.left, right: CARD.left, top: 196, height: 96, borderRadius: 20, display: 'flex', alignItems: 'center',
        gap: 20, padding: '0 24px', background: `linear-gradient(100deg, ${p.reviewSoft}, transparent)`, border: `2px solid ${p.review}`,
        opacity: ban, translate: `0px ${(1 - ban) * -20}px`, boxShadow: `0 0 ${24 + 30 * exp}px ${p.highlighter}`, zIndex: 50}}>
        <svg viewBox="0 0 24 24" style={{width: 54, height: 54, fill: 'none', stroke: p.review, strokeWidth: 1.8}}>
          <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
        </svg>
        <div style={{flex: 1}}>
          <div style={{fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: p.review}}>{param(s, 'banner_title', 'CONTROL HUMANO')}</div>
          <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: 34, color: p.ink, opacity: exp}}>{param(s, 'banner_sub', 'El criterio del experto')}</div>
        </div>
        <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: 34, fontVariantNumeric: 'tabular-nums', display: 'flex', gap: 18}}>
          <span style={{color: p.ok}}>✓ {nOk}</span><span style={{color: p.review}}>● {nRev}</span>
        </div>
      </div>
      <Camera keys={[{f: 0, cx: 540, cy: 960, s: 1}, {f: tOpen - 8, cx: 540, cy: 820, s: 1.06, len: 26}, {f: pick + 10, cx: 540, cy: 960, s: 1, len: 26}]}>
        <div style={{position: 'absolute', left: CARD.left, top: CARD.top, width: CARD.w, height: CARD.h, borderRadius: 22, background: p.surface,
          border: `1.5px solid ${p.line}`, boxShadow: '0 40px 120px rgba(0,0,0,0.35)'}} />
        {cards.map((r, j) => {
          const isFirst = j === 0;
          const st: 'review' | 'fixed' | 'ok' = isFirst && fixed ? 'fixed' : allOk && frame >= tOk + j * 4 ? 'ok' : 'review';
          const green = st !== 'review';
          return (
            <div key={j} style={{position: 'absolute', left: c1.x, top: bodyTop + cardY(j), width: c1.w, height: c1.h, borderRadius: 16,
              border: `1.5px solid ${green ? p.ok : p.review}`, background: green ? `linear-gradient(${p.okSoft}, ${p.okSoft}), ${p.surface}` : `linear-gradient(${p.reviewSoft}, ${p.reviewSoft}), ${p.surface}`,
              boxShadow: '0 18px 50px rgba(0,0,0,0.35)'}}>
              <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, borderRadius: '16px 0 0 16px', background: green ? p.ok : p.review}} />
              <ReviewCard r={r} on={1} badge={1} hl={1} state={st} rubro={isFirst && fixed ? fixTo : undefined} labels={data} />
            </div>
          );
        })}
        <div style={{position: 'absolute', left: sel.x, top: sel.y, width: 330, height: 50, borderRadius: 10, border: `1.5px solid ${p.accent}`, background: p.surface2,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', fontFamily: PLEX, fontSize: 24, color: p.ink,
          opacity: k01(frame, tOpen, 10) * (1 - k01(frame, pick + 16, 8))}}>
          <span style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{fixed ? fixTo : (cards[0]?.rubro ?? '')}</span> <span style={{color: p.accent}}>▾</span>
        </div>
        <div style={{position: 'absolute', left: sel.x, top: sel.y + 56, width: 330, borderRadius: 12, overflow: 'hidden', background: p.surface2,
          border: `1.5px solid ${p.line}`, opacity: menu, translate: `0px ${(1 - menu) * -10}px`, zIndex: 35, boxShadow: '0 20px 40px rgba(0,0,0,0.4)'}}>
          {opts.map((o, i) => (
            <div key={o} style={{height: 52, display: 'flex', alignItems: 'center', padding: '0 14px', fontFamily: PLEX, fontSize: 24,
              color: p.ink, background: i === 0 && frame >= pick - 8 ? p.glow : 'transparent', whiteSpace: 'nowrap', overflow: 'hidden'}}>{o}</div>
          ))}
        </div>
        <div style={{position: 'absolute', left: confirmBtn.x - 260, top: confirmBtn.y - 44, width: 520, height: 88, borderRadius: 20, display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontFamily: PLEX, fontWeight: 700, fontSize: 34, background: allOk ? p.ok : p.accent,
          color: allOk ? p.bg : p.onAccent, opacity: k01(frame, pick + 6, 12), scale: String(frame >= tOk && frame < tOk + 7 ? 0.96 : 1),
          boxShadow: `0 0 30px ${p.glow}`}}>{allOk ? param(s, 'confirmed', '✓ Revisión confirmada') : param(s, 'confirm', 'Confirmar revisión')}</div>
        <Spotlight box={[c1.x - 6, c1.y - 6, c1.w + 12, c1.h + 12 + (menu > 0 ? 160 : 0)]} on={spot} />
        <Pointer keys={ptr} show={[tOpen - 10, tOk + 20]} />
        {(() => {
          const pos = pathAt(ptr, frame);
          const on = k01(frame, tOpen - 4, 10) * (1 - k01(frame, tOk + 10, 8));
          return <div style={{position: 'absolute', left: pos.x + 46, top: pos.y + 44, opacity: on, zIndex: 41, fontFamily: MONO, fontSize: 20, letterSpacing: 2,
            color: p.bg, background: p.review, borderRadius: 8, padding: '4px 10px', whiteSpace: 'nowrap'}}>{param(s, 'pointer_label', 'EQUIPO')}</div>;
        })()}
      </Camera>
      <Notes notes={param<NoteDef[]>(s, 'notes', [{kind: 'ILUSTRATIVO', text: 'Ejemplo de corrección · interfaz recreada'}])} top={Math.max(1300, confirmBtn.y + 52)} on={k01(frame, pick + 34, 10)} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ LEARN · las correcciones alimentan reglas nuevas */
export const LearnScene = ({s}: {s: Scene}) => {
  const p = useTh();
  const {frame, f} = useT();
  const corr = param(s, 'correction', {title: 'REGISTRO · DATO OCULTO', from: 'Categoría propuesta', to: 'Categoría correcta'});
  const rule = param(s, 'rule', {if: 'SI  dato = ••••', then: '→  Categoría correcta'});
  const n = param(s, 'count', 3);
  const tProp = f(beat(s, 'prop', 1.5));
  const tNext = f(beat(s, 'next', 3.5));
  const tHigh = f(beat(s, 'high', 5.5));
  const a = k01(frame, 0, 14);
  const ia = k01(frame, tProp - 14, 12);
  const rl = k01(frame, tProp - 4, 14);
  const reg = k01(frame, tNext - 2, 10);
  const fly = k01(frame, tNext + 14, 22);
  const store = k01(frame, tProp + 6, 14);
  const added = Math.round(n * k01(frame, tNext + 30, 14));
  const gauge = k01(frame, tHigh - 6, 24);
  return (
    <AbsoluteFill>
      <Backdrop />
      <Mono style={{position: 'absolute', left: 60, top: 230, color: p.ink, opacity: a}}>{param(s, 'header', 'Las correcciones alimentan las reglas')}</Mono>
      <div style={{position: 'absolute', left: 50, right: 50, top: 290, height: 170, borderRadius: 20, border: `2px solid ${p.ok}`, background: p.okSoft,
        opacity: a, translate: `0px ${(1 - a) * 20}px`, padding: '20px 28px', boxSizing: 'border-box'}}>
        <Mono style={{fontSize: 20, color: p.ok}}>{param(s, 'correction_label', 'Corrección del equipo')}</Mono>
        <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: 32, color: p.ink, marginTop: 8}}>{corr.title}</div>
        <div style={{fontFamily: PLEX, fontSize: 28, color: p.muted, marginTop: 6}}>
          <span style={{textDecoration: 'line-through'}}>{corr.from}</span> → <b style={{color: p.ok}}>{corr.to}</b>
        </div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 478, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, opacity: ia}}>
        <svg viewBox="0 0 24 24" style={{width: 44, height: 44, fill: 'none', stroke: p.accent, strokeWidth: 2.4}}><path d="M12 4v15M6 13l6 6 6-6" /></svg>
        <div style={{fontFamily: MONO, fontSize: 22, letterSpacing: 2, color: p.onAccent, background: p.accent, borderRadius: 8, padding: '6px 14px'}}>{param(s, 'ia_label', 'IA · DETECTA EL PATRÓN')}</div>
      </div>
      <div style={{position: 'absolute', left: 50, right: 50, top: 560, height: 230, borderRadius: 22, background: p.surface, border: `2px solid ${reg > 0.5 ? p.ok : p.accent}`,
        boxShadow: `0 0 ${30 + 30 * reg}px ${reg > 0.5 ? p.okSoft : p.glow}`, padding: '24px 30px', boxSizing: 'border-box',
        opacity: rl * (1 - fly), scale: String((0.94 + 0.06 * rl) * (1 - 0.6 * fly)), translate: `0px ${fly * 470 + (1 - rl) * 20}px`}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <Mono style={{fontSize: 21, color: p.accent}}>{param(s, 'rule_label', 'Regla nueva')}</Mono>
          <div style={{fontFamily: MONO, fontSize: 20, letterSpacing: 2, borderRadius: 8, padding: '6px 12px', color: reg > 0.5 ? p.bg : p.onAccent,
            background: reg > 0.5 ? p.ok : p.accent}}>{reg > 0.5 ? param(s, 'saved_label', '✓ GUARDADA · PRÓXIMO CICLO') : param(s, 'new_label', 'NUEVA')}</div>
        </div>
        <div style={{fontFamily: MONO, fontSize: 34, color: p.ink, marginTop: 22, whiteSpace: 'pre'}}>{rule.if}</div>
        <div style={{fontFamily: MONO, fontSize: 34, color: p.ink, marginTop: 10, whiteSpace: 'pre'}}>{rule.then}</div>
      </div>
      <div style={{position: 'absolute', left: 230, right: 230, top: 930, height: 170, borderRadius: 22, border: `2px solid ${p.accent}`, background: p.surface2,
        opacity: store, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
        boxShadow: `0 0 ${20 + 40 * k01(frame, tNext + 30, 10) * (1 - k01(frame, tNext + 50, 20))}px ${p.okSoft}`}}>
        <svg viewBox="0 0 24 24" style={{width: 70, height: 70, fill: 'none', stroke: p.accent, strokeWidth: 1.6}}>
          <ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
        </svg>
        <div>
          <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: 34, color: p.ink}}>{param(s, 'store_title', 'Reglas')}</div>
          <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: 30, color: p.ok, opacity: added > 0 ? 1 : 0}}>{param(s, 'store_added', '+{n} nuevas').replace('{n}', String(added))}</div>
        </div>
      </div>
      <div style={{position: 'absolute', left: 90, right: 90, top: 1130, opacity: gauge}}>
        <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: PLEX, fontSize: 27, color: p.muted}}>
          <span>{param(s, 'gauge_label', 'Resolución automática')}</span><b style={{color: p.ok}}>{param(s, 'gauge_value', 'se mantiene alta')}</b>
        </div>
        <div style={{height: 14, borderRadius: 7, background: p.line, marginTop: 10, overflow: 'hidden'}}>
          <div style={{width: `${param(s, 'gauge_pct', 92) * gauge}%`, height: '100%', background: p.ok}} />
        </div>
      </div>
      <Notes notes={param<NoteDef[]>(s, 'notes', [{kind: 'CONCEPTUAL', text: 'Ejemplo de regla · datos ocultos'}])} top={1240} on={k01(frame, tNext + 30, 12)} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ DELIVER · entrega final */
export const DeliverScene = ({s}: {s: Scene}) => {
  const p = useTh();
  const {frame, f} = useT();
  const data = useScan();
  const rows = buildRows(data);
  const total = param(s, 'total', data.total);
  const cols = param<string[]>(s, 'columns', ['Fecha', 'Grupo', 'Categoría', 'Valor']);
  const groups = param<string[]>(s, 'groups', []).slice(0, 3);
  const fixTo = param<string>(s, 'fixed_value', '');
  const tClick = 14;
  const tLoad = f(beat(s, 'load', 3.5));
  const tOk = s.beats['ok'] !== undefined ? f(beat(s, 'ok', 5)) : tLoad + 10;
  const n = countUp(frame, tClick + 4, tLoad - tClick - 4, total);
  const ROWS_V = 13;
  const filled = Math.min(ROWS_V, Math.floor((n / Math.max(1, total)) * ROWS_V + 0.0001));
  const btn = {x: 540, y: 1150};
  const ptr = [{f: 0, x: 900, y: 1350}, {f: tClick, x: btn.x + 90, y: btn.y + 10, click: true}];
  const W = [120, 170, 380, 230];
  return (
    <AbsoluteFill>
      <Backdrop />
      <AppWindow title={param(s, 'window_title', 'Entregable final')} style={{left: WIN.left, top: WIN.top, width: WIN.w, height: 780}}>
        <div style={{display: 'flex', padding: '18px 26px', fontFamily: MONO, fontSize: 19, letterSpacing: 1.5, color: p.muted, borderBottom: `1.5px solid ${p.line}`}}>
          {cols.map((h, i) => <div key={h} style={{width: W[i]}}>{h.toUpperCase()}</div>)}
        </div>
        {Array.from({length: ROWS_V}, (_, i) => {
          const on = i < filled;
          const r = rows[(i * 5) % rows.length]!;
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', height: 44, padding: '0 26px', fontFamily: PLEX, fontSize: 21, color: p.ink,
              borderBottom: `1px solid ${p.line}`, opacity: on ? 1 : 0.12, background: on && i === filled - 1 ? p.surface2 : 'transparent'}}>
              <div style={{width: W[0], fontFamily: MONO}}>{r.date}</div>
              <div style={{width: W[1]}}>{groups.length ? groups[i % groups.length] : `#${i + 1}`}</div>
              <div style={{width: W[2], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{r.card && fixTo ? fixTo : r.rubro}</div>
              <div style={{width: W[3]}}><span style={{display: 'inline-block', width: 60 + ((i * 37) % 90), height: 16, borderRadius: 4, background: p.line}} /></div>
            </div>
          );
        })}
      </AppWindow>
      <div style={{position: 'absolute', left: 60, top: 1110, opacity: k01(frame, tClick + 6, 10)}}>
        <FastForward on={1 - k01(frame, tLoad, 8)} label={param(s, 'ff_label', 'carga acelerada')} />
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1090, textAlign: 'center', opacity: k01(frame, tLoad - 4, 10)}}>
        <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: 64, color: p.ink, fontVariantNumeric: 'tabular-nums'}}>
          {n} <span style={{fontSize: 34, color: p.muted, fontWeight: 400}}>{param(s, 'counter_label', 'registros entregados')}</span>
        </div>
      </div>
      {groups.length > 0 && (
        <div style={{position: 'absolute', left: 50, right: 50, top: 1190, display: 'flex', gap: 16}}>
          {groups.map((g, i) => {
            const k = k01(frame, tOk - 4 + i * 4, 12);
            return (
              <div key={g} style={{flex: 1, padding: '14px 16px', borderRadius: 16, background: p.okSoft, border: `2px solid ${p.ok}`, opacity: k, scale: String(0.9 + 0.1 * k)}}>
                <div style={{fontFamily: PLEX, fontSize: 24, color: p.muted}}>{g}</div>
                <div style={{fontFamily: PLEX, fontWeight: 700, fontSize: 29, color: p.ok}}>{param(s, 'ok_label', '✓ Listo')}</div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{position: 'absolute', left: btn.x - 260, top: btn.y - 44, width: 520, height: 88, borderRadius: 20, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: PLEX, fontWeight: 700, fontSize: 34, background: p.accent, color: p.onAccent, boxShadow: `0 0 30px ${p.glow}`,
        opacity: 1 - k01(frame, tClick + 8, 8), scale: String(frame >= tClick && frame < tClick + 7 ? 0.96 : 1)}}>{param(s, 'button', 'Enviar')}</div>
      <Pointer keys={ptr} show={[0, tClick + 14]} />
      <Notes notes={param<NoteDef[]>(s, 'notes', [])} top={1310} on={k01(frame, tOk, 12)} />
    </AbsoluteFill>
  );
};
