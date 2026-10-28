import type { SourceLoc, Version } from './contracts.js';

export const STYLE_KINDS = ['color', 'font-size', 'radius', 'spacing'] as const;
export type StyleKind = (typeof STYLE_KINDS)[number];

export const KIND_PROPERTIES = {
  color: ['color', 'background-color', 'border-color'],
  'font-size': ['font-size'],
  radius: ['border-radius'],
  spacing: ['padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'gap'],
} as const satisfies Record<StyleKind, readonly string[]>;

export type SearchProperty = (typeof KIND_PROPERTIES)[StyleKind][number];
export const SEARCH_PROPERTIES: readonly SearchProperty[] = STYLE_KINDS.flatMap((kind) => KIND_PROPERTIES[kind]);
export const INHERITED_PROPERTIES: ReadonlySet<string> = new Set(['color', 'font-size']);

export const STYLE_SCAN_MAX_HITS = 2000;
export const STYLE_REPLACE_MAX = 500;
export const STYLE_SELECT_MAX = 50;
export const STYLE_TOKEN_MAX = 200;

export interface StyleQuery {
  property?: SearchProperty | StyleKind;
  value?: string;
  className?: string;
  within?: string[];
}

export interface StyleHit {
  selector: string;
  tag: string;
  source: SourceLoc | null;
  property: SearchProperty;
  value: string;
  cls: string | null;
  inline: string | null;
  repeats: number;
}

export interface StyleScanResult {
  hits: StyleHit[];
  elements: number;
  truncated: boolean;
  value: string | null;
}

export type ValueState = 'token' | 'palette' | 'raw' | 'mixed';

export interface StyleValueRow {
  kind: StyleKind;
  value: string;
  count: number;
  properties: SearchProperty[];
  tokens: string[];
  state: ValueState;
  classes: string[];
  hex?: string;
}

export interface StyleMatch {
  source: SourceLoc;
  selector: string;
  tag?: string;
  property: SearchProperty;
  repeats?: number;
}

export interface StyleReplaceRequest {
  matches: StyleMatch[];
  token: string;
}

export interface StyleReplaceBody {
  replaceStyle: StyleReplaceRequest;
}

export interface StyleSkip {
  reason: string;
  count: number;
  sources: string[];
}

export interface StyleReplaceResult {
  version: Version | null;
  files: string[];
  replaced: number;
  sites: number;
  value: string;
  wrote: 'classes' | 'inline' | 'mixed' | 'none';
  classes: string[];
  skipped: StyleSkip[];
}

const T_SHIRT = /^(?:\d?xs|sm|base|md|lg|\d?xl)$/;
const TEXT_OTHER = /^(?:left|center|right|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip)$/;
const BG_OTHER = /^(?:fixed|local|scroll|clip|origin|repeat|no-repeat|cover|contain|auto|center|top|bottom|left|right|none|linear|gradient|blend|radial|conic|size|position)/;
const BORDER_OTHER = /^(?:\d+|\[\d[^\]]*\]|solid|dashed|dotted|double|hidden|none|collapse|separate|spacing.*)$/;
const SPACING_CLASS: Record<string, RegExp> = {
  'padding-top': /^p[ty]?-/,
  'padding-bottom': /^p[by]?-/,
  'padding-left': /^p[lxs]?-/,
  'padding-right': /^p[rxe]?-/,
  'margin-top': /^-?m[ty]?-/,
  'margin-bottom': /^-?m[by]?-/,
  'margin-left': /^-?m[lxs]?-/,
  'margin-right': /^-?m[rxe]?-/,
  gap: /^gap-/,
};

export function isStyleKind(value: string): value is StyleKind {
  return (STYLE_KINDS as readonly string[]).includes(value);
}

export function kindOf(property: SearchProperty): StyleKind {
  return STYLE_KINDS.find((kind) => (KIND_PROPERTIES[kind] as readonly string[]).includes(property)) ?? 'spacing';
}

export function queryProperties(property: StyleQuery['property']): SearchProperty[] {
  if (!property) return [...SEARCH_PROPERTIES];
  return isStyleKind(property) ? [...KIND_PROPERTIES[property]] : [property];
}

function utility(raw: string): string | null {
  if (raw.includes(':')) return null;
  return raw.replace(/^!|!$/g, '');
}

function isFontSizeSuffix(suffix: string): boolean {
  if (T_SHIRT.test(suffix)) return true;
  return /^\[(?:length:)?[\d.]/.test(suffix);
}

function textClassProperty(suffix: string): 'color' | 'font-size' | null {
  if (TEXT_OTHER.test(suffix)) return null;
  return isFontSizeSuffix(suffix) ? 'font-size' : 'color';
}

function setsProperty(cls: string, property: SearchProperty): boolean {
  if (property === 'color' || property === 'font-size') return cls.startsWith('text-') && textClassProperty(cls.slice(5)) === property;
  if (property === 'background-color') return cls.startsWith('bg-') && !BG_OTHER.test(cls.slice(3));
  if (property === 'border-color') {
    const match = /^border-(?:[xytrblse]-)?(.+)$/.exec(cls);
    return match !== null && !BORDER_OTHER.test(match[1] ?? '');
  }
  if (property === 'border-radius') return /^rounded(?:-|$)/.test(cls);
  return SPACING_CLASS[property]?.test(cls) ?? false;
}

export function classForProperty(classes: readonly string[], property: SearchProperty): string | null {
  for (let index = classes.length - 1; index >= 0; index -= 1) {
    const cls = utility(classes[index] ?? '');
    if (cls && setsProperty(cls, property)) return classes[index] ?? null;
  }
  return null;
}

const PALETTE_CLASS = /-(?:(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|[1-9]00|950)|black|white)(?:\/[\d.]+)?!?$/;

export function isPaletteClass(cls: string): boolean {
  return PALETTE_CLASS.test(cls);
}

export function isRawClass(cls: string): boolean {
  return cls.includes('[') && !cls.includes('var(');
}

export function isUnsetComputed(property: SearchProperty, value: string): boolean {
  const flat = value.trim().toLowerCase();
  if (flat === '' || flat === 'normal' || flat === 'auto' || flat === 'none') return true;
  if (property === 'color' || property === 'font-size') return false;
  if (flat === 'transparent' || /^rgba\(\s*0,\s*0,\s*0,\s*0\s*\)$/.test(flat)) return true;
  return /^0(?:px)?(?:\s+0(?:px)?)*$/.test(flat);
}

export function sameValue(a: string, b: string): boolean {
  return a.trim().toLowerCase().replace(/\s+/g, ' ') === b.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function locKey(source: SourceLoc): string {
  return `${source.file}:${source.line}:${source.col}`;
}

export type TokenLookup = (property: SearchProperty, value: string) => string | null;

const VAR_IN = /var\(\s*(--[A-Za-z0-9_-]+)/;

export function tokenOfHit(hit: StyleHit, lookup: TokenLookup | null): string | null {
  if (hit.cls) return isRawClass(hit.cls) ? null : hit.cls;
  const inlineVar = hit.inline ? VAR_IN.exec(hit.inline)?.[1] : undefined;
  if (inlineVar) return inlineVar;
  if (hit.inline) return null;
  return lookup ? lookup(hit.property, hit.value) : null;
}

interface RowDraft {
  kind: StyleKind;
  value: string;
  selectors: Set<string>;
  properties: Set<SearchProperty>;
  tokens: Set<string>;
  classes: Set<string>;
  raw: number;
  palette: number;
  total: number;
}

function stateOf(draft: RowDraft): ValueState {
  if (draft.raw === 0 && draft.palette === 0) return 'token';
  if (draft.palette === draft.total) return 'palette';
  return draft.raw === draft.total ? 'raw' : 'mixed';
}

export function summarizeHits(hits: readonly StyleHit[], lookup: TokenLookup | null = null): StyleValueRow[] {
  const rows = new Map<string, RowDraft>();
  for (const hit of hits) {
    const kind = kindOf(hit.property);
    const key = `${kind}|${hit.value}`;
    let draft = rows.get(key);
    if (!draft) {
      draft = { kind, value: hit.value, selectors: new Set(), properties: new Set(), tokens: new Set(), classes: new Set(), raw: 0, palette: 0, total: 0 };
      rows.set(key, draft);
    }
    draft.selectors.add(hit.selector);
    draft.properties.add(hit.property);
    if (hit.cls) draft.classes.add(hit.cls);
    const token = tokenOfHit(hit, lookup);
    if (token) draft.tokens.add(token);
    else draft.raw += 1;
    if (token && hit.cls === token && isPaletteClass(token)) draft.palette += 1;
    draft.total += 1;
  }
  const order = (kind: StyleKind) => STYLE_KINDS.indexOf(kind);
  return [...rows.values()]
    .map((draft) => ({ kind: draft.kind, value: draft.value, count: draft.selectors.size, properties: [...draft.properties], tokens: [...draft.tokens], state: stateOf(draft), classes: [...draft.classes] }))
    .sort((a, b) => order(a.kind) - order(b.kind) || b.count - a.count || a.value.localeCompare(b.value));
}

export function hitsForRow(hits: readonly StyleHit[], row: Pick<StyleValueRow, 'kind' | 'value'>): StyleHit[] {
  return hits.filter((hit) => kindOf(hit.property) === row.kind && hit.value === row.value);
}

export function matchesOf(hits: readonly StyleHit[]): StyleMatch[] {
  return hits.flatMap((hit) => (hit.source ? [{ source: hit.source, selector: hit.selector, tag: hit.tag, property: hit.property, repeats: hit.repeats }] : []));
}

export function unlocatedCount(hits: readonly StyleHit[]): number {
  return new Set(hits.filter((hit) => !hit.source).map((hit) => hit.selector)).size;
}

export function isStyleReplaceBody(body: unknown): body is StyleReplaceBody {
  return typeof body === 'object' && body !== null && 'replaceStyle' in body;
}

export function replaceSummary(result: Pick<StyleReplaceResult, 'replaced' | 'skipped'>, token: string): string {
  const done = result.replaced === 0 ? 'Nothing replaced' : `Replaced ${result.replaced === 1 ? '1 value' : `${result.replaced} values`} with ${token}`;
  if (result.skipped.length === 0) return done;
  const skips = result.skipped.map((skip) => `${skip.count} ${skip.reason}`).join('; ');
  return `${done}. Skipped ${skips}`;
}
