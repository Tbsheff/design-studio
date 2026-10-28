import type { CompiledTokenEntry, TokenType } from '../../../shared/contracts.js';
import { resolveVars } from '../extract/css.js';
import { normalizeLength, toOklchColor } from '../extract/values.js';
import type { CssDeclaration, CssTokenSheet } from './read-css.js';

export interface AppToken {
  name: string;
  path: string;
  group: string;
  type: TokenType;
  light: CssDeclaration | null;
  dark: CssDeclaration | null;
  lights: CssDeclaration[];
  value: string;
  darkValue: string | null;
}

const NAMESPACES: Array<[RegExp, string, TokenType | null]> = [
  [/^--color(-|$)/, 'color', 'color'],
  [/^--font-weight(-|$)/, 'font-weight', 'fontWeight'],
  [/^--font(-|$)/, 'font', 'fontFamily'],
  [/^--text-[A-Za-z0-9_-]+?--line-height$/, 'leading', null],
  [/^--text-[A-Za-z0-9_-]+?--letter-spacing$/, 'tracking', null],
  [/^--text-[A-Za-z0-9_-]+?--font-weight$/, 'font-weight', 'fontWeight'],
  [/^--text-shadow(-|$)/, 'text-shadow', 'shadow'],
  [/^--text(-|$)/, 'text', 'dimension'],
  [/^--spacing(-|$)/, 'space', 'dimension'],
  [/^--radius(-|$)/, 'radius', 'dimension'],
  [/^--inset-shadow(-|$)/, 'inset-shadow', 'shadow'],
  [/^--drop-shadow(-|$)/, 'drop-shadow', 'shadow'],
  [/^--shadow(-|$)/, 'shadow', 'shadow'],
  [/^--breakpoint(-|$)/, 'breakpoint', 'dimension'],
  [/^--container(-|$)/, 'container', 'dimension'],
  [/^--tracking(-|$)/, 'tracking', null],
  [/^--leading(-|$)/, 'leading', null],
  [/^--blur(-|$)/, 'blur', 'dimension'],
  [/^--perspective(-|$)/, 'perspective', null],
  [/^--aspect(-|$)/, 'aspect', 'other'],
  [/^--ease(-|$)/, 'ease', 'other'],
  [/^--animate(-|$)/, 'animate', 'other'],
];

const NUMBER = /^-?(\d+\.?\d*|\.\d+)$/;
const DURATION = /^-?(\d+\.?\d*|\.\d+)(ms|s)$/;
const SHADOW_HINT = /\d(px|rem|em)?\s+-?\d.*(#|rgb|hsl|oklch|oklab|lab|lch|color-mix|black|white|transparent)/i;

function valueType(value: string): TokenType {
  if (toOklchColor(value)) return 'color';
  if (normalizeLength(value) || /^calc\(/.test(value)) return 'dimension';
  if (NUMBER.test(value)) return 'number';
  if (DURATION.test(value)) return 'duration';
  if (SHADOW_HINT.test(value)) return 'shadow';
  return 'other';
}

export function tokenGroup(name: string, resolved: string): { group: string; type: TokenType } {
  for (const [test, group, type] of NAMESPACES) if (test.test(name)) return { group, type: type ?? valueType(resolved) };
  const type = valueType(resolved);
  if (type === 'color') return { group: 'color', type };
  if (/radius/.test(name) && type === 'dimension') return { group: 'radius', type };
  if (/shadow|elevation/.test(name) && type === 'shadow') return { group: 'shadow', type };
  if (/^--font-?(sans|serif|mono|family|display|body|heading)/.test(name)) return { group: 'font', type: 'fontFamily' };
  return { group: 'other', type };
}

function effectiveLight(lights: CssDeclaration[]): CssDeclaration | null {
  const unlayered = lights.filter((decl) => decl.scope === 'root');
  return unlayered.at(-1) ?? lights.at(-1) ?? null;
}

export function buildAppTokens(sheet: CssTokenSheet): AppToken[] {
  const order: string[] = [];
  const lights = new Map<string, CssDeclaration[]>();
  const darks = new Map<string, CssDeclaration>();
  for (const decl of sheet.declarations) {
    if (!lights.has(decl.name) && !darks.has(decl.name)) order.push(decl.name);
    if (decl.scope === 'dark') darks.set(decl.name, decl);
    else lights.set(decl.name, [...(lights.get(decl.name) ?? []), decl]);
  }
  const lightScope = new Map<string, string>();
  const darkScope = new Map<string, string>();
  for (const name of order) {
    const light = effectiveLight(lights.get(name) ?? []);
    if (light) lightScope.set(name, light.value);
    const dark = darks.get(name);
    if (dark) darkScope.set(name, dark.value);
  }
  return order.map((name) => {
    const all = lights.get(name) ?? [];
    const light = effectiveLight(all);
    const dark = darks.get(name) ?? null;
    const lightRaw = light?.value ?? dark?.value ?? '';
    const value = resolveVars(lightRaw, [lightScope, darkScope]);
    const darkResolved = resolveVars(dark?.value ?? lightRaw, [darkScope, lightScope]);
    const { group, type } = tokenGroup(name, value);
    return {
      name,
      path: `${group}.${name.slice(2)}`,
      group,
      type,
      light,
      dark,
      lights: all,
      value,
      darkValue: dark || darkResolved !== value ? darkResolved : null,
    };
  });
}

export function appTokenEntries(tokens: AppToken[], file: string): CompiledTokenEntry[] {
  return tokens.map((token) => ({
    path: token.path,
    cssVar: token.name,
    type: token.type,
    value: token.value,
    darkValue: token.darkValue,
    source: {
      file,
      line: (token.light ?? token.dark)?.line ?? 0,
      value: token.light?.value ?? token.dark?.value ?? '',
      darkLine: token.dark?.line ?? null,
      darkValue: token.dark?.value ?? null,
      lines: token.lights.map((decl) => decl.line),
    },
  }));
}
