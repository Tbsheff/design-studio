import { differenceEuclidean, formatHex, modeHsl, modeLab, modeLch, modeOklab, modeOklch, modeP3, modeRgb, parse, useMode, type Color } from 'culori/fn';
import { TOKEN_GROUP_FOR_PROPERTY, type CompiledTokenEntry, type DirectStyleProperty, type TokenGroupName, type TokenMatch } from './contracts';

useMode(modeRgb);
useMode(modeHsl);
useMode(modeLab);
useMode(modeLch);
useMode(modeOklab);
useMode(modeOklch);
useMode(modeP3);

export type TokenMode = 'light' | 'dark';

export const COLOR_EXACT_DELTA = 0.002;
export const COLOR_SNAP_DELTA = 0.03;
const DIMENSION_EXACT_PX = 0.5;
const DIMENSION_SNAP_PX = 2;
const DIMENSION_SNAP_RATIO = 0.08;
const DEFAULT_ROOT_PX = 16;

const deltaOk = differenceEuclidean('oklab');
const VAR_RE = /^var\(\s*(--[a-zA-Z0-9_-]+)\s*(?:,[^)]*)?\)$/;
const LENGTH_RE = /^(-?\d*\.?\d+)(px|rem|em)?$/i;
const UNSET_VALUES = new Set(['', 'auto', 'normal', 'none', 'transparent', 'initial', 'inherit', 'unset', 'currentcolor']);

export function cssVarFor(group: TokenGroupName | string, name: string): string {
  return group === 'color' ? `--${name}` : `--${group}-${name}`;
}

export function varName(value: string): string | null {
  return VAR_RE.exec(value.trim())?.[1] ?? null;
}

function groupOf(entry: CompiledTokenEntry): string {
  return entry.path.split('.')[0] ?? '';
}

function entriesInGroup(entries: CompiledTokenEntry[], group: TokenGroupName): CompiledTokenEntry[] {
  return entries.filter((entry) => groupOf(entry) === group);
}

export function tokensForProperty(prop: DirectStyleProperty, entries: CompiledTokenEntry[]): CompiledTokenEntry[] {
  const group = TOKEN_GROUP_FOR_PROPERTY[prop];
  return group ? entriesInGroup(entries, group) : [];
}

export function modeValue(entry: CompiledTokenEntry, mode: TokenMode): string {
  return mode === 'dark' && entry.darkValue ? entry.darkValue : entry.value;
}

function toMatch(entry: CompiledTokenEntry, value: string, distance: number, exact: boolean): TokenMatch {
  return { cssVar: entry.cssVar, path: entry.path, value, distance, exact };
}

function varMatch(value: string, pool: CompiledTokenEntry[], mode: TokenMode): TokenMatch[] | null {
  const name = varName(value);
  if (!name) return null;
  const entry = pool.find((item) => item.cssVar === name);
  return entry ? [toMatch(entry, modeValue(entry, mode), 0, true)] : [];
}

function parseColor(value: string): Color | null {
  try {
    const color = parse(value.trim());
    return color && (color.alpha ?? 1) > 0 ? color : null;
  } catch {
    return null;
  }
}

function sortMatches(matches: TokenMatch[]): TokenMatch[] {
  return matches.sort((a, b) => a.distance - b.distance || a.cssVar.localeCompare(b.cssVar));
}

export function matchColor(value: string, entries: CompiledTokenEntry[], mode: TokenMode = 'light'): TokenMatch[] {
  const pool = entries.filter((entry) => entry.type === 'color');
  const direct = varMatch(value, pool, mode);
  if (direct) return direct;
  const target = parseColor(value);
  if (!target) return [];
  const out: TokenMatch[] = [];
  for (const entry of pool) {
    const tokenValue = modeValue(entry, mode);
    const color = parseColor(tokenValue);
    if (!color) continue;
    const distance = deltaOk(target, color);
    if (!Number.isFinite(distance)) continue;
    out.push(toMatch(entry, tokenValue, distance, distance < COLOR_EXACT_DELTA));
  }
  return sortMatches(out);
}

export function lengthToPx(value: string, rootPx = DEFAULT_ROOT_PX): number | null {
  const match = LENGTH_RE.exec(value.trim());
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = (match[2] ?? '').toLowerCase();
  if (unit === 'rem' || unit === 'em') return amount * rootPx;
  if (unit === 'px' || amount === 0) return amount;
  return null;
}

export function matchDimension(value: string, entries: CompiledTokenEntry[], group: TokenGroupName, rootPx = DEFAULT_ROOT_PX): TokenMatch[] {
  const pool = entriesInGroup(entries, group).filter((entry) => entry.type === 'dimension');
  const direct = varMatch(value, pool, 'light');
  if (direct) return direct;
  const target = lengthToPx(value, rootPx);
  if (target === null) return [];
  const out: TokenMatch[] = [];
  for (const entry of pool) {
    const px = lengthToPx(entry.value, rootPx);
    if (px === null) continue;
    const distance = Math.abs(px - target);
    out.push(toMatch(entry, entry.value, distance, distance <= DIMENSION_EXACT_PX));
  }
  return sortMatches(out);
}

function firstFamily(value: string): string {
  const first = value.split(',')[0] ?? '';
  return first.trim().replace(/^['"]|['"]$/g, '').trim().toLowerCase();
}

export function matchFontFamily(value: string, entries: CompiledTokenEntry[]): TokenMatch[] {
  const pool = entriesInGroup(entries, 'font');
  const direct = varMatch(value, pool, 'light');
  if (direct) return direct;
  const family = firstFamily(value);
  if (!family) return [];
  const out = pool.map((entry) => {
    const same = firstFamily(entry.value) === family;
    return toMatch(entry, entry.value, same ? 0 : 1, same);
  });
  return sortMatches(out);
}

export function isUnsetValue(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return UNSET_VALUES.has(trimmed) || /^rgba\(\s*0[\s,]+0[\s,]+0\s*[,/]\s*0\s*\)$/.test(trimmed) || lengthToPx(trimmed) === 0;
}

export function matchForProperty(prop: DirectStyleProperty, value: string, entries: CompiledTokenEntry[], mode: TokenMode = 'light', rootPx = DEFAULT_ROOT_PX): TokenMatch[] {
  const group = TOKEN_GROUP_FOR_PROPERTY[prop];
  if (!group) return [];
  if (group === 'color') return matchColor(value, entries, mode);
  if (group === 'font') return matchFontFamily(value, entries);
  return matchDimension(value, entries, group, rootPx);
}

function snapLimit(group: TokenGroupName, match: TokenMatch, rootPx = DEFAULT_ROOT_PX): number {
  if (group === 'color') return COLOR_SNAP_DELTA;
  if (group === 'font') return 0;
  const px = lengthToPx(match.value, rootPx) ?? 0;
  return Math.max(DIMENSION_SNAP_PX, Math.abs(px) * DIMENSION_SNAP_RATIO);
}

export function isSnappable(group: TokenGroupName, match: TokenMatch | undefined, rootPx = DEFAULT_ROOT_PX): match is TokenMatch {
  if (!match) return false;
  return match.exact || match.distance <= snapLimit(group, match, rootPx);
}

export type TokenFieldState =
  | { kind: 'none' }
  | { kind: 'unset' }
  | { kind: 'token'; match: TokenMatch }
  | { kind: 'raw'; nearest: TokenMatch | null; snap: TokenMatch | null };

export function tokenFieldState(prop: DirectStyleProperty, value: string, entries: CompiledTokenEntry[], mode: TokenMode = 'light'): TokenFieldState {
  const group = TOKEN_GROUP_FOR_PROPERTY[prop];
  if (!group || entriesInGroup(entries, group).length === 0) return { kind: 'none' };
  const matches = matchForProperty(prop, value, entries, mode);
  const best = matches[0];
  if (best?.exact) return { kind: 'token', match: best };
  if (isUnsetValue(value)) return { kind: 'unset' };
  const snap = isSnappable(group, best) && group !== 'font' ? best : null;
  return { kind: 'raw', nearest: best ?? null, snap };
}

export function resolveTokenValue(value: string, entries: CompiledTokenEntry[], mode: TokenMode = 'light'): string {
  const name = varName(value);
  if (!name) return value;
  const entry = entries.find((item) => item.cssVar === name);
  return entry ? modeValue(entry, mode) : value;
}

export function colorHex(value: string): string | null {
  const color = parseColor(value);
  return color && (color.alpha ?? 1) >= 1 ? (formatHex(color) ?? null) : null;
}
