import assert from 'node:assert/strict';
import {test} from 'node:test';
import {bezier, cameraAt, cameraTransform, chapterAt, chunkCaptions, countUp, EASE, k01, pathAt, rising, sinceClick, stepSpan} from '../src/engine/motion.ts';

test('bezier coincide con los extremos y es monótona para la curva de la casa', () => {
  assert.equal(EASE(0), 0);
  assert.equal(EASE(1), 1);
  let prev = 0;
  for (let x = 0.01; x <= 1; x += 0.01) {
    const v = EASE(x);
    assert.ok(v >= prev - 1e-9, `no monótona en ${x}`);
    prev = v;
  }
  const lin = bezier(0, 0, 1, 1);
  assert.ok(Math.abs(lin(0.37) - 0.37) < 1e-4, 'la recta (0,0,1,1) es la identidad');
});

test('k01 se queda en 0 antes y en 1 después del tramo', () => {
  assert.equal(k01(5, 10, 20), 0);
  assert.equal(k01(40, 10, 20), 1);
  assert.ok(k01(20, 10, 20) > 0 && k01(20, 10, 20) < 1);
});

test('pathAt: quieto en cada clave, llega exactamente en el cuadro de la clave', () => {
  const keys = [{f: 0, x: 100, y: 100}, {f: 60, x: 500, y: 900, click: true}];
  assert.deepEqual(pathAt(keys, 0), {x: 100, y: 100});
  assert.deepEqual(pathAt(keys, 30), {x: 100, y: 100}, 'antes de arrancar el viaje sigue quieto');
  assert.deepEqual(pathAt(keys, 60), {x: 500, y: 900});
  assert.deepEqual(pathAt(keys, 200), {x: 500, y: 900});
  const mid = pathAt(keys, 53);
  assert.ok(mid.x > 100 && mid.x < 500);
});

test('sinceClick cuenta cuadros desde el último clic', () => {
  const keys = [{f: 10, x: 0, y: 0, click: true}, {f: 40, x: 0, y: 0}, {f: 50, x: 0, y: 0, click: true}];
  assert.equal(sinceClick(keys, 5), null);
  assert.equal(sinceClick(keys, 12), 2);
  assert.equal(sinceClick(keys, 55), 5);
});

test('cameraAt interpola desde la clave y cameraTransform centra el punto pedido', () => {
  const keys = [{f: 0, cx: 540, cy: 960, s: 1}, {f: 30, cx: 300, cy: 600, s: 1.5, len: 20}];
  assert.deepEqual(cameraAt(keys, 10), {cx: 540, cy: 960, s: 1});
  const end = cameraAt(keys, 80);
  assert.ok(Math.abs(end.s - 1.5) < 1e-9 && Math.abs(end.cx - 300) < 1e-9);
  assert.equal(cameraTransform({cx: 540, cy: 960, s: 1}), 'translate(0px, 0px) scale(1)');
});

test('chunkCaptions corta por línea, por puntuación y por máximo de palabras', () => {
  const w = (text: string, line: string, i: number) => ({text, startMs: i * 100, endMs: i * 100 + 90, line});
  const caps = [w('Paso', 'a', 0), w('uno:', 'a', 1), w('cargás', 'a', 2), w('los', 'a', 3), w('resúmenes,', 'a', 4), w('Hoy', 'b', 5)];
  const g = chunkCaptions(caps, 6);
  assert.deepEqual(g.map((x) => x.map((c) => c.text).join(' ')), ['Paso uno: cargás los resúmenes,', 'Hoy']);
  const long = Array.from({length: 9}, (_, i) => w(`p${i}`, 'x', i));
  assert.deepEqual(chunkCaptions(long, 4).map((x) => x.length), [4, 4, 1]);
});

test('countUp llega exacto al total y no lo pasa', () => {
  assert.equal(countUp(0, 10, 30, 247), 0);
  assert.equal(countUp(40, 10, 30, 247), 247);
  for (let f = 0; f < 60; f++) assert.ok(countUp(f, 10, 30, 247) <= 247);
});

test('stepSpan: un paso repartido en dos escenas ocupa de la primera a la última', () => {
  const sc = [
    {step: null, start: 0, dur: 5},
    {step: 1, start: 5, dur: 4},
    {step: 2, start: 9, dur: 3},
    {step: 2, start: 12, dur: 6},
    {step: null, start: 18, dur: 4},
  ];
  assert.deepEqual(stepSpan(sc, 1), {start: 5, end: 9});
  assert.deepEqual(stepSpan(sc, 2), {start: 9, end: 18});
  assert.equal(stepSpan(sc, 3), null);
});

test('chapterAt: capítulo vigente según el acto de la escena en curso', () => {
  const chapters = [{n: 1, act: 'antes', label: 'Antes'}, {n: 2, act: 'diseno', label: 'Diseño'}];
  const sc = [
    {act: 'intro', start: 0, dur: 10},
    {act: 'antes', start: 10, dur: 12},
    {act: 'diseno', start: 22, dur: 3},
    {act: 'diseno', start: 25, dur: 30},
  ];
  assert.equal(chapterAt(chapters, sc, 4), null, 'la intro no es capítulo');
  assert.equal(chapterAt(chapters, sc, 11)?.n, 1);
  assert.deepEqual(chapterAt(chapters, sc, 30), {n: 2, act: 'diseno', label: 'Diseño', start: 22, end: 55});
  assert.equal(chapterAt(chapters, sc, 99), null);
});

test('rising fuerza rangos estrictamente crecientes (beats faltantes en escenas cortas)', () => {
  assert.deepEqual(rising([11, 210, 210]), [11, 210, 211]);
  assert.deepEqual(rising([50, 40, 60]), [50, 51, 60]);
  assert.deepEqual(rising([1, 5, 9]), [1, 5, 9]);
});
