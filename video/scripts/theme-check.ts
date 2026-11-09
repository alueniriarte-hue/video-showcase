/** Uso: node scripts/theme-check.ts <theme.json>  -> imprime el tema resuelto y advertencias de contraste (sale con 0 igual). */
import {readFileSync} from 'node:fs';
import {checkTheme, resolveTheme} from '../src/engine/theme.ts';

const path = process.argv[2];
if (!path) throw new Error('falta la ruta a theme.json');
const input = JSON.parse(readFileSync(path, 'utf-8'));
const t = resolveTheme(input);
const w = checkTheme(t);
console.log(JSON.stringify({accent: t.accent, bg: t.bg, mode: t.dark ? 'dark' : 'light', warnings: w}));
