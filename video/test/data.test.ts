import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildRows} from '../src/engine/data.ts';

const scan = {total: 247, auto: 230, rows: [['ALTA', 'Ventas'], ['BAJA', 'Stock']], amber: [['RECLAMO', 'Ventas', 'Cliente sin identificar']],
  cards: [{date: '05/03', mov: 'PEDIDO WEB', rubro: 'Ventas', motivo: 'Precio desactualizado'}, {date: '12/03', mov: 'PEDIDO TEL', rubro: 'Ventas', motivo: 'Sin stock'}]};

test('buildRows arma el universo completo con la cantidad exacta a revisar', () => {
  const r = buildRows(scan);
  assert.equal(r.length, 247);
  assert.equal(r.filter((x) => x.review).length, 17, 'total - auto');
  assert.equal(r.filter((x) => x.card).length, 2, 'una tarjeta por ejemplo declarado');
  assert.ok(r.filter((x) => x.card).every((x) => x.review), 'las tarjetas también son a revisar');
});

test('buildRows es determinista y reparte las tarjetas a lo largo del universo', () => {
  const a = buildRows(scan);
  assert.deepEqual(a, buildRows(scan));
  const idx = a.map((x, i) => (x.card ? i : -1)).filter((i) => i >= 0);
  assert.ok(idx[0]! < 247 / 2 && idx[1]! > 247 / 2, idx.join(','));
});

test('buildRows limita las tarjetas a 4 y no inventa más revisiones que las declaradas', () => {
  const many = {...scan, total: 20, auto: 18, cards: Array.from({length: 6}, (_, i) => ({date: '01/03', mov: 'X' + i, rubro: 'R', motivo: 'M'}))};
  const r = buildRows(many);
  assert.equal(r.filter((x) => x.review).length, 2);
  assert.equal(r.filter((x) => x.card).length, 2);
});

test("buildRows con period 'day' muestra horas de un día de trabajo", () => {
  const r = buildRows({...scan, period: 'day'});
  const plain = r.filter((x) => !x.card);
  assert.equal(plain[0]!.date, '08:00');
  assert.ok(plain.every((x) => /^(0[89]|1[0-7]):[0-5][0-9]$/.test(x.date)), plain.map((x) => x.date).join(','));
});
