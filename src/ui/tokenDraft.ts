import type { CompiledTokenEntry, TokenChange, TokenFile } from '../shared/contracts';
import type { DesignTokens } from './useDesignSystemState';

export interface PendingToken {
  value?: string;
  darkValue?: string | null;
}

export type PendingMap = Record<string, PendingToken>;
export type TokenField = 'value' | 'darkValue';

export interface RawToken {
  value: string;
  darkValue: string | null;
}

const ALIAS_RE = /^\{([A-Za-z0-9_.-]+)\}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function aliasPath(value: string): string | null {
  return ALIAS_RE.exec(value.trim())?.[1] ?? null;
}

function darkOf(node: Record<string, unknown>): string | null {
  const ext = isRecord(node.$extensions) ? node.$extensions['studio.modes'] : undefined;
  return isRecord(ext) && typeof ext.dark === 'string' ? ext.dark : null;
}

export function rawToken(file: TokenFile | null, entry: CompiledTokenEntry): RawToken {
  let node: unknown = file;
  for (const segment of entry.path.split('.')) node = isRecord(node) ? node[segment] : undefined;
  if (!isRecord(node) || typeof node.$value !== 'string') return { value: entry.value, darkValue: entry.darkValue };
  return { value: node.$value, darkValue: darkOf(node) };
}

export function shownRaw(base: RawToken, pending: PendingToken | undefined): RawToken {
  return {
    value: pending?.value ?? base.value,
    darkValue: pending?.darkValue !== undefined ? pending.darkValue : base.darkValue,
  };
}

export function withField(prev: PendingToken | undefined, field: TokenField, next: string | null, base: RawToken): PendingToken | undefined {
  const out: PendingToken = { ...prev };
  if (field === 'value') {
    if (next === null || next === base.value) delete out.value;
    else out.value = next;
  } else if (next === base.darkValue) {
    delete out.darkValue;
  } else {
    out.darkValue = next;
  }
  return out.value === undefined && out.darkValue === undefined ? undefined : out;
}

export function setPending(map: PendingMap, path: string, next: PendingToken | undefined): PendingMap {
  const out = { ...map };
  if (next) out[path] = next;
  else delete out[path];
  return out;
}

export function toChanges(map: PendingMap): TokenChange[] {
  return Object.entries(map).map(([path, p]) => ({ path, ...p }));
}

export function errorPaths(messages: string[], changes: TokenChange[]): Record<string, string> {
  const byLength = [...changes].sort((a, b) => b.path.length - a.path.length);
  const out: Record<string, string> = {};
  for (const message of messages) {
    const hit = byLength.find((change) => message.includes(change.path));
    if (hit && out[hit.path] === undefined) out[hit.path] = message;
  }
  return out;
}

function resolveCss(value: string, entries: CompiledTokenEntry[], dark: boolean): string {
  const target = aliasPath(value);
  if (!target) return value;
  const entry = entries.find((item) => item.path === target);
  if (!entry) return value;
  return dark && entry.darkValue ? entry.darkValue : entry.value;
}

function overlayEntry(entry: CompiledTokenEntry, pending: PendingToken, entries: CompiledTokenEntry[]): CompiledTokenEntry {
  const value = pending.value !== undefined ? resolveCss(pending.value, entries, false) : entry.value;
  const darkValue = pending.darkValue === undefined ? entry.darkValue : pending.darkValue === null ? null : resolveCss(pending.darkValue, entries, true);
  return { ...entry, value, darkValue };
}

export function overlayTokens(tokens: DesignTokens | null, map: PendingMap): DesignTokens | null {
  if (!tokens || Object.keys(map).length === 0) return tokens;
  const entries = tokens.entries.map((entry) => (map[entry.path] ? overlayEntry(entry, map[entry.path] as PendingToken, tokens.entries) : entry));
  return { ...tokens, entries };
}

interface TokenSection {
  id: string;
  label: string;
  entries: CompiledTokenEntry[];
}

const SECTIONS: { id: string; label: string; groups: string[] }[] = [
  { id: 'color', label: 'Color', groups: ['color'] },
  { id: 'type', label: 'Typography', groups: ['font', 'text'] },
  { id: 'space', label: 'Space', groups: ['space'] },
  { id: 'radius', label: 'Radius', groups: ['radius'] },
  { id: 'shadow', label: 'Shadow', groups: ['shadow'] },
  { id: 'breakpoint', label: 'Breakpoints', groups: ['breakpoint'] },
];

function matchesQuery(entry: CompiledTokenEntry, raw: RawToken, query: string): boolean {
  if (query === '') return true;
  const hay = `${entry.cssVar} ${entry.path} ${raw.value} ${raw.darkValue ?? ''}`.toLowerCase();
  return hay.includes(query);
}

export function tokenSections(entries: CompiledTokenEntry[], raw: (entry: CompiledTokenEntry) => RawToken, query: string): TokenSection[] {
  const q = query.trim().toLowerCase();
  const visible = entries.filter((entry) => matchesQuery(entry, raw(entry), q));
  const known = new Set(SECTIONS.flatMap((s) => s.groups));
  const sections = SECTIONS.map((s) => ({ id: s.id, label: s.label, entries: visible.filter((e) => s.groups.includes(e.path.split('.')[0] ?? '')) }));
  const other = { id: 'other', label: 'Other', entries: visible.filter((e) => !known.has(e.path.split('.')[0] ?? '')) };
  return [...sections, other].filter((s) => s.entries.length > 0);
}
