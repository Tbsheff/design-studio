import { matchName } from './names.js';
import type { ValueKind } from './names.js';
import type { Candidate, Harvest } from './types.js';
import { candidate, harvestCssVars } from './vars.js';
import { customProperties, parseCss } from './css.js';

interface FlatToken {
  path: string[];
  type: string | null;
  value: unknown;
  dark: unknown;
}

export class TokensFileError extends Error {}

const META_KEYS = new Set(['$themes', '$metadata', '$schema', '$description', '$extensions']);
const ALIAS = /\{([^{}]+)\}/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function tokenOf(node: Record<string, unknown>): { value: unknown; type: string | null; dark: unknown } | null {
  if ('$value' in node) {
    const modes = isRecord(node.$extensions) && isRecord(node.$extensions['studio.modes']) ? node.$extensions['studio.modes'] : null;
    return { value: node.$value, type: typeof node.$type === 'string' ? node.$type : null, dark: modes?.dark };
  }
  const plainValue = typeof node.value === 'string' || typeof node.value === 'number' || Array.isArray(node.value);
  if ('value' in node && (typeof node.type === 'string' || plainValue)) return { value: node.value, type: typeof node.type === 'string' ? node.type : null, dark: undefined };
  return null;
}

function flatten(node: unknown, path: string[], inherited: string | null, out: FlatToken[], depth = 0): void {
  if (!isRecord(node) || depth > 12) return;
  const token = tokenOf(node);
  if (token) {
    out.push({ path, type: token.type ?? inherited, value: token.value, dark: token.dark });
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

function shadowText(value: unknown): string | null {
  const one = (item: unknown): string | null => {
    if (typeof item === 'string') return item;
    if (!isRecord(item)) return null;
    const part = (key: string, alt: string) => dimensionText(item[key] ?? item[alt]) ?? '0px';
    const color = typeof item.color === 'string' ? item.color : colorText(item.color);
    if (!color) return null;
    const inset = item.inset === true || item.type === 'innerShadow' ? 'inset ' : '';
    return `${inset}${part('offsetX', 'x')} ${part('offsetY', 'y')} ${part('blur', 'blur')} ${part('spread', 'spread')} ${color}`;
  };
  if (Array.isArray(value)) {
    const parts = value.map(one);
    return parts.every((item): item is string => item !== null) ? parts.join(', ') : null;
  }
  return one(value);
}

function dimensionText(value: unknown): string | null {
  if (typeof value === 'number') return `${value}px`;
  if (typeof value === 'string') return /^-?\d*\.?\d+$/.test(value.trim()) ? `${value.trim()}px` : value;
  if (isRecord(value) && typeof value.value === 'number' && typeof value.unit === 'string') return `${value.value}${value.unit}`;
  return null;
}

function colorText(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (!isRecord(value)) return null;
  if (typeof value.hex === 'string') return value.hex;
  const components = Array.isArray(value.components) ? value.components.map(Number) : null;
  if (!components || components.length !== 3 || components.some((item) => !Number.isFinite(item))) return null;
  const space = String(value.colorSpace ?? 'srgb');
  if (space === 'oklch') return `oklch(${components[0]} ${components[1]} ${components[2]})`;
  if (space === 'hsl') return `hsl(${components[0]} ${components[1]}% ${components[2]}%)`;
  if (space === 'srgb') return `color(srgb ${components.join(' ')})`;
  return null;
}

function kindOf(type: string | null, value: unknown): ValueKind {
  const lower = (type ?? '').toLowerCase();
  if (lower === 'color') return 'color';
  if (lower === 'fontfamily' || lower === 'fontfamilies') return 'font';
  if (lower === 'shadow' || lower === 'boxshadow') return 'shadow';
  if (['dimension', 'borderradius', 'spacing', 'sizing', 'fontsizes', 'fontsize', 'number'].includes(lower)) return 'dimension';
  if (lower !== '') return 'unknown';
  if (typeof value === 'string' && /^(#|rgb|hsl|oklch)/i.test(value.trim())) return 'color';
  if (typeof value === 'string' && /^-?\d*\.?\d+(px|rem|em)$/.test(value.trim())) return 'dimension';
  return 'unknown';
}

function textOf(kind: ValueKind, value: unknown): string | null {
  if (kind === 'color') return colorText(value);
  if (kind === 'font') return Array.isArray(value) ? value.filter((item) => typeof item === 'string').join(', ') : typeof value === 'string' ? value : null;
  if (kind === 'shadow') return shadowText(value);
  if (kind === 'dimension') return dimensionText(value);
  return null;
}

function resolver(tokens: FlatToken[], studio: boolean): (value: unknown) => unknown {
  const byPath = new Map<string, FlatToken>();
  for (const token of tokens) {
    byPath.set(token.path.join('.'), token);
    if (studio && token.path.length > 1 && !byPath.has(token.path.slice(1).join('.'))) byPath.set(token.path.slice(1).join('.'), token);
  }
  const resolve = (value: unknown, depth: number): unknown => {
    if (typeof value !== 'string' || depth > 10) return value;
    const whole = /^\{([^{}]+)\}$/.exec(value.trim());
    if (whole) {
      const target = byPath.get(whole[1] ?? '');
      return target ? resolve(target.value, depth + 1) : value;
    }
    if (!value.includes('{')) return value;
    return value.replace(ALIAS, (match, ref: string) => {
      const target = byPath.get(ref);
      const resolved = target ? resolve(target.value, depth + 1) : null;
      return typeof resolved === 'string' || typeof resolved === 'number' ? String(resolved) : match;
    });
  };
  return (value) => resolve(value, 0);
}

function nameOf(path: string[], studio: boolean, sets: Set<string>): string {
  const parts = studio && path.length > 1 && sets.has(path[0] ?? '') ? path.slice(1) : path;
  return parts.join('-');
}

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

function harvestCssFile(text: string, label: string): Harvest {
  const found = harvestCssVars(customProperties(parseCss(text)), 'tokens-file', label);
  if (found.candidates.length === 0 && found.extras.length === 0) throw new TokensFileError('the CSS file has no custom properties in :root, @theme or a dark block');
  return { source: 'tokens-file', label, candidates: found.candidates, extras: found.extras };
}

export function isCssTokensFile(name: string, text: string): boolean {
  return /\.css$/i.test(name) || (!/^\s*[{[]/.test(text) && /--[\w-]+\s*:/.test(text));
}

export function harvestTokensFile(text: string, label: string): Harvest {
  return isCssTokensFile(label, text) ? harvestCssFile(text, label) : harvestJsonTokens(text, label);
}

function harvestJsonTokens(text: string, label: string): Harvest {
  const file = parseTokensJson(text);
  const studio = isTokensStudio(file);
  const flat: FlatToken[] = [];
  flatten(file, [], null, flat);
  if (flat.length === 0) throw new TokensFileError('the tokens file has no tokens (expected DTCG $value or Tokens Studio value/type)');
  const resolve = resolver(flat, studio);
  const sets = new Set(studio ? Object.keys(file).filter((key) => !key.startsWith('$')) : []);
  const darkSets = new Set([...sets].filter((name) => /dark/i.test(name)));
  const byName = new Map<string, { value?: string; dark?: string; kind: ValueKind; evidence: string }>();
  for (const token of flat) {
    const value = resolve(token.value);
    const kind = kindOf(token.type, value);
    const content = textOf(kind, value);
    if (content === null) continue;
    const name = nameOf(token.path, studio, sets);
    const entry = byName.get(name) ?? { kind, evidence: `${label}: ${token.path.join('.')}` };
    const inDarkSet = studio && darkSets.has(token.path[0] ?? '');
    if (inDarkSet) entry.dark = content;
    else entry.value ??= content;
    const darkValue = token.dark === undefined ? null : textOf(kind, resolve(token.dark));
    if (darkValue) entry.dark = darkValue;
    byName.set(name, entry);
  }
  const candidates: Candidate[] = [];
  for (const [name, entry] of byName) {
    const match = matchName(name, entry.kind);
    if (!match) continue;
    const found = candidate(match, entry, 'tokens-file', entry.evidence);
    if (found) candidates.push(found);
  }
  return { source: 'tokens-file', label, candidates };
}
