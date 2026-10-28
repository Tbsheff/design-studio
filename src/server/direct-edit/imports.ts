import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import type * as t from '@babel/types';
import type * as TS from 'typescript';
import { compilerOptionsFor } from '../components/props-schema.js';
import { refuse } from './structure-ops.js';

export type ExportKind = 'named' | 'default';

export interface ImportNeed {
  name: string;
  kind: ExportKind;
  componentFile: string;
  targetFile: string;
  root: string;
  seen: SeenImport[];
  allowPaths: boolean;
}

export interface SeenImport {
  specifier: string;
  from: string;
}

export interface ImportPlan {
  splice: { start: number; end: number; text: string } | null;
  specifier: string;
  added: boolean;
}

type Ts = typeof TS;
type Resolver = (specifier: string) => boolean;

const SOURCE_EXT = /\.(tsx|ts|jsx|js|mts|mjs)$/i;

function realOrNull(file: string): string | null {
  try {
    return realpathSync(file);
  } catch {
    return null;
  }
}

export function importResolver(ts: Ts | null, need: Pick<ImportNeed, 'componentFile' | 'targetFile' | 'root'>): Resolver {
  const want = realOrNull(need.componentFile);
  const options = ts ? compilerOptionsFor(ts, need.targetFile, need.root) : null;
  return (specifier) => {
    if (!want) return false;
    if (ts && options) {
      const resolved = ts.resolveModuleName(specifier, need.targetFile, options, ts.sys).resolvedModule?.resolvedFileName;
      if (resolved && realOrNull(resolved) === want) return true;
    }
    if (!specifier.startsWith('.')) return false;
    const base = path.resolve(path.dirname(need.targetFile), specifier);
    const candidates = [base, ...['.tsx', '.ts', '.jsx', '.js'].map((ext) => base + ext), ...['index.tsx', 'index.ts', 'index.jsx'].map((name) => path.join(base, name))];
    return candidates.some((candidate) => SOURCE_EXT.test(candidate) && existsSync(candidate) && realOrNull(candidate) === want);
  };
}

function withoutExtension(file: string): string {
  const bare = file.replace(SOURCE_EXT, '');
  return bare.endsWith('/index') ? bare.slice(0, -'/index'.length) : bare;
}

function packageDir(file: string, root: string): string | null {
  for (let dir = path.dirname(file); dir.startsWith(root) && dir !== root; dir = path.dirname(dir)) {
    if (existsSync(path.join(dir, 'package.json'))) return dir;
  }
  return null;
}

function readJson(file: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(readFileSync(file, 'utf8'));
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function exportTarget(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  for (const key of ['import', 'default', 'types', 'require']) {
    const found = exportTarget(record[key]);
    if (found) return found;
  }
  return null;
}

function matchPattern(pattern: string, value: string): string | null {
  const star = pattern.indexOf('*');
  if (star < 0) return pattern === value ? '' : null;
  const prefix = pattern.slice(0, star);
  const suffix = pattern.slice(star + 1);
  if (!value.startsWith(prefix) || !value.endsWith(suffix) || value.length < prefix.length + suffix.length) return null;
  return value.slice(prefix.length, value.length - suffix.length);
}

function packageSpecifiers(need: ImportNeed): string[] {
  const dir = packageDir(need.componentFile, need.root);
  if (!dir || need.targetFile.startsWith(dir + path.sep)) return [];
  const pkg = readJson(path.join(dir, 'package.json'));
  const name = typeof pkg?.name === 'string' ? pkg.name : null;
  const exports = pkg?.exports;
  if (!name || !exports || typeof exports !== 'object') return [];
  const relative = `./${path.relative(dir, need.componentFile).split(path.sep).join('/')}`;
  const out: string[] = [];
  for (const [key, value] of Object.entries(exports as Record<string, unknown>)) {
    const target = exportTarget(value);
    const middle = target ? matchPattern(target, relative) : null;
    if (middle === null || !key.startsWith('.')) continue;
    out.push(`${name}${key.slice(1).replace('*', middle)}`);
  }
  return out;
}

function pathSpecifiers(ts: Ts | null, need: ImportNeed): string[] {
  if (!ts || !need.allowPaths) return [];
  const options = compilerOptionsFor(ts, need.targetFile, need.root);
  const base = (options as { pathsBasePath?: string }).pathsBasePath ?? options.baseUrl;
  if (!options.paths || !base) return [];
  const bare = need.componentFile.replace(SOURCE_EXT, '');
  const out: string[] = [];
  for (const [alias, targets] of Object.entries(options.paths)) {
    for (const target of targets) {
      const middle = matchPattern(path.resolve(base, target).replace(SOURCE_EXT, ''), bare);
      if (middle !== null) out.push(withoutExtension(alias.replace('*', middle)));
    }
  }
  return out;
}

function relativeSpecifier(need: ImportNeed): string {
  const rel = path.relative(path.dirname(need.targetFile), withoutExtension(need.componentFile)).split(path.sep).join('/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

function resolvedFrom(ts: Ts, specifier: string, from: string, root: string): string | null {
  const resolved = ts.resolveModuleName(specifier, from, compilerOptionsFor(ts, from, root), ts.sys).resolvedModule?.resolvedFileName;
  const real = resolved ? realOrNull(resolved) : null;
  return real && real.startsWith(root + path.sep) && !real.split(path.sep).includes('node_modules') ? real : null;
}

function learnedSpecifier(specifier: string, file: string, component: string): string | null {
  const spec = specifier.split('/');
  const bare = withoutExtension(file).split(path.sep);
  let shared = 0;
  while (shared < spec.length - 1 && shared < bare.length - 1 && spec[spec.length - 1 - shared] === bare[bare.length - 1 - shared]) shared += 1;
  if (shared === 0) return null;
  const dir = bare.slice(0, bare.length - shared).join(path.sep);
  const target = withoutExtension(component);
  if (!target.startsWith(dir + path.sep)) return null;
  return [...spec.slice(0, spec.length - shared), ...target.slice(dir.length + 1).split(path.sep)].join('/');
}

function seenSpecifiers(ts: Ts | null, need: ImportNeed, resolves: Resolver): string[] {
  const direct: string[] = [];
  const learned: string[] = [];
  const done = new Set<string>();
  for (const item of need.seen) {
    if (done.has(item.specifier)) continue;
    done.add(item.specifier);
    if (resolves(item.specifier)) direct.push(item.specifier);
    const file = ts ? resolvedFrom(ts, item.specifier, item.from, need.root) : null;
    const guess = file ? learnedSpecifier(item.specifier, file, need.componentFile) : null;
    if (guess) learned.push(guess);
  }
  return [...direct, ...packageSpecifiers(need), ...learned];
}

export function pickSpecifier(ts: Ts | null, need: ImportNeed, resolves: Resolver): string {
  const candidates = [...seenSpecifiers(ts, need, resolves), ...pathSpecifiers(ts, need)];
  for (const candidate of candidates) if (resolves(candidate)) return candidate;
  return relativeSpecifier(need);
}

function importedName(specifier: t.ImportDeclaration['specifiers'][number]): string | null {
  if (specifier.type === 'ImportDefaultSpecifier') return 'default';
  if (specifier.type === 'ImportNamespaceSpecifier') return null;
  return specifier.imported.type === 'Identifier' ? specifier.imported.name : specifier.imported.value;
}

function imports(ast: t.File): t.ImportDeclaration[] {
  return ast.program.body.filter((node): node is t.ImportDeclaration => node.type === 'ImportDeclaration');
}

function wanted(need: ImportNeed): string {
  return need.kind === 'default' ? 'default' : need.name;
}

function existingBinding(ast: t.File, need: ImportNeed, resolves: Resolver): ImportPlan | null {
  for (const decl of imports(ast)) {
    for (const specifier of decl.specifiers) {
      if (specifier.local.name !== need.name) continue;
      if (importedName(specifier) === wanted(need) && resolves(decl.source.value)) return { splice: null, specifier: decl.source.value, added: false };
      throw refuse(`${need.name} is already imported from "${decl.source.value}" in this file, so another ${need.name} cannot be added; ask the agent`);
    }
  }
  return null;
}

function declaredNames(ast: t.File): Set<string> {
  const names = new Set<string>();
  for (const statement of ast.program.body) {
    const node = (statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportDefaultDeclaration') && statement.declaration ? statement.declaration : statement;
    if ((node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') && node.id) names.add(node.id.name);
    if (node.type === 'VariableDeclaration') for (const decl of node.declarations) if (decl.id.type === 'Identifier') names.add(decl.id.name);
  }
  return names;
}

function extendSplice(decl: t.ImportDeclaration, need: ImportNeed): ImportPlan['splice'] {
  if (decl.importKind === 'type' || decl.specifiers.some((item) => item.type === 'ImportNamespaceSpecifier')) return null;
  const named = decl.specifiers.filter((item): item is t.ImportSpecifier => item.type === 'ImportSpecifier');
  const fallback = decl.specifiers.find((item) => item.type === 'ImportDefaultSpecifier');
  if (need.kind === 'default') return null;
  const last = named.at(-1);
  if (last?.end != null) return { start: last.end, end: last.end, text: `, ${need.name}` };
  if (fallback?.end != null) return { start: fallback.end, end: fallback.end, text: `, { ${need.name} }` };
  return null;
}

function directiveEnd(ast: t.File): number {
  const last = ast.program.directives.at(-1);
  return last?.end ?? -1;
}

function importLines(code: string, ast: t.File, lines: { binding: string; specifier: string }[]): NonNullable<ImportPlan['splice']> {
  const all = imports(ast);
  const last = all.at(-1);
  const sample = last ?? all[0];
  const quote = sample?.source.start != null ? (code[sample.source.start] === '"' ? '"' : "'") : "'";
  const semi = sample?.end != null ? code[sample.end - 1] === ';' : true;
  const text = lines.map((line) => `import ${line.binding} from ${quote}${line.specifier}${quote}${semi ? ';' : ''}`).join('\n');
  if (last?.end != null) return { start: last.end, end: last.end, text: `\n${text}` };
  const after = directiveEnd(ast);
  if (after >= 0) return { start: after, end: after, text: `\n\n${text}` };
  return { start: 0, end: 0, text: `${text}\n\n` };
}

function newLine(code: string, ast: t.File, need: ImportNeed, specifier: string): NonNullable<ImportPlan['splice']> {
  return importLines(code, ast, [{ binding: need.kind === 'default' ? need.name : `{ ${need.name} }`, specifier }]);
}

export function planImport(ts: Ts | null, code: string, ast: t.File, need: ImportNeed): ImportPlan {
  const resolves = importResolver(ts, need);
  const existing = existingBinding(ast, need, resolves);
  if (existing) return existing;
  if (declaredNames(ast).has(need.name)) throw refuse(`This file already has its own ${need.name}, so the component ${need.name} cannot be added here; ask the agent`);
  for (const decl of imports(ast)) {
    if (!resolves(decl.source.value)) continue;
    const splice = extendSplice(decl, need);
    if (splice) return { splice, specifier: decl.source.value, added: true };
  }
  const specifier = pickSpecifier(ts, need, resolves);
  return { splice: newLine(code, ast, need, specifier), specifier, added: true };
}

export interface ImportItem {
  name: string;
  specifier: string;
  added: boolean;
}

export interface ImportsPlan {
  splices: NonNullable<ImportPlan['splice']>[];
  items: ImportItem[];
}

interface ImportGroups {
  extend: Map<t.ImportDeclaration, string[]>;
  fresh: Map<string, { named: string[]; fallback: string | null }>;
  items: ImportItem[];
}

function addTo<K>(map: Map<K, string[]>, key: K, name: string): void {
  map.set(key, [...(map.get(key) ?? []), name]);
}

function groupNeed(ts: Ts | null, ast: t.File, need: ImportNeed, groups: ImportGroups, declared: Set<string>): void {
  const resolves = importResolver(ts, need);
  const existing = existingBinding(ast, need, resolves);
  if (existing) {
    groups.items.push({ name: need.name, specifier: existing.specifier, added: false });
    return;
  }
  if (declared.has(need.name)) throw refuse(`This file already has its own ${need.name}, so the component ${need.name} cannot be added here; rename it in the snippet or edit the file`);
  const decl = imports(ast).find((item) => resolves(item.source.value) && extendSplice(item, need) !== null);
  if (decl) {
    addTo(groups.extend, decl, need.name);
    groups.items.push({ name: need.name, specifier: decl.source.value, added: true });
    return;
  }
  const specifier = pickSpecifier(ts, need, resolves);
  const entry = groups.fresh.get(specifier) ?? { named: [], fallback: null };
  if (need.kind === 'default' && entry.fallback && entry.fallback !== need.name) throw refuse(`${entry.fallback} and ${need.name} are both the default export of "${specifier}"; use one name`);
  if (need.kind === 'default') entry.fallback = need.name;
  else entry.named.push(need.name);
  groups.fresh.set(specifier, entry);
  groups.items.push({ name: need.name, specifier, added: true });
}

function extendText(decl: t.ImportDeclaration, names: string[]): NonNullable<ImportPlan['splice']> {
  const last = decl.specifiers.filter((item): item is t.ImportSpecifier => item.type === 'ImportSpecifier').at(-1);
  if (last?.end != null) return { start: last.end, end: last.end, text: `, ${names.join(', ')}` };
  const fallback = decl.specifiers.find((item) => item.type === 'ImportDefaultSpecifier');
  const at = fallback?.end ?? 0;
  return { start: at, end: at, text: `, { ${names.join(', ')} }` };
}

function bindingOf(entry: { named: string[]; fallback: string | null }): string {
  const named = entry.named.length > 0 ? `{ ${entry.named.join(', ')} }` : '';
  return [entry.fallback, named].filter(Boolean).join(', ');
}

export function planImports(ts: Ts | null, code: string, ast: t.File, needs: ImportNeed[]): ImportsPlan {
  const groups: ImportGroups = { extend: new Map(), fresh: new Map(), items: [] };
  const declared = declaredNames(ast);
  for (const need of needs) groupNeed(ts, ast, need, groups, declared);
  const splices = [...groups.extend].map(([decl, names]) => extendText(decl, names));
  const lines = [...groups.fresh].map(([specifier, entry]) => ({ binding: bindingOf(entry), specifier }));
  if (lines.length > 0) splices.push(importLines(code, ast, lines));
  return { splices, items: groups.items };
}
