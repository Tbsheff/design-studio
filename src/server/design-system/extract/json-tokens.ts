import { REQUIRED_TOKENS } from '../../../shared/contracts.js';
import { figmaToDtcg, isFigmaVariables } from './figma-variables.js';
import { isCanonicalName, matchFontName, matchName, matchScaleName } from './names.js';
import type { NameMatch } from './names.js';
import { TokensFileError, colorText, dimensionText, fontText, fontWeightText, isRecord, kindOf, letterSpacingText, lineHeightText, shadowText } from './token-values.js';
import type { JsonKind } from './token-values.js';
import type { Candidate, ExtraToken, Harvest } from './types.js';
import { candidate, extraToken } from './vars.js';
import { fontStack, genericFor, normalizeColor, normalizeLength, normalizeShadow } from './values.js';

type Part = 'fontFamily' | 'fontSize' | 'fontWeight' | 'lineHeight' | 'letterSpacing';

interface FlatToken {
  path: string[];
  type: string | null;
  value: unknown;
  dark: unknown;
  part?: Part;
}

interface Entry {
  name: string;
  path: string[];
  kind: JsonKind;
  part?: Part;
  value?: string;
  dark?: string;
  ref?: string;
  darkRef?: string;
  keys: string[];
  evidence: string;
  reason?: string;
}

type Produced = { kind: 'candidate'; item: Candidate; entry: Entry } | { kind: 'extra'; item: ExtraToken; entry: Entry };

const META_KEYS = new Set(['$themes', '$metadata', '$schema', '$description', '$extensions']);
const PARTS: Part[] = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'];
const ALIAS = /\{([^{}]+)\}/g;
const WHOLE_ALIAS = /^\{([^{}]+)\}$/;
const EXTRA_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_UNMAPPED = 200;

export function parseTokensJson(text: string): Record<string, unknown> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new TokensFileError('the tokens file is not valid JSON');
  }
  if (!isRecord(raw)) throw new TokensFileError('the tokens file must be a JSON object');
  return raw;
}

function modeDark(node: Record<string, unknown>): unknown {
  const extensions = node.$extensions;
  if (!isRecord(extensions)) return undefined;
  const studio = extensions['studio.modes'];
  if (isRecord(studio) && 'dark' in studio) return studio.dark;
  const modes = isRecord(extensions.mode) ? extensions.mode : isRecord(extensions.modes) ? extensions.modes : null;
  const key = modes ? Object.keys(modes).find((name) => /dark|night/i.test(name)) : undefined;
  return key && modes ? modes[key] : undefined;
}

function tokenOf(node: Record<string, unknown>): { value: unknown; type: string | null; dark: unknown } | null {
  if ('$value' in node) return { value: node.$value, type: typeof node.$type === 'string' ? node.$type : null, dark: modeDark(node) };
  const plainValue = typeof node.value === 'string' || typeof node.value === 'number' || Array.isArray(node.value) || (isRecord(node.value) && typeof node.type === 'string');
  if ('value' in node && (typeof node.type === 'string' || plainValue)) return { value: node.value, type: typeof node.type === 'string' ? node.type : null, dark: undefined };
  return null;
}

function pushToken(path: string[], type: string | null, value: unknown, dark: unknown, out: FlatToken[]): void {
  if (type?.toLowerCase() !== 'typography' || !isRecord(value)) {
    out.push({ path, type, value, dark });
    return;
  }
  for (const part of PARTS) {
    if (value[part] === undefined) continue;
    out.push({ path, type: part, value: value[part], dark: isRecord(dark) ? dark[part] : undefined, part });
  }
}

function flatten(node: unknown, path: string[], inherited: string | null, out: FlatToken[], depth = 0): void {
  if (!isRecord(node) || depth > 12) return;
  const token = tokenOf(node);
  if (token) {
    pushToken(path, token.type ?? inherited, token.value, token.dark, out);
    return;
  }
  const groupType = typeof node.$type === 'string' ? node.$type : typeof node.type === 'string' && !('value' in node) ? node.type : inherited;
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$') || META_KEYS.has(key)) continue;
    flatten(child, [...path, key], groupType, out, depth + 1);
  }
}

function isTokensStudio(file: Record<string, unknown>): boolean {
  if ('$themes' in file || '$metadata' in file) return true;
  let plain = 0;
  let dollar = 0;
  const visit = (node: unknown, depth: number) => {
    if (!isRecord(node) || depth > 6) return;
    if ('$value' in node) dollar += 1;
    else if ('value' in node && 'type' in node) plain += 1;
    else for (const child of Object.values(node)) visit(child, depth + 1);
  };
  visit(file, 0);
  return plain > dollar;
}

class Resolver {
  private readonly byPath = new Map<string, FlatToken>();

  constructor(tokens: FlatToken[], private readonly studio: boolean) {
    for (const token of tokens) {
      if (token.part) continue;
      for (const key of this.keysOf(token.path)) if (!this.byPath.has(key)) this.byPath.set(key, token);
    }
  }

  keysOf(path: string[]): string[] {
    const full = path.join('.');
    return this.studio && path.length > 1 ? [full, path.slice(1).join('.')] : [full];
  }

  target(ref: string): FlatToken | undefined {
    return this.byPath.get(ref);
  }

  resolve(value: unknown, dark: boolean, depth = 0): unknown {
    if (depth > 10) return value;
    if (Array.isArray(value)) return value.map((item) => this.resolve(item, dark, depth + 1));
    if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, this.resolve(item, dark, depth + 1)]));
    if (typeof value !== 'string' || !value.includes('{')) return value;
    const whole = WHOLE_ALIAS.exec(value.trim());
    if (whole) {
      const target = this.byPath.get(whole[1] ?? '');
      return target ? this.resolve(dark && target.dark !== undefined ? target.dark : target.value, dark, depth + 1) : value;
    }
    return value.replace(ALIAS, (match, ref: string) => {
      const target = this.byPath.get(ref);
      const resolved = target ? this.resolve(target.value, dark, depth + 1) : null;
      return typeof resolved === 'string' || typeof resolved === 'number' ? String(resolved) : match;
    });
  }
}

function aliasRef(value: unknown): string | undefined {
  return typeof value === 'string' ? WHOLE_ALIAS.exec(value.trim())?.[1] : undefined;
}

function textFor(kind: JsonKind, value: unknown): string | null {
  if (kind === 'color') return colorText(value);
  if (kind === 'font') return fontText(value);
  if (kind === 'shadow') return shadowText(value);
  if (kind === 'dimension' || kind === 'fontSize') return dimensionText(value);
  if (kind === 'fontWeight') return fontWeightText(value);
  if (kind === 'lineHeight') return lineHeightText(value)?.value ?? null;
  if (kind === 'letterSpacing') return letterSpacingText(value);
  return null;
}

function reasonFor(kind: JsonKind, type: string | null, value: unknown): string {
  if (kind === 'unknown') return type ? `type ${type} has no studio token` : 'no type';
  if (typeof value === 'string' && value.includes('{')) return 'alias to a missing token';
  return 'value not read';
}

interface Context {
  resolver: Resolver;
  studio: boolean;
  sets: Set<string>;
  darkSets: Set<string>;
  label: string;
}

function nameOf(path: string[], context: Context): string {
  const parts = context.studio && path.length > 1 && context.sets.has(path[0] ?? '') ? path.slice(1) : path;
  return parts.join('-');
}

function addToEntry(entries: Map<string, Entry>, token: FlatToken, context: Context): void {
  const kind = token.part ?? kindOf(token.type, context.resolver.resolve(token.value, false));
  const name = nameOf(token.path, context);
  const id = `${name}|${token.part ?? ''}`;
  const entry = entries.get(id) ?? { name, path: token.path, kind: (token.part === 'fontFamily' ? 'font' : kind) as JsonKind, keys: [], evidence: `${context.label}: ${token.path.join('.')}` };
  if (token.part) entry.part = token.part;
  if (!token.part) entry.keys.push(...context.resolver.keysOf(token.path));
  const lightText = textFor(entry.kind, context.resolver.resolve(token.value, false));
  const inDarkSet = context.studio && context.darkSets.has(token.path[0] ?? '');
  if (inDarkSet) {
    if (lightText !== null) Object.assign(entry, { dark: lightText, darkRef: aliasRef(token.value) });
  } else if (entry.value === undefined && lightText !== null) {
    Object.assign(entry, { value: lightText, ref: aliasRef(token.value) });
  }
  const darkText = token.dark === undefined ? null : textFor(entry.kind, context.resolver.resolve(token.dark, true));
  if (darkText !== null) Object.assign(entry, { dark: darkText, darkRef: aliasRef(token.dark) });
  if (entry.value === undefined && entry.dark === undefined) entry.reason = reasonFor(entry.kind, token.type, context.resolver.resolve(token.value, false));
  entries.set(id, entry);
}

function requiredMatch(entry: Entry): { match: NameMatch; cap?: 'medium' } | null {
  const last = entry.path[entry.path.length - 1] ?? '';
  if (entry.part === 'fontFamily') {
    const match = matchFontName(entry.name) ?? matchFontName(entry.path[0] ?? '') ?? matchFontName(last);
    return match ? { match, cap: 'medium' } : null;
  }
  if (entry.kind === 'fontSize') {
    const step = (REQUIRED_TOKENS.text as readonly string[]).includes(last) ? { token: `text.${last}`, confidence: 'high' as const } : null;
    const match = matchScaleName(entry.name, 'text') ?? step;
    return match ? { match, ...(entry.part ? { cap: 'medium' as const } : {}) } : null;
  }
  if (entry.part || !['color', 'font', 'shadow', 'dimension'].includes(entry.kind)) return null;
  const match = matchName(entry.name, entry.kind as 'color' | 'font' | 'shadow' | 'dimension');
  return match ? { match } : null;
}

function extraName(raw: string, strip: RegExp): string | null {
  const base = raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const stripped = base.replace(strip, '');
  const name = stripped || base;
  return EXTRA_NAME.test(name) && name.length <= 48 ? name : null;
}

interface ExtraSpec {
  group: string;
  type: ExtraToken['type'];
  strip: RegExp;
  normalize: (value: string) => string | null;
}

function lineHeightType(value: string): ExtraToken['type'] {
  return /^\d*\.?\d+$/.test(value) ? 'number' : 'dimension';
}

const EXTRA_SPECS: Partial<Record<JsonKind, ExtraSpec>> = {
  color: { group: 'color', type: 'color', strip: /^colou?rs?-/, normalize: normalizeColor },
  font: { group: 'font', type: 'fontFamily', strip: /^(font-?famil(y|ies)|fonts?|typeface)-/, normalize: (value) => fontStack(value, genericFor(value)) },
  shadow: { group: 'shadow', type: 'shadow', strip: /^(box-?shadows?|shadows?|elevation)-/, normalize: normalizeShadow },
  fontSize: { group: 'text', type: 'dimension', strip: /^(font-?sizes?|text|fs|size)-/, normalize: normalizeLength },
  fontWeight: { group: 'font-weight', type: 'fontWeight', strip: /^(font-?weights?|weights?)-/, normalize: (value) => value },
  lineHeight: { group: 'line-height', type: 'number', strip: /^(line-?heights?|leading)-/, normalize: (value) => value },
  letterSpacing: { group: 'letter-spacing', type: 'dimension', strip: /^(letter-?spacing|tracking)-/, normalize: (value) => (/^-?\d*\.?\d+(px|rem|em)$/.test(value) ? value : null) },
};

function extraFor(entry: Entry): ExtraToken | null {
  if (entry.value === undefined) return null;
  if (entry.kind === 'dimension') return extraToken(`--${entry.name.toLowerCase()}`, entry.value, undefined, entry.evidence);
  const spec = EXTRA_SPECS[entry.kind];
  const value = spec?.normalize(entry.value) ?? null;
  const name = spec ? extraName(entry.name, spec.strip) : null;
  if (!spec || !value || !name) return null;
  const dark = entry.dark === undefined ? null : spec.normalize(entry.dark);
  const type = entry.kind === 'lineHeight' ? lineHeightType(value) : spec.type;
  return { group: spec.group, name, type, value, ...(dark && dark !== value ? { dark } : {}), evidence: entry.evidence };
}

function produce(entry: Entry, seenFonts: Set<string>): Produced | string {
  const required = requiredMatch(entry);
  const found = required ? candidate(required.match, { ...(entry.value !== undefined ? { value: entry.value } : {}), ...(entry.dark !== undefined ? { dark: entry.dark } : {}) }, 'tokens-file', entry.evidence, required.cap) : null;
  if (found) return { kind: 'candidate', item: { ...found, ...(isCanonicalName(entry.name, found.token) ? { canonical: true } : {}) }, entry };
  if (entry.part === 'fontFamily' && entry.value !== undefined && seenFonts.has(entry.value)) return '';
  const extra = extraFor(entry);
  if (extra) {
    if (extra.type === 'fontFamily') seenFonts.add(entry.value ?? '');
    return { kind: 'extra', item: extra, entry };
  }
  if (entry.kind === 'color' && entry.value !== undefined) return 'color with transparency or an unknown format';
  return entry.reason ?? (entry.value === undefined ? 'value not read' : 'value is not valid for a studio token');
}

function studioPath(item: Produced): string {
  return item.kind === 'candidate' ? item.item.token : `${item.item.group}.${item.item.name}`;
}

function linkAliases(produced: Produced[], resolver: Resolver): void {
  const byKey = new Map<string, string>();
  for (const item of produced) for (const key of item.entry.keys) if (!byKey.has(key)) byKey.set(key, studioPath(item));
  const follow = (ref: string | undefined, self: string): string | undefined => {
    for (let depth = 0, current = ref; current !== undefined && depth < 10; depth += 1) {
      const found = byKey.get(current);
      if (found) return found === self ? undefined : found;
      current = aliasRef(resolver.target(current)?.value);
    }
    return undefined;
  };
  for (const item of produced) {
    const self = studioPath(item);
    const alias = follow(item.entry.ref, self);
    const darkAlias = follow(item.entry.darkRef, self);
    if (alias) item.item.alias = alias;
    if (darkAlias) item.item.darkAlias = darkAlias;
  }
}

function contextFor(file: Record<string, unknown>, tokens: FlatToken[], studio: boolean, label: string): Context {
  const sets = new Set(studio ? Object.keys(file).filter((key) => !key.startsWith('$')) : []);
  return { resolver: new Resolver(tokens, studio), studio, sets, darkSets: new Set([...sets].filter((name) => /dark/i.test(name))), label };
}

function sourceOf(raw: Record<string, unknown>): { file: Record<string, unknown>; skipped: string[]; figma: boolean } {
  if (!isFigmaVariables(raw)) return { file: raw, skipped: [], figma: false };
  const converted = figmaToDtcg(raw);
  return { file: converted.tree, skipped: converted.skipped, figma: true };
}

export function harvestJsonTokens(text: string, label: string): Harvest {
  const source = sourceOf(parseTokensJson(text));
  const studio = !source.figma && isTokensStudio(source.file);
  const flat: FlatToken[] = [];
  flatten(source.file, [], null, flat);
  if (flat.length === 0) throw new TokensFileError(source.figma ? 'the Figma variables file has no color, number or font variables' : 'the tokens file has no tokens (expected Figma variables, DTCG $value or Tokens Studio value/type)');
  const context = contextFor(source.file, flat, studio, label);
  const entries = new Map<string, Entry>();
  for (const token of flat) addToEntry(entries, token, context);
  const produced: Produced[] = [];
  const unmapped = [...source.skipped];
  const seenFonts = new Set<string>();
  for (const entry of entries.values()) {
    const result = produce(entry, seenFonts);
    if (typeof result !== 'string') produced.push(result);
    else if (result !== '') unmapped.push(`${entry.path.join('.')}${entry.part ? `.${entry.part}` : ''} (${result})`);
  }
  linkAliases(produced, context.resolver);
  const candidates = produced.flatMap((item) => (item.kind === 'candidate' ? [item.item] : []));
  const extras = produced.flatMap((item) => (item.kind === 'extra' ? [item.item] : []));
  return { source: 'tokens-file', label, candidates, extras, ...(unmapped.length > 0 ? { unmapped: unmapped.slice(0, MAX_UNMAPPED) } : {}) };
}
