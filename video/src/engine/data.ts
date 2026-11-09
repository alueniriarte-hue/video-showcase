/**
 * Universo de filas que se escanea (escena scan) y se revisa (review/deliver). Puro y determinista.
 * total = filas del período; auto = resueltas por regla; total - auto = a revisar. Hasta 4 se vuelven tarjetas de ejemplo.
 */
export type Row = {date: string; mov: string; rubro: string; motivo: string; review: boolean; card?: boolean};
export type CardDef = {date: string; mov: string; rubro: string; motivo: string};
export type ScanData = {
  total: number; auto: number; rows: string[][]; amber?: string[][]; cards?: CardDef[];
  month?: string; ok_motivo?: string;
  /** 'month' (por defecto): fechas dd/mm repartidas en el mes. 'day': horas hh:mm de 08:00 a 18:00 (un día de trabajo). */
  period?: 'month' | 'day';
};

export const buildRows = (d: ScanData): Row[] => {
  const total = Math.max(1, Math.round(d.total));
  const nRev = Math.max(0, Math.min(total, total - Math.round(d.auto)));
  const cards = (d.cards ?? []).slice(0, Math.min(4, nRev));
  const nCards = cards.length;
  const month = d.month ?? '03';
  // tarjetas repartidas a lo largo (la última cerca del final); el resto de las revisiones, intercaladas
  const cardIdx = cards.map((_, k) => Math.min(total - 1, Math.round(((k + 0.5) / nCards) * total)));
  const others = nRev - nCards;
  const taken = new Set(cardIdx);
  const amberIdx: number[] = [];
  for (let k = 0; k < others; k++) {
    let i = Math.min(total - 1, Math.round(((k + 0.3) / Math.max(1, others)) * total));
    while (taken.has(i)) i = (i + 1) % total;
    taken.add(i);
    amberIdx.push(i);
  }
  const base = d.rows.length ? d.rows : [['MOVIMIENTO', 'Categoría']];
  const amber = d.amber?.length ? d.amber : [['MOVIMIENTO', 'Categoría', 'Revisar']];
  const stamp = (i: number): string => {
    if (d.period === 'day') {
      const m = 8 * 60 + Math.floor((i * 600) / total);
      return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    }
    return String(Math.min(30, 1 + Math.floor((i * 30) / total))).padStart(2, '0') + '/' + month;
  };
  return Array.from({length: total}, (_, i) => {
    const c = cardIdx.indexOf(i);
    if (c >= 0) return {...cards[c]!, review: true, card: true};
    const day = stamp(i);
    const a = amberIdx.indexOf(i);
    if (a >= 0) {
      const [mov, rubro, motivo] = amber[a % amber.length]!;
      return {date: day, mov: mov ?? '', rubro: rubro ?? '', motivo: motivo ?? '', review: true};
    }
    const [mov, rubro] = base[(i * 7) % base.length]!;
    return {date: day, mov: mov ?? '', rubro: rubro ?? '', motivo: d.ok_motivo ?? 'Regla', review: false};
  });
};
