import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildTheme, checkTheme, contrast, PRESETS, resolveTheme} from '../src/engine/theme.ts';

test('contrast: negro sobre blanco es 21 y un color consigo mismo es 1', () => {
  assert.ok(Math.abs(contrast('#000000', '#FFFFFF') - 21) < 0.01);
  assert.ok(Math.abs(contrast('#5B8CFF', '#5B8CFF') - 1) < 0.001);
});

test('el preset nocturno conserva exactamente los colores aprobados', () => {
  const t = PRESETS['nocturno']!;
  assert.equal(t.bg, '#060914');
  assert.equal(t.accent, '#5B8CFF');
  assert.equal(t.ok, '#34E0A1');
  assert.equal(t.review, '#FFC547');
});

test('buildTheme oscuro desde un solo acento da texto legible y sin advertencias', () => {
  const t = buildTheme({mode: 'dark', accent: '#FF8A3D'});
  assert.equal(t.dark, true);
  assert.ok(contrast(t.ink, t.bg) >= 7, 'texto principal');
  assert.ok(contrast(t.muted, t.bg) >= 3, 'texto secundario');
  assert.deepEqual(checkTheme(t), []);
});

test('buildTheme claro también pasa los chequeos de contraste', () => {
  const t = buildTheme({mode: 'light', accent: '#2F6BFF'});
  assert.equal(t.dark, false);
  assert.ok(contrast(t.ink, t.bg) >= 7);
  assert.deepEqual(checkTheme(t), []);
});

test('checkTheme avisa cuando el acento casi no se distingue del fondo', () => {
  const t = buildTheme({mode: 'dark', accent: '#14161C', background: '#101216'});
  const w = checkTheme(t);
  assert.ok(w.some((m) => m.includes('acento')), w.join(' | '));
});

test('resolveTheme acepta un preset por nombre o colores propios', () => {
  assert.equal(resolveTheme({preset: 'nocturno'}).accent, '#5B8CFF');
  assert.equal(resolveTheme({accent: '#22AA88'}).accent, '#22AA88');
  assert.throws(() => resolveTheme({preset: 'inexistente'}), /preset/);
});
