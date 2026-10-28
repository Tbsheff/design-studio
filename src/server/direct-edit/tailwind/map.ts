import { colorDistance, parseColor, type ParsedColor } from './color.js';
import type { Side, SidedGroup, SideValue, SingleGroup } from './classes.js';
import type { TailwindTheme, ThemeNamespace } from './theme.js';
import { emValue, lengthToPx, percent, plainNumber } from './units.js';

export type CssEdit =
  | { kind: 'sided'; group: SidedGroup; values: Partial<Record<Side, SideValue | null>> }
  | { kind: 'single'; group: SingleGroup; token: string | null };

const PX_TOLERANCE = 0.5;
const COLOR_TOLERANCE = 0.02;
const V3_SPACING = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96];
const V4_HALVES = [0.5, 1.5, 2.5, 3.5];
const V3_OPACITY = new Set([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]);
const FRACTIONS: Array<[number, string]> = [
  [50, '1/2'], [100 / 3, '1/3'], [200 / 3, '2/3'], [25, '1/4'], [75, '3/4'], [20, '1/5'], [40, '2/5'], [60, '3/5'], [80, '4/5'],
  [100 / 6, '1/6'], [500 / 6, '5/6'], [100 / 12, '1/12'], [500 / 12, '5/12'], [700 / 12, '7/12'], [1100 / 12, '11/12'],
];
const KEYWORDS: Record<string, Record<string, string>> = {
  display: { flex: 'flex', block: 'block', 'inline-block': 'inline-block', inline: 'inline', grid: 'grid', 'inline-grid': 'inline-grid', 'inline-flex': 'inline-flex', none: 'hidden', contents: 'contents', table: 'table', 'flow-root': 'flow-root', 'list-item': 'list-item' },
  'flex-direction': { column: 'flex-col', row: 'flex-row', 'column-reverse': 'flex-col-reverse', 'row-reverse': 'flex-row-reverse' },
  'flex-wrap': { wrap: 'flex-wrap', nowrap: 'flex-nowrap', 'wrap-reverse': 'flex-wrap-reverse' },
  'align-items': { center: 'items-center', 'flex-start': 'items-start', start: 'items-start', 'flex-end': 'items-end', end: 'items-end', baseline: 'items-baseline', stretch: 'items-stretch', normal: 'items-normal' },
  'align-self': { auto: 'self-auto', center: 'self-center', 'flex-start': 'self-start', start: 'self-start', 'flex-end': 'self-end', end: 'self-end', stretch: 'self-stretch', baseline: 'self-baseline' },
  'justify-content': { center: 'justify-center', 'flex-start': 'justify-start', start: 'justify-start', 'flex-end': 'justify-end', end: 'justify-end', 'space-between': 'justify-between', 'space-around': 'justify-around', 'space-evenly': 'justify-evenly', stretch: 'justify-stretch', normal: 'justify-normal' },
  'text-align': { left: 'text-left', center: 'text-center', right: 'text-right', justify: 'text-justify', start: 'text-start', end: 'text-end' },
  'font-style': { italic: 'italic', normal: 'not-italic' },
  'text-transform': { uppercase: 'uppercase', lowercase: 'lowercase', capitalize: 'capitalize', none: 'normal-case' },
  'text-decoration-line': { underline: 'underline', overline: 'overline', 'line-through': 'line-through', none: 'no-underline' },
  overflow: { hidden: 'overflow-hidden', auto: 'overflow-auto', scroll: 'overflow-scroll', visible: 'overflow-visible', clip: 'overflow-clip' },
  'border-style': { solid: 'border-solid', dashed: 'border-dashed', dotted: 'border-dotted', double: 'border-double', hidden: 'border-hidden', none: 'border-none' },
};
const SINGLE_PROPS: Record<string, SingleGroup> = {
  color: 'color',
  'background-color': 'bg',
  'font-size': 'font-size',
  'font-weight': 'font-weight',
  'font-family': 'font-family',
  'line-height': 'leading',
  'letter-spacing': 'tracking',
  'text-align': 'text-align',
  'border-width': 'border-width',
  'border-style': 'border-style',
  'border-color': 'border-color',
  display: 'display',
  opacity: 'opacity',
  'flex-direction': 'flex-direction',
  'flex-wrap': 'flex-wrap',
  'justify-content': 'justify',
  'align-items': 'items',
  'align-self': 'self',
  flex: 'flex',
  'box-shadow': 'shadow',
  filter: 'filter',
  'font-style': 'font-style',
  'text-decoration-line': 'decoration',
  'text-transform': 'case',
  overflow: 'overflow',
  'text-shadow': 'text-shadow',
  transform: 'transform',
};
const BOX_PROPS: Record<string, [SidedGroup, Side]> = {
  'padding-top': ['padding', 't'],
  'padding-right': ['padding', 'r'],
  'padding-bottom': ['padding', 'b'],
  'padding-left': ['padding', 'l'],
  'margin-top': ['margin', 't'],
  'margin-right': ['margin', 'r'],
  'margin-bottom': ['margin', 'b'],
  'margin-left': ['margin', 'l'],
  'row-gap': ['gap', 'y'],
  'column-gap': ['gap', 'x'],
  width: ['dims', 'w'],
  height: ['dims', 'h'],
  'border-top-left-radius': ['radius', 'tl'],
  'border-top-right-radius': ['radius', 'tr'],
  'border-bottom-right-radius': ['radius', 'br'],
  'border-bottom-left-radius': ['radius', 'bl'],
};

export function isMappedProperty(prop: string): boolean {
  return prop in SINGLE_PROPS || prop in BOX_PROPS || prop === 'border-radius' || prop === 'gap' || prop === 'padding' || prop === 'margin';
}

function arbitrary(value: string): string {
  return `[${value.trim().replace(/\s*,\s*/g, ',').replace(/\s+/g, '_')}]`;
}

function varName(value: string): string | null {
  return /^var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,[^)]*)?\)$/.exec(value.trim())?.[1] ?? null;
}

function themeVar(theme: TailwindTheme, value: string, ns: ThemeNamespace): string | null {
  const name = varName(value);
  if (!name) return null;
  const hit = theme.vars.get(name);
  return hit && hit.ns === ns ? hit.name : null;
}

function arbitraryVar(theme: TailwindTheme, name: string, hint: string): string {
  if (theme.version === 4) return hint ? `(${hint}:${name})` : `(${name})`;
  return hint ? `[${hint}:var(${name})]` : `[var(${name})]`;
}

function nearestNamed(map: Map<string, number>, target: number, tolerance: number): string | null {
  let best: { name: string; diff: number } | null = null;
  for (const [name, value] of map) {
    const diff = Math.abs(value - target);
    if (diff <= tolerance && (!best || diff < best.diff || (diff === best.diff && name.length < best.name.length))) best = { name, diff };
  }
  return best?.name ?? null;
}

function trimNumber(value: number): string {
  return String(Number(value.toFixed(4)));
}

function spacingStep(px: number, theme: TailwindTheme): string | null {
  if (px === 0) return '0';
  if (Math.abs(px - 1) <= 0.01 && theme.spacingPx !== 1) return 'px';
  const base = theme.spacingPx;
  if (theme.version === 3) {
    const step = V3_SPACING.find((step) => Math.abs(step * 4 - px) <= PX_TOLERANCE);
    return step === undefined ? null : trimNumber(step);
  }
  const whole = Math.round(px / base);
  if (whole > 0 && Math.abs(whole * base - px) <= PX_TOLERANCE) return String(whole);
  const half = V4_HALVES.find((step) => Math.abs(step * base - px) <= PX_TOLERANCE);
  if (half !== undefined) return trimNumber(half);
  return nearestNamed(theme.spacing, px, PX_TOLERANCE);
}

function signed(suffix: string, negative: boolean): SideValue {
  return { suffix, negative: negative && suffix !== '0' };
}

function spacingValue(value: string, theme: TailwindTheme, allowAuto: boolean): SideValue {
  const text = value.trim();
  if (allowAuto && text === 'auto') return signed('auto', false);
  const named = themeVar(theme, text, 'spacing');
  if (named !== null) return signed(named, false);
  const variable = varName(text);
  if (variable) return signed(arbitraryVar(theme, variable, ''), false);
  const px = lengthToPx(text);
  if (px !== null && Number.isFinite(px)) {
    const step = spacingStep(Math.abs(px), theme);
    if (step !== null) return signed(step, px < 0);
  }
  return signed(arbitrary(text), false);
}

function dimsValue(value: string, side: Side, theme: TailwindTheme): SideValue {
  const text = value.trim().toLowerCase();
  const keyword: Record<string, string> = { auto: 'auto', '100%': 'full', 'fit-content': 'fit', 'min-content': 'min', 'max-content': 'max' };
  if (keyword[text]) return signed(keyword[text], false);
  if (side === 'w' && text === '100vw') return signed('screen', false);
  if (side === 'h' && text === '100vh') return signed('screen', false);
  if (text === '100dvh' || text === '100svh' || text === '100lvh') return signed(text.slice(3), false);
  const pct = percent(text);
  if (pct !== null) {
    const fraction = FRACTIONS.find(([share]) => Math.abs(share - pct) < 0.05);
    if (fraction) return signed(fraction[1], false);
    return signed(arbitrary(text), false);
  }
  return spacingValue(value, theme, false);
}

function radiusValue(value: string, theme: TailwindTheme): SideValue {
  const text = value.trim();
  const named = themeVar(theme, text, 'radius');
  if (named !== null) return signed(named, false);
  const variable = varName(text);
  if (variable) return signed(arbitraryVar(theme, variable, ''), false);
  const px = lengthToPx(text);
  if (px === null) return signed(percent(text) === 50 ? 'full' : arbitrary(text), false);
  if (px === 0) return signed('none', false);
  if (px >= 9999) return signed('full', false);
  const step = nearestNamed(theme.radius, px, PX_TOLERANCE);
  return signed(step ?? arbitrary(text), false);
}

const COLOR_WORDS: Record<string, string> = { transparent: 'transparent', currentcolor: 'current', inherit: 'inherit' };

interface ColorHit {
  name: string;
  diff: number;
  project: boolean;
}

function betterHit(hit: ColorHit, best: ColorHit | null): boolean {
  if (!best || hit.diff < best.diff - 1e-6) return true;
  if (Math.abs(hit.diff - best.diff) > 1e-6) return false;
  if (hit.project !== best.project) return hit.project;
  return hit.name.length < best.name.length;
}

function nearestColor(target: ParsedColor, theme: TailwindTheme): string | null {
  let best: ColorHit | null = null;
  for (const entry of theme.colors) {
    if (!entry.color) continue;
    const hit = { name: entry.name, diff: colorDistance(target.color, entry.color), project: entry.project };
    if (hit.diff <= COLOR_TOLERANCE && betterHit(hit, best)) best = hit;
  }
  if (!best) return null;
  if (target.alpha >= 0.999) return best.name;
  const share = target.alpha * 100;
  return Math.abs(share - Math.round(share)) < 0.05 ? `${best.name}/${Math.round(share)}` : `${best.name}/[${trimNumber(target.alpha)}]`;
}

function colorSuffix(value: string, theme: TailwindTheme, hint: string): string {
  const text = value.trim();
  const word = COLOR_WORDS[text.toLowerCase()];
  if (word) return word;
  const named = themeVar(theme, text, 'color');
  if (named !== null) return named;
  const variable = varName(text);
  if (variable) return arbitraryVar(theme, variable, hint);
  const parsed = parseColor(text);
  return (parsed && nearestColor(parsed, theme)) ?? arbitrary(text);
}

function fontSizeToken(value: string, theme: TailwindTheme): string {
  const text = value.trim();
  const named = themeVar(theme, text, 'text');
  if (named !== null) return `text-${named}`;
  const variable = varName(text);
  if (variable) return `text-${arbitraryVar(theme, variable, 'length')}`;
  const px = lengthToPx(text);
  const step = px === null ? null : nearestNamed(theme.text, px, PX_TOLERANCE);
  return `text-${step ?? arbitrary(text)}`;
}

function fontWeightToken(value: string, theme: TailwindTheme): string {
  const text = value.trim().toLowerCase();
  const named = themeVar(theme, text, 'font-weight');
  if (named !== null) return `font-${named}`;
  const number = text === 'normal' ? 400 : text === 'bold' ? 700 : plainNumber(text);
  if (number !== null) {
    const step = nearestNamed(theme.fontWeight, number, 0);
    if (step !== null) return `font-${step}`;
  }
  const variable = varName(text);
  if (variable) return `font-${arbitraryVar(theme, variable, 'number')}`;
  return `font-${arbitrary(text)}`;
}

function firstFamily(stack: string): string {
  return (stack.split(',')[0] ?? '').trim().replace(/^["']|["']$/g, '').toLowerCase();
}

function fontFamilyToken(value: string, theme: TailwindTheme): string {
  const named = themeVar(theme, value, 'font');
  if (named !== null) return `font-${named}`;
  const first = firstFamily(value);
  for (const [name, stack] of theme.font) if (firstFamily(stack) === first) return `font-${name}`;
  const variable = varName(value);
  if (variable) return `font-${arbitraryVar(theme, variable, 'family-name')}`;
  return `font-${arbitrary(value.replace(/["']/g, ''))}`;
}

function leadingToken(value: string, theme: TailwindTheme): string {
  const text = value.trim();
  const named = themeVar(theme, text, 'leading');
  if (named !== null) return `leading-${named}`;
  const pct = percent(text);
  const number = pct !== null ? pct / 100 : plainNumber(text);
  if (number !== null) {
    if (Math.abs(number - 1) < 0.005) return 'leading-none';
    const step = nearestNamed(theme.leading, number, 0.005);
    return `leading-${step ?? arbitrary(trimNumber(number))}`;
  }
  const px = lengthToPx(text);
  if (px !== null) {
    const steps = px / (theme.version === 4 ? theme.spacingPx : 4);
    const whole = Math.round(steps);
    const fits = Math.abs(whole * (theme.version === 4 ? theme.spacingPx : 4) - px) <= PX_TOLERANCE;
    if (fits && (theme.version === 4 ? whole > 0 : whole >= 3 && whole <= 10)) return `leading-${whole}`;
  }
  return `leading-${arbitrary(text)}`;
}

function trackingToken(value: string, theme: TailwindTheme): string {
  const text = value.trim();
  const named = themeVar(theme, text, 'tracking');
  if (named !== null) return `tracking-${named}`;
  const em = emValue(text) ?? (lengthToPx(text) === 0 ? 0 : null);
  if (em !== null) {
    const step = nearestNamed(theme.tracking, em, 0.0015);
    if (step !== null) return `tracking-${step}`;
  }
  return `tracking-${arbitrary(text)}`;
}

function opacityToken(value: string, theme: TailwindTheme): string {
  const pct = percent(value);
  const number = pct !== null ? pct : (plainNumber(value) ?? Number.NaN) * 100;
  const whole = Math.round(number);
  if (Number.isFinite(number) && Math.abs(number - whole) < 0.01 && whole >= 0 && whole <= 100 && (theme.version === 4 || V3_OPACITY.has(whole))) return `opacity-${whole}`;
  return `opacity-${arbitrary(value)}`;
}

function borderWidthToken(value: string, theme: TailwindTheme): string {
  const px = lengthToPx(value);
  if (px !== null) {
    if (Math.abs(px - 1) < 0.01) return 'border';
    const whole = Math.round(px);
    if (Math.abs(px - whole) < 0.01 && (theme.version === 4 ? whole >= 0 : [0, 2, 4, 8].includes(whole))) return `border-${whole}`;
  }
  const variable = varName(value);
  if (variable) return `border-${arbitraryVar(theme, variable, 'length')}`;
  return `border-${arbitrary(value)}`;
}

function normalizeShadow(value: string): string {
  return value
    .toLowerCase()
    .replace(/(rgba?|hsla?|oklch|oklab)\([^()]*\)|#[0-9a-f]{3,8}\b/g, (match) => {
      const parsed = parseColor(match);
      if (!parsed) return match;
      const { l, c, h } = parsed.color;
      return `c(${l.toFixed(2)},${c.toFixed(2)},${(c > 0.01 ? (h ?? 0) : 0).toFixed(0)},${parsed.alpha.toFixed(2)})`;
    })
    .replace(/\b0px\b/g, '0')
    .replace(/\s*,\s*/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}

function shadowToken(value: string, theme: TailwindTheme): string {
  const text = value.trim();
  if (text === 'none') return 'shadow-none';
  const named = themeVar(theme, text, 'shadow');
  if (named !== null) return named === '' ? 'shadow' : `shadow-${named}`;
  const normalized = normalizeShadow(text);
  for (const [name, themeValue] of theme.shadow) {
    if (normalizeShadow(themeValue) === normalized) return name === '' ? 'shadow' : `shadow-${name}`;
  }
  return `shadow-${arbitrary(text)}`;
}

function flexToken(value: string): string {
  const text = value.trim().replace(/\s+/g, ' ');
  if (/^(1|1 1 0%|1 1 0px|1 1 0)$/.test(text)) return 'flex-1';
  if (/^(auto|1 1 auto)$/.test(text)) return 'flex-auto';
  if (/^(initial|0 1 auto)$/.test(text)) return 'flex-initial';
  if (/^(none|0 0 auto)$/.test(text)) return 'flex-none';
  return `flex-${arbitrary(text)}`;
}

function singleToken(prop: string, value: string, theme: TailwindTheme): string {
  const keyword = KEYWORDS[prop]?.[value.trim().toLowerCase()];
  if (keyword) return keyword;
  switch (prop) {
    case 'color':
      return `text-${colorSuffix(value, theme, 'color')}`;
    case 'background-color':
      return `bg-${colorSuffix(value, theme, '')}`;
    case 'border-color':
      return `border-${colorSuffix(value, theme, 'color')}`;
    case 'font-size':
      return fontSizeToken(value, theme);
    case 'font-weight':
      return fontWeightToken(value, theme);
    case 'font-family':
      return fontFamilyToken(value, theme);
    case 'line-height':
      return leadingToken(value, theme);
    case 'letter-spacing':
      return trackingToken(value, theme);
    case 'opacity':
      return opacityToken(value, theme);
    case 'border-width':
      return borderWidthToken(value, theme);
    case 'box-shadow':
      return shadowToken(value, theme);
    case 'flex':
      return flexToken(value);
    case 'filter':
      return value.trim() === 'none' ? 'filter-none' : `[filter:${arbitrary(value).slice(1, -1)}]`;
    case 'transform':
      return value.trim() === 'none' ? 'transform-none' : `[transform:${arbitrary(value).slice(1, -1)}]`;
    default:
      return `[${prop}:${arbitrary(value).slice(1, -1)}]`;
  }
}

function splitValues(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of value.trim()) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (/\s/.test(char) && depth === 0) {
      if (current) parts.push(current);
      current = '';
    } else current += char;
  }
  if (current) parts.push(current);
  return parts;
}

function cornerValues(value: string): Record<'tl' | 'tr' | 'br' | 'bl', string> | null {
  const parts = splitValues(value);
  const [a, b = a, c = a, d = b] = parts;
  if (!a || !b || !c || !d || parts.length > 4 || value.includes("/")) return null;
  return { tl: a, tr: b, br: c, bl: d };
}

function boxValues(value: string): Record<'t' | 'r' | 'b' | 'l', string> | null {
  const parts = splitValues(value);
  const [a, b = a, c = a, d = b] = parts;
  if (!a || !b || !c || !d || parts.length > 4) return null;
  return { t: a, r: b, b: c, l: d };
}

function sidedValue(group: SidedGroup, side: Side, value: string, theme: TailwindTheme): SideValue {
  if (group === 'radius') return radiusValue(value, theme);
  if (group === 'dims') return dimsValue(value, side, theme);
  return spacingValue(value, theme, group === 'margin');
}

function shorthandEdits(prop: 'border-radius' | 'padding' | 'margin', value: string | null, theme: TailwindTheme): CssEdit[] | null {
  const group: SidedGroup = prop === 'border-radius' ? 'radius' : prop;
  const sides = prop === 'border-radius' ? (['tl', 'tr', 'br', 'bl'] as const) : (['t', 'r', 'b', 'l'] as const);
  if (value === null) return [{ kind: 'sided', group, values: Object.fromEntries(sides.map((side) => [side, null])) }];
  const parts = prop === 'border-radius' ? cornerValues(value) : boxValues(value);
  if (!parts) return null;
  const values = Object.fromEntries(Object.entries(parts).map(([side, part]) => [side, sidedValue(group, side as Side, part, theme)]));
  return [{ kind: 'sided', group, values }];
}

function gapEdits(value: string | null, theme: TailwindTheme): CssEdit[] | null {
  if (value === null) return [{ kind: 'sided', group: 'gap', values: { x: null, y: null } }];
  const [row, column = row] = splitValues(value);
  if (!row || !column) return null;
  return [{ kind: 'sided', group: 'gap', values: { y: spacingValue(row, theme, false), x: spacingValue(column, theme, false) } }];
}

export function cssEdits(prop: string, value: string | null, theme: TailwindTheme): CssEdit[] | null {
  const box = BOX_PROPS[prop];
  if (box) {
    const [group, side] = box;
    return [{ kind: 'sided', group, values: { [side]: value === null ? null : sidedValue(group, side, value, theme) } }];
  }
  if (prop === 'border-radius' || prop === 'padding' || prop === 'margin') return shorthandEdits(prop, value, theme);
  if (prop === 'gap') return gapEdits(value, theme);
  const group = SINGLE_PROPS[prop];
  if (!group) return null;
  return [{ kind: 'single', group, token: value === null ? null : singleToken(prop, value, theme) }];
}

export function cssClass(prop: string, value: string, theme: TailwindTheme): string | null {
  const group = SINGLE_PROPS[prop];
  return group ? singleToken(prop, value, theme) : null;
}
