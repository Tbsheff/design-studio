import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REQUIRED_TOKENS } from '../src/shared/contracts.js';
import type { DesignToken, PackManifest, TokenFile, TokenGroup } from '../src/shared/contracts.js';

type Rgb = { r: number; g: number; b: number; inGamut: boolean };
type Pair = { fg: string; bg: string; min: number };

const PAIRS: Pair[] = [
  { fg: 'fg', bg: 'bg', min: 7 },
  { fg: 'fg', bg: 'surface', min: 7 },
  { fg: 'fg-muted', bg: 'bg', min: 4.6 },
  { fg: 'fg-muted', bg: 'surface', min: 4.6 },
  { fg: 'primary-fg', bg: 'primary', min: 4.6 },
  { fg: 'accent-fg', bg: 'accent', min: 4.6 },
  { fg: 'ring', bg: 'bg', min: 3 },
];

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packsDir = path.join(root, 'src/server/design-system/packs');

function parseOklch(value: string): Rgb {
  const m = /^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)$/.exec(value.trim());
  if (!m) throw new Error(`not oklch(L% C H): ${value}`);
  const L = Number(m[1]) / 100;
  const C = Number(m[2]);
  const h = (Number(m[3]) * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s;
  const eps = 0.0005;
  const inGamut = [r, g, bl].every((c) => c >= -eps && c <= 1 + eps);
  return { r, g, b: bl, inGamut };
}

function luminance(c: Rgb): number {
  const k = (x: number) => Math.min(1, Math.max(0, x));
  return 0.2126 * k(c.r) + 0.7152 * k(c.g) + 0.0722 * k(c.b);
}

function ratio(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function isToken(x: unknown): x is DesignToken {
  return typeof x === 'object' && x !== null && '$value' in x;
}

const errors: string[] = [];
const rows: string[] = [];
const summary: string[] = [];

for (const id of readdirSync(packsDir).sort()) {
  const dir = path.join(packsDir, id);
  const tokensPath = path.join(dir, 'tokens.json');
  const packPath = path.join(dir, 'pack.json');
  if (!existsSync(tokensPath) || !existsSync(packPath)) {
    errors.push(`${id}: missing tokens.json or pack.json`);
    continue;
  }
  const tokens = JSON.parse(readFileSync(tokensPath, 'utf8')) as TokenFile;
  const pack = JSON.parse(readFileSync(packPath, 'utf8')) as PackManifest;
  if (pack.id !== id) errors.push(`${id}: pack.id is ${pack.id}`);
  for (const [group, names] of Object.entries(REQUIRED_TOKENS)) {
    const g = tokens[group] as TokenGroup | undefined;
    for (const name of names) {
      if (!g || !isToken(g[name])) errors.push(`${id}: missing ${group}.${name}`);
    }
  }
  const colors = tokens.color;
  const modes: ('light' | 'dark')[] = pack.mode === 'dark' ? ['dark'] : ['light', 'dark'];
  const resolve = (name: string, mode: 'light' | 'dark'): Rgb => {
    const t = colors[name];
    if (!isToken(t)) throw new Error(`${id}: color.${name} missing`);
    const dark = t.$extensions?.['studio.modes']?.dark;
    const v = pack.mode === 'light' && mode === 'dark' ? dark : t.$value;
    if (!v) throw new Error(`${id}: color.${name} has no ${mode} value`);
    return parseOklch(v);
  };
  for (const [name, t] of Object.entries(colors)) {
    if (!isToken(t)) continue;
    const dark = t.$extensions?.['studio.modes']?.dark;
    if (pack.mode === 'light' && !dark) errors.push(`${id}: color.${name} has no dark mode`);
    if (pack.mode === 'dark' && t.$extensions?.['studio.modes']) errors.push(`${id}: dark pack color.${name} has modes`);
    for (const v of [t.$value, dark]) {
      if (!v) continue;
      try {
        if (!parseOklch(v).inGamut) errors.push(`${id}: color.${name} ${v} is outside sRGB`);
      } catch (e) {
        errors.push(`${id}: ${(e as Error).message}`);
      }
    }
  }
  const primary = colors.primary;
  const primaryIsLink = isToken(primary) && /link/i.test(primary.$description ?? '') && !/never text/i.test(primary.$description ?? '');
  const pairs: Pair[] = primaryIsLink
    ? [...PAIRS, { fg: 'primary', bg: 'bg', min: 4.6 }, { fg: 'primary', bg: 'surface', min: 4.6 }]
    : PAIRS;
  for (const mode of modes) {
    let low = Infinity;
    for (const p of pairs) {
      const r = ratio(resolve(p.fg, mode), resolve(p.bg, mode));
      if (p.min > 3) low = Math.min(low, r);
      const ok = r >= p.min;
      if (!ok) errors.push(`${id} ${mode}: ${p.fg} on ${p.bg} = ${r.toFixed(2)} < ${p.min}`);
      rows.push(`| ${id} | ${mode} | ${p.fg} / ${p.bg} | ${r.toFixed(2)} | ${ok ? 'pass' : 'FAIL'} |`);
    }
    summary.push(`| ${id} | ${mode} | ${low.toFixed(2)} |`);
  }
}

const verbose = process.argv.includes('--all');
if (verbose) console.log(['| pack | mode | pair | ratio | result |', '|---|---|---|---|---|', ...rows].join('\n'));
console.log(['| pack | mode | min text ratio |', '|---|---|---|', ...summary].join('\n'));
if (errors.length) {
  console.log(`\n${errors.length} problem(s):\n${errors.join('\n')}`);
  process.exit(1);
}
console.log('\nall packs pass');
