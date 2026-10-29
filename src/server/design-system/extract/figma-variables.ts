type FigmaType = 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';

interface Alias {
  alias: string;
}

interface FigmaVar {
  key: string;
  collection: string;
  name: string;
  type: FigmaType;
  scopes: string[];
  light: unknown;
  dark: unknown;
}

export interface FigmaConversion {
  tree: Record<string, unknown>;
  skipped: string[];
  collections: number;
}

const LIGHT_MODE = /light|day|default|base/i;
const DARK_MODE = /dark|night|dim/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function list(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return isRecord(value) ? Object.values(value) : [];
}

function restMeta(file: Record<string, unknown>): Record<string, unknown> | null {
  const meta = isRecord(file.meta) ? file.meta : file;
  return isRecord(meta.variables) && isRecord(meta.variableCollections) ? meta : null;
}

function pluginCollections(file: Record<string, unknown>): Record<string, unknown>[] | null {
  if (!Array.isArray(file.collections)) return null;
  const collections = file.collections.filter(isRecord);
  return collections.length > 0 && collections.every((item) => Array.isArray(item.modes)) ? collections : null;
}

export function isFigmaVariables(file: Record<string, unknown>): boolean {
  return restMeta(file) !== null || pluginCollections(file) !== null;
}

function pickModes<T>(modes: T[], nameOf: (mode: T) => string, defaultMode?: T): { light: T | undefined; dark: T | undefined } {
  const dark = modes.find((mode) => DARK_MODE.test(nameOf(mode)));
  const light = modes.find((mode) => mode !== dark && LIGHT_MODE.test(nameOf(mode))) ?? (defaultMode !== dark ? defaultMode : undefined) ?? modes.find((mode) => mode !== dark);
  return { light, dark: dark === light ? undefined : dark };
}

function restValue(value: unknown): unknown {
  if (isRecord(value) && value.type === 'VARIABLE_ALIAS' && typeof value.id === 'string') return { alias: value.id } satisfies Alias;
  return value;
}

function restVars(meta: Record<string, unknown>): FigmaVar[] {
  const collections = new Map<string, Record<string, unknown>>();
  for (const item of list(meta.variableCollections)) if (isRecord(item) && typeof item.id === 'string') collections.set(item.id, item);
  const out: FigmaVar[] = [];
  for (const item of list(meta.variables)) {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.name !== 'string' || !isRecord(item.valuesByMode)) continue;
    const collection = collections.get(String(item.variableCollectionId));
    const modes = list(collection?.modes).filter(isRecord);
    const fallback = modes.find((mode) => mode.modeId === collection?.defaultModeId) ?? { modeId: Object.keys(item.valuesByMode)[0], name: '' };
    const picked = pickModes(modes.length > 0 ? modes : [fallback], (mode) => String(mode.name ?? ''), fallback);
    const valueIn = (mode: Record<string, unknown> | undefined) => (mode ? restValue((item.valuesByMode as Record<string, unknown>)[String(mode.modeId)]) : undefined);
    const scopes = Array.isArray(item.scopes) ? item.scopes.map(String) : [];
    out.push({ key: item.id, collection: String(collection?.name ?? ''), name: item.name, type: String(item.resolvedType) as FigmaType, scopes, light: valueIn(picked.light), dark: valueIn(picked.dark) });
  }
  return out;
}

const PLUGIN_TYPES: Record<string, FigmaType> = { color: 'COLOR', number: 'FLOAT', float: 'FLOAT', string: 'STRING', boolean: 'BOOLEAN' };

function pluginValue(variable: Record<string, unknown>, collection: string): unknown {
  const value = variable.value;
  if (variable.isAlias !== true && !(isRecord(value) && value.type === 'VARIABLE_ALIAS')) return value;
  if (isRecord(value) && typeof value.name === 'string') return { alias: `${String(value.collection ?? collection)}/${value.name}` } satisfies Alias;
  return typeof value === 'string' ? { alias: `${collection}/${value}` } : value;
}

function pluginVars(collections: Record<string, unknown>[]): FigmaVar[] {
  const out: FigmaVar[] = [];
  for (const collection of collections) {
    const name = String(collection.name ?? '');
    const modes = (collection.modes as unknown[]).filter(isRecord);
    const picked = pickModes(modes, (mode) => String(mode.name ?? ''), modes[0]);
    const byName = (mode: Record<string, unknown> | undefined) => new Map(list(mode?.variables).filter(isRecord).map((variable) => [String(variable.name), variable]));
    const light = byName(picked.light);
    const dark = byName(picked.dark);
    for (const [varName, variable] of light) {
      const darkVar = dark.get(varName);
      const scopes = Array.isArray(variable.scopes) ? variable.scopes.map(String) : [];
      out.push({ key: `${name}/${varName}`, collection: name, name: varName, type: PLUGIN_TYPES[String(variable.type).toLowerCase()] ?? 'STRING', scopes, light: pluginValue(variable, name), dark: darkVar ? pluginValue(darkVar, name) : undefined });
    }
  }
  return out;
}

function segment(raw: string): string {
  return raw.trim().replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

function assignPaths(vars: FigmaVar[]): Map<string, string[]> {
  const paths = new Map<string, string[]>();
  const taken = new Set<string>();
  for (const variable of vars) {
    let path = variable.name.split('/').map(segment);
    if (taken.has(path.join('.')) && variable.collection) path = [segment(variable.collection), ...path];
    if (taken.has(path.join('.'))) continue;
    taken.add(path.join('.'));
    paths.set(variable.key, path);
  }
  return paths;
}

function channel(value: unknown): string {
  const number = Math.round(Math.min(1, Math.max(0, Number(value))) * 255);
  return (Number.isFinite(number) ? number : 0).toString(16).padStart(2, '0');
}

function colorOf(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (!isRecord(value) || value.r === undefined) return null;
  const alpha = value.a === undefined || Number(value.a) >= 0.999 ? '' : channel(value.a);
  return `#${channel(value.r)}${channel(value.g)}${channel(value.b)}${alpha}`;
}

const SCOPE_TYPES: Array<[string, string]> = [
  ['FONT_WEIGHT', 'fontWeight'],
  ['LINE_HEIGHT', 'lineHeight'],
  ['LETTER_SPACING', 'letterSpacing'],
  ['FONT_SIZE', 'fontSize'],
  ['CORNER_RADIUS', 'borderRadius'],
  ['GAP', 'spacing'],
  ['OPACITY', 'opacity'],
  ['FONT_FAMILY', 'fontFamily'],
  ['FONT_STYLE', 'fontStyle'],
];

function floatType(variable: FigmaVar): string {
  for (const [scope, type] of SCOPE_TYPES) if (variable.scopes.includes(scope) && variable.scopes.length <= 2) return type;
  const name = variable.name.toLowerCase();
  if (/weight/.test(name)) return 'fontWeight';
  if (/line-?height|leading/.test(name)) return 'lineHeight';
  if (/letter-?spacing|tracking/.test(name)) return 'letterSpacing';
  if (/opacity|alpha|z-?index|duration/.test(name)) return 'number';
  return 'dimension';
}

function dtcgType(variable: FigmaVar): string | null {
  if (variable.type === 'COLOR') return 'color';
  if (variable.type === 'FLOAT') return floatType(variable);
  if (variable.type !== 'STRING') return null;
  if (variable.scopes.includes('FONT_FAMILY') || /font|family|typeface/i.test(variable.name)) return 'fontFamily';
  return null;
}

function valueText(value: unknown, type: string, paths: Map<string, string[]>): unknown {
  if (isRecord(value) && typeof value.alias === 'string') {
    const target = paths.get(value.alias);
    return target ? `{${target.join('.')}}` : undefined;
  }
  if (type === 'color') return colorOf(value) ?? undefined;
  if (type === 'lineHeight' && typeof value === 'number') return value <= 4 ? value : `${value}px`;
  return typeof value === 'number' || typeof value === 'string' ? value : undefined;
}

function place(tree: Record<string, unknown>, path: string[], node: Record<string, unknown>): void {
  let at = tree;
  for (const part of path.slice(0, -1)) {
    const next = at[part];
    if (isRecord(next) && !('$value' in next)) at = next;
    else at = at[part] = {};
  }
  at[path[path.length - 1] ?? 'x'] = node;
}

export function figmaToDtcg(file: Record<string, unknown>): FigmaConversion {
  const meta = restMeta(file);
  const collections = meta ? null : pluginCollections(file);
  const vars = meta ? restVars(meta) : pluginVars(collections ?? []);
  const paths = assignPaths(vars);
  const tree: Record<string, unknown> = {};
  const skipped: string[] = [];
  for (const variable of vars) {
    const path = paths.get(variable.key);
    const type = dtcgType(variable);
    if (!path) continue;
    if (!type) {
      skipped.push(`${variable.name} (${variable.type.toLowerCase()})`);
      continue;
    }
    const light = valueText(variable.light, type, paths);
    const dark = valueText(variable.dark, type, paths);
    if (light === undefined && dark === undefined) {
      skipped.push(`${variable.name} (no value)`);
      continue;
    }
    const modes = dark !== undefined ? { $extensions: { 'studio.modes': { dark } } } : {};
    place(tree, path, { $type: type, $value: light ?? dark, ...modes });
  }
  const collectionCount = meta ? list(meta.variableCollections).length : (collections?.length ?? 0);
  return { tree, skipped, collections: collectionCount };
}
