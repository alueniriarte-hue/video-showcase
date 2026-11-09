/**
 * Composición "Showcase". Las props (guion ya cronometrado, tema, datos y audio) las genera scripts/build.py
 * y se pasan al render con --props=work/<proyecto>/<version>/props.json. Sin props muestra un ejemplo vacío.
 */
import {Composition} from 'remotion';
import {ShowcaseVideo} from './engine/Video.tsx';
import type {VideoProps} from './engine/kit.tsx';

const EMPTY: VideoProps = {
  id: 'vacio', title: 'Sin guion', fps: 30, bpm: 120, duration_s: 4, durationInFrames: 120, audio: '', voice: '', voice_note: '', publication: '',
  chapters: [], captions: [], sfx: [], theme_input: {preset: 'nocturno'}, dataset: {},
  scenes: [{id: 'intro', act: 'intro', type: 'intro', step: null, step_label: null, start: 0, dur: 4, lines: [], beats: {},
    params: {title: ['Corré', 'scripts/build.py'], subtitle: 'y renderizá con --props'}}],
};

export const Root = () => (
  <Composition id="Showcase" component={ShowcaseVideo} width={1080} height={1920} fps={30} durationInFrames={EMPTY.durationInFrames}
    defaultProps={EMPTY}
    calculateMetadata={({props}) => ({durationInFrames: props.durationInFrames, fps: props.fps})} />
);
