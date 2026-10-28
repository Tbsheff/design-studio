import type { TailwindTheme } from './theme.js';
import { lengthToPx } from './units.js';

export type Side = 't' | 'r' | 'b' | 'l' | 'x' | 'y' | 'tl' | 'tr' | 'br' | 'bl' | 'w' | 'h' | 'minw' | 'maxw' | 'minh' | 'maxh';
export type SidedGroup = 'padding' | 'margin' | 'gap' | 'radius' | 'dims' | 'inset';
export type SingleGroup =
  | 'color'
  | 'bg'
  | 'font-size'
  | 'font-weight'
  | 'font-family'
  | 'leading'
  | 'tracking'
  | 'text-align'
  | 'border-width'
  | 'border-style'
  | 'border-color'
  | 'display'
  | 'opacity'
  | 'flex-direction'
  | 'flex-wrap'
  | 'justify'
  | 'items'
  | 'self'
  | 'flex'
  | 'shadow'
  | 'filter'
  | 'font-style'
  | 'decoration'
  | 'case'
  | 'overflow'
  | 'text-shadow'
  | 'transform'
  | 'position'
  | 'justify-items';
export type Group = SidedGroup | SingleGroup;

export interface ParsedClass {
  raw: string;
  variants: string;
  important: boolean;
  negative: boolean;
  utility: string;
}

export interface SideValue {
  suffix: string;
  negative: boolean;
}

export type Classified =
  | { kind: 'sided'; group: SidedGroup; sides: Side[]; value: SideValue; size?: boolean }
  | { kind: 'single'; group: SingleGroup };

export const SIDED_GROUPS: ReadonlySet<string> = new Set<SidedGroup>(['padding', 'margin', 'gap', 'radius', 'dims', 'inset']);

const BOX_SIDES: Record<string, Side[]> = { '': ['t', 'r', 'b', 'l'], x: ['l', 'r'], y: ['t', 'b'], t: ['t'], r: ['r'], b: ['b'], l: ['l'], s: ['l'], e: ['r'] };
const CORNER_SIDES: Record<string, Side[]> = {
  '': ['tl', 'tr', 'br', 'bl'],
  t: ['tl', 'tr'],
  r: ['tr', 'br'],
  b: ['br', 'bl'],
  l: ['tl', 'bl'],
  s: ['tl', 'bl'],
  e: ['tr', 'br'],
  tl: ['tl'],
  tr: ['tr'],
  br: ['br'],
  bl: ['bl'],
  ss: ['tl'],
  se: ['tr'],
  ee: ['br'],
  es: ['bl'],
};

const KEYWORD_GROUPS: Record<string, SingleGroup> = {
  block: 'display',
  'inline-block': 'display',
  inline: 'display',
  flex: 'display',
  'inline-flex': 'display',
  grid: 'display',
  'inline-grid': 'display',
  hidden: 'display',
  contents: 'display',
  table: 'display',
  'flow-root': 'display',
  'list-item': 'display',
  italic: 'font-style',
  'not-italic': 'font-style',
  underline: 'decoration',
  overline: 'decoration',
  'line-through': 'decoration',
  'no-underline': 'decoration',
  uppercase: 'case',
  lowercase: 'case',
  capitalize: 'case',
  'normal-case': 'case',
  'flex-row': 'flex-direction',
  'flex-col': 'flex-direction',
  'flex-row-reverse': 'flex-direction',
  'flex-col-reverse': 'flex-direction',
  'flex-wrap': 'flex-wrap',
  'flex-nowrap': 'flex-wrap',
  'flex-wrap-reverse': 'flex-wrap',
  border: 'border-width',
  shadow: 'shadow',
  filter: 'filter',
  'filter-none': 'filter',
  transform: 'transform',
  'transform-none': 'transform',
  'transform-gpu': 'transform',
  'transform-cpu': 'transform',
  static: 'position',
  relative: 'position',
  absolute: 'position',
  fixed: 'position',
  sticky: 'position',
};

const TEXT_ALIGN = new Set(['left', 'center', 'right', 'justify', 'start', 'end']);
const TEXT_OTHER = new Set(['wrap', 'nowrap', 'balance', 'pretty', 'ellipsis', 'clip']);
const T_SHIRT = /^(xs|sm|base|md|lg|\d?xl|2xs|3xs)$/;
const WEIGHTS = new Set(['thin', 'extralight', 'light', 'normal', 'medium', 'semibold', 'bold', 'extrabold', 'black']);
const BORDER_STYLES = new Set(['solid', 'dashed', 'dotted', 'double', 'hidden', 'none']);
const JUSTIFY = new Set(['start', 'end', 'center', 'between', 'around', 'evenly', 'stretch', 'normal', 'baseline', 'center-safe', 'end-safe']);
const ITEMS = new Set(['start', 'end', 'center', 'baseline', 'stretch', 'baseline-last', 'center-safe', 'end-safe', 'normal']);
const SELF = new Set(['auto', 'start', 'end', 'center', 'stretch', 'baseline', 'baseline-last', 'center-safe', 'end-safe']);
const OVERFLOW = new Set(['auto', 'hidden', 'clip', 'visible', 'scroll']);
const SHADOW_NAMES = new Set(['none', 'inner', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl']);
const BG_NOT_COLOR = /^(fixed|local|scroll|clip-|origin-|repeat|no-repeat|cover|contain|auto$|center|top|bottom|left|right|none$|linear|radial|conic|gradient|blend-|size-|position-|\[url|\[image:|\[length:|\[size:|\[position:)/;
const ARBITRARY_PROPERTY: Record<string, SingleGroup> = {
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
  position: 'position',
  'justify-items': 'justify-items',
};

function splitVariants(raw: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (char === '[' || char === '(') depth += 1;
    else if (char === ']' || char === ')') depth = Math.max(0, depth - 1);
    else if (char === ':' && depth === 0) {
      parts.push(raw.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(raw.slice(start));
  return parts;
}

export function parseClass(raw: string): ParsedClass {
  const parts = splitVariants(raw);
  let utility = parts.pop() ?? '';
  const variants = parts.length > 0 ? `${parts.join(':')}:` : '';
  let important = false;
  if (utility.startsWith('!')) {
    important = true;
    utility = utility.slice(1);
  } else if (utility.endsWith('!')) {
    important = true;
    utility = utility.slice(0, -1);
  }
  const negative = /^-[a-z]/.test(utility);
  if (negative) utility = utility.slice(1);
  return { raw, variants, important, negative, utility };
}

function bracketed(suffix: string): string | null {
  if (suffix.startsWith('[') && suffix.endsWith(']')) return suffix.slice(1, -1);
  if (suffix.startsWith('(') && suffix.endsWith(')')) return suffix.slice(1, -1);
  return null;
}

function arbitraryIsLength(inner: string): boolean {
  if (/^(length|size|percentage):/.test(inner)) return true;
  if (/^(color|family-name|number):/.test(inner)) return false;
  return lengthToPx(inner.replace(/_/g, ' ')) !== null || /^calc\(/.test(inner);
}

function classifyText(suffix: string, theme: TailwindTheme | null): SingleGroup | null {
  if (TEXT_ALIGN.has(suffix)) return 'text-align';
  if (TEXT_OTHER.has(suffix)) return null;
  const base = suffix.includes('/') && !suffix.startsWith('[') ? suffix.slice(0, suffix.indexOf('/')) : suffix;
  if (theme?.text.has(base) || T_SHIRT.test(base)) return 'font-size';
  const inner = bracketed(base);
  if (inner !== null) return arbitraryIsLength(inner) ? 'font-size' : 'color';
  return 'color';
}

function classifyFont(suffix: string, theme: TailwindTheme | null): SingleGroup | null {
  if (theme?.fontWeight.has(suffix) || WEIGHTS.has(suffix)) return 'font-weight';
  if (theme?.font.has(suffix) || suffix === 'sans' || suffix === 'serif' || suffix === 'mono') return 'font-family';
  const inner = bracketed(suffix);
  if (inner === null) return null;
  if (/^number:/.test(inner) || /^\d+$/.test(inner)) return 'font-weight';
  return 'font-family';
}

function classifyBorder(suffix: string): SingleGroup | null {
  if (BORDER_STYLES.has(suffix)) return 'border-style';
  if (/^\d+$/.test(suffix)) return 'border-width';
  if (/^([xytrblse])(-|$)/.test(suffix) || /^(collapse|separate|spacing)/.test(suffix)) return null;
  const inner = bracketed(suffix);
  if (inner !== null) return arbitraryIsLength(inner) ? 'border-width' : 'border-color';
  return 'border-color';
}

function classifyShadow(suffix: string, theme: TailwindTheme | null): SingleGroup | null {
  if (SHADOW_NAMES.has(suffix) || theme?.shadow.has(suffix)) return 'shadow';
  const inner = bracketed(suffix);
  if (inner !== null) return /^color:/.test(inner) ? null : 'shadow';
  return null;
}

function classifyFlex(suffix: string): SingleGroup | null {
  if (/^(\d+|auto|initial|none)$/.test(suffix) || bracketed(suffix) !== null || /^\d+\/\d+$/.test(suffix)) return 'flex';
  return null;
}

function sided(group: SidedGroup, sides: Side[] | undefined, suffix: string, negative: boolean, size = false): Classified | null {
  if (!sides) return null;
  return { kind: 'sided', group, sides, value: { suffix, negative }, ...(size ? { size } : {}) };
}

const GAP_SIDES: Record<string, Side[]> = { x: ['x'], y: ['y'], '': ['x', 'y'] };
const DIM_SIDES: Record<string, Side[]> = { w: ['w'], h: ['h'], size: ['w', 'h'], 'min-w': ['minw'], 'max-w': ['maxw'], 'min-h': ['minh'], 'max-h': ['maxh'] };
const INSET_SIDES: Record<string, Side[]> = { inset: ['t', 'r', 'b', 'l'], 'inset-x': ['l', 'r'], 'inset-y': ['t', 'b'], top: ['t'], right: ['r'], bottom: ['b'], left: ['l'], start: ['l'], end: ['r'] };

type SidedRule = [RegExp, (match: RegExpExecArray, negative: boolean) => Classified | null];

const SIDED_RULES: SidedRule[] = [
  [/^([pm])([xytrblse]?)-(.+)$/, (m, negative) => sided(m[1] === 'p' ? 'padding' : 'margin', BOX_SIDES[m[2] ?? ''], m[3] ?? '', negative)],
  [/^gap(?:-([xy]))?-(.+)$/, (m) => sided('gap', GAP_SIDES[m[1] ?? ''], m[2] ?? '', false)],
  [/^rounded(?:-(tl|tr|br|bl|ss|se|ee|es|t|r|b|l|s|e)(?=-|$))?(?:-(.+))?$/, (m) => sided('radius', CORNER_SIDES[m[1] ?? ''], m[2] ?? '', false)],
  [/^(w|h|size|min-w|max-w|min-h|max-h)-(.+)$/, (m, negative) => sided('dims', DIM_SIDES[m[1] ?? ''], m[2] ?? '', negative, m[1] === 'size')],
  [/^(inset-x|inset-y|inset|top|right|bottom|left|start|end)-(.+)$/, (m, negative) => sided('inset', INSET_SIDES[m[1] ?? ''], m[2] ?? '', negative)],
];

function classifySided(utility: string, negative: boolean): Classified | null | undefined {
  for (const [pattern, build] of SIDED_RULES) {
    const match = pattern.exec(utility);
    if (match) return build(match, negative);
  }
  return undefined;
}

function single(group: SingleGroup | null): Classified | null {
  return group ? { kind: 'single', group } : null;
}

type PrefixRule = (suffix: string, theme: TailwindTheme | null) => SingleGroup | null;

const always = (group: SingleGroup): PrefixRule => () => group;
const fromSet = (set: ReadonlySet<string>, group: SingleGroup): PrefixRule => (suffix) => (set.has(suffix) ? group : null);

const PREFIX_RULES: Record<string, PrefixRule> = {
  bg: (suffix) => (BG_NOT_COLOR.test(suffix) ? null : 'bg'),
  text: classifyText,
  'text-shadow': always('text-shadow'),
  font: classifyFont,
  leading: always('leading'),
  tracking: always('tracking'),
  border: classifyBorder,
  opacity: always('opacity'),
  flex: classifyFlex,
  justify: fromSet(JUSTIFY, 'justify'),
  items: fromSet(ITEMS, 'items'),
  self: fromSet(SELF, 'self'),
  'justify-items': fromSet(ITEMS, 'justify-items'),
  shadow: classifyShadow,
  overflow: fromSet(OVERFLOW, 'overflow'),
  ...Object.fromEntries(['blur', 'brightness', 'contrast', 'grayscale', 'hue-rotate', 'invert', 'saturate', 'sepia', 'drop-shadow'].map((name) => [name, always('filter')])),
  ...Object.fromEntries(['translate', 'rotate', 'scale', 'skew'].map((name) => [name, always('transform')])),
};

function classifyPrefixed(utility: string, theme: TailwindTheme | null): Classified | null {
  const match = /^([a-z]+(?:-(?:rotate|shadow|items|self))?)-(.+)$/.exec(utility);
  if (!match) return null;
  const rule = PREFIX_RULES[match[1] ?? ''];
  return rule ? single(rule(match[2] ?? '', theme)) : null;
}

export function classify(parsed: ParsedClass, theme: TailwindTheme | null): Classified | null {
  const { utility, negative } = parsed;
  const property = /^\[([a-z-]+):(.+)\]$/.exec(utility);
  if (property) return single(ARBITRARY_PROPERTY[property[1] ?? ''] ?? null);
  const keyword = KEYWORD_GROUPS[utility];
  if (keyword) return single(keyword);
  if (/^(grayscale|invert|sepia|blur|drop-shadow)$/.test(utility)) return single('filter');
  const side = classifySided(utility, negative);
  if (side !== undefined) return side;
  return classifyPrefixed(utility, theme);
}

function sameValue(a: SideValue | undefined, b: SideValue | undefined): boolean {
  return a !== undefined && b !== undefined && a.suffix === b.suffix && a.negative === b.negative;
}

const PREFIX: Record<SidedGroup, Partial<Record<string, string>>> = {
  padding: { all: 'p', x: 'px', y: 'py', t: 'pt', r: 'pr', b: 'pb', l: 'pl' },
  margin: { all: 'm', x: 'mx', y: 'my', t: 'mt', r: 'mr', b: 'mb', l: 'ml' },
  gap: { all: 'gap', x: 'gap-x', y: 'gap-y' },
  radius: { all: 'rounded', t: 'rounded-t', r: 'rounded-r', b: 'rounded-b', l: 'rounded-l', tl: 'rounded-tl', tr: 'rounded-tr', br: 'rounded-br', bl: 'rounded-bl' },
  dims: { all: 'size', w: 'w', h: 'h', minw: 'min-w', maxw: 'max-w', minh: 'min-h', maxh: 'max-h' },
  inset: { all: 'inset', x: 'inset-x', y: 'inset-y', t: 'top', r: 'right', b: 'bottom', l: 'left' },
};

export function emitSided(group: SidedGroup, part: string, value: SideValue, variants: string): string {
  const prefix = PREFIX[group][part] ?? part;
  return `${variants}${value.negative ? '-' : ''}${prefix}${value.suffix === '' ? '' : `-${value.suffix}`}`;
}

type SideMap = Partial<Record<Side, SideValue>>;

function compactBox(map: SideMap): Array<[string, SideValue]> {
  const { t, r, b, l } = map;
  if (t && sameValue(t, r) && sameValue(t, b) && sameValue(t, l)) return [['all', t]];
  const out: Array<[string, SideValue]> = [];
  if (l && sameValue(l, r)) out.push(['x', l]);
  if (t && sameValue(t, b)) out.push(['y', t]);
  else {
    if (t) out.push(['t', t]);
    if (b) out.push(['b', b]);
  }
  if (!(l && sameValue(l, r))) {
    if (r) out.push(['r', r]);
    if (l) out.push(['l', l]);
  }
  return out;
}

function pairs(map: SideMap, first: [Side, Side, string], second: [Side, Side, string]): Array<[string, SideValue]> {
  const out: Array<[string, SideValue]> = [];
  for (const [a, b, name] of [first, second]) {
    const va = map[a];
    const vb = map[b];
    if (va && sameValue(va, vb)) out.push([name, va]);
    else {
      if (va) out.push([a, va]);
      if (vb) out.push([b, vb]);
    }
  }
  return out;
}

function compactCorners(map: SideMap): Array<[string, SideValue]> {
  const { tl, tr, br, bl } = map;
  if (tl && sameValue(tl, tr) && sameValue(tl, br) && sameValue(tl, bl)) return [['all', tl]];
  const rows = pairs(map, ['tl', 'tr', 't'], ['bl', 'br', 'b']);
  const cols = pairs(map, ['tl', 'bl', 'l'], ['tr', 'br', 'r']);
  return cols.length < rows.length ? cols : rows;
}

export function compactSides(group: SidedGroup, map: SideMap, useSize: boolean): Array<[string, SideValue]> {
  if (group === 'padding' || group === 'margin' || group === 'inset') return compactBox(map);
  if (group === 'radius') return compactCorners(map);
  if (group === 'gap') {
    if (map.x && sameValue(map.x, map.y)) return [['all', map.x]];
    return [...(map.x ? [['x', map.x] as [string, SideValue]] : []), ...(map.y ? [['y', map.y] as [string, SideValue]] : [])];
  }
  const limits = (['minw', 'maxw', 'minh', 'maxh'] as const).flatMap((side) => (map[side] ? [[side, map[side]] as [string, SideValue]] : []));
  if (useSize && map.w && sameValue(map.w, map.h)) return [['all', map.w], ...limits];
  return [...(map.w ? [['w', map.w] as [string, SideValue]] : []), ...(map.h ? [['h', map.h] as [string, SideValue]] : []), ...limits];
}
