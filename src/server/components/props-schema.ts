import { existsSync } from 'node:fs';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { parse, type ParserPlugin } from '@babel/parser';
import type * as t from '@babel/types';
import type * as TS from 'typescript';
import type { ComponentSchema, CvaInfo, PropSpec, PropValue, VariantGroup } from '../../shared/props.js';
import { compilerOptionsFor, createProgram, MAX_OPTIONS, nodeModulesFile, ProgramBudgetError, typedProps, type ProgramScope, type TypedProps } from './props-program.js';

export { compilerOptionsFor } from './props-program.js';

type Ts = typeof TS;

const SOURCE_EXT = /\.(tsx|ts|jsx|js|mts|mjs)$/i;
const MAX_HOPS = 3;
const CACHE_MAX = 300;

interface Declared {
  name: string;
  line: number;
  start: number;
  end: number;
  defaults: Record<string, PropValue>;
}

interface ParsedModule {
  ast: t.File;
  code: string;
}

interface CacheEntry {
  stamp: string;
  schema: ComponentSchema | null;
}

const cache = new Map<string, CacheEntry>();
let tsModule: Promise<Ts | null> | null = null;

export function loadTypeScript(): Promise<Ts | null> {
  tsModule ??= import('typescript')
    .then((mod) => ((mod as { default?: Ts }).default ?? (mod as unknown as Ts)) as Ts)
    .catch(() => null);
  return tsModule;
}

function isNode(value: unknown): value is t.Node {
  return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';
}

export function parseModuleFile(code: string, file: string): t.File | null {
  const plugins: ParserPlugin[] = /\.(tsx|ts|mts)$/i.test(file) ? ['jsx', 'typescript'] : ['jsx'];
  if (/\.(ts|mts)$/i.test(file)) plugins.shift();
  try {
    return parse(code, { sourceType: 'module', plugins, errorRecovery: true });
  } catch {
    return null;
  }
}

function walk(node: t.Node, visit: (node: t.Node) => void): void {
  visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc' || key.endsWith('Comments') || key === 'extra') continue;
    if (Array.isArray(value)) {
      for (const item of value) if (isNode(item)) walk(item, visit);
    } else if (isNode(value)) walk(value, visit);
  }
}

function literalValue(node: t.Node | null | undefined): PropValue | undefined {
  if (!node) return undefined;
  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'NumericLiteral') return node.value;
  if (node.type === 'BooleanLiteral') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) return node.quasis[0]?.value.cooked ?? undefined;
  return undefined;
}

function keyName(key: t.Node): string | null {
  if (key.type === 'Identifier') return key.name;
  if (key.type === 'StringLiteral') return key.value;
  if (key.type === 'NumericLiteral') return String(key.value);
  if (key.type === 'BooleanLiteral') return String(key.value);
  return null;
}

function functionOf(node: t.Node | null | undefined): t.Function | null {
  if (!node) return null;
  if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') return node;
  if (node.type === 'CallExpression') return functionOf(node.arguments[0] as t.Node | undefined);
  if (node.type === 'TSAsExpression' || node.type === 'TSSatisfiesExpression' || node.type === 'ParenthesizedExpression') return functionOf(node.expression);
  return null;
}

function paramDefaults(fn: t.Function | null): Record<string, PropValue> {
  const defaults: Record<string, PropValue> = {};
  const first = fn?.params[0];
  if (!first || first.type !== 'ObjectPattern') return defaults;
  for (const property of first.properties) {
    if (property.type !== 'ObjectProperty' || property.value.type !== 'AssignmentPattern') continue;
    const name = keyName(property.key);
    const value = literalValue(property.value.right);
    if (name && value !== undefined) defaults[name] = value;
  }
  return defaults;
}

function declaredOf(statement: t.Statement): { name: string; node: t.Node; init: t.Node | null }[] {
  const target = (statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportDefaultDeclaration') && statement.declaration ? statement.declaration : statement;
  if (target.type === 'FunctionDeclaration' && target.id) return [{ name: target.id.name, node: target, init: target }];
  if (target.type !== 'VariableDeclaration') return [];
  return target.declarations.flatMap((decl) => (decl.id.type === 'Identifier' && decl.init ? [{ name: decl.id.name, node: decl, init: decl.init }] : []));
}

export function declaredComponents(ast: t.File): Declared[] {
  const out: Declared[] = [];
  for (const statement of ast.program.body) {
    for (const { name, node, init } of declaredOf(statement)) {
      if (!/^[A-Z]/.test(name)) continue;
      const fn = functionOf(init);
      if (!fn) continue;
      out.push({ name, line: node.loc?.start.line ?? 1, start: node.start ?? 0, end: node.end ?? 0, defaults: paramDefaults(fn) });
    }
  }
  return out;
}

export function defaultExportName(ast: t.File): string | null {
  for (const statement of ast.program.body) {
    if (statement.type !== 'ExportDefaultDeclaration') continue;
    const declaration = statement.declaration;
    if ((declaration.type === 'FunctionDeclaration' || declaration.type === 'ClassDeclaration') && declaration.id) return declaration.id.name;
    if (declaration.type === 'Identifier') return declaration.name;
  }
  return null;
}

export function exportedLocalName(ast: t.File, exported: string): string | null {
  for (const statement of ast.program.body) {
    if (statement.type !== 'ExportNamedDeclaration' || statement.source) continue;
    for (const specifier of statement.specifiers) {
      if (specifier.type !== 'ExportSpecifier') continue;
      const name = specifier.exported.type === 'Identifier' ? specifier.exported.name : specifier.exported.value;
      if (name === exported) return specifier.local.name;
    }
  }
  return null;
}

export function reExportSource(ast: t.File, exported: string): { source: string; imported: string } | null {
  for (const statement of ast.program.body) {
    if (statement.type === 'ExportAllDeclaration') continue;
    if (statement.type !== 'ExportNamedDeclaration' || !statement.source) continue;
    for (const specifier of statement.specifiers) {
      if (specifier.type !== 'ExportSpecifier') continue;
      const name = specifier.exported.type === 'Identifier' ? specifier.exported.name : specifier.exported.value;
      if (name === exported) return { source: statement.source.value, imported: specifier.local.name };
    }
  }
  return null;
}

function isCvaCall(node: t.Node, cvaNames: Set<string>): node is t.CallExpression {
  return node.type === 'CallExpression' && node.callee.type === 'Identifier' && cvaNames.has(node.callee.name);
}

function cvaImportNames(ast: t.File): Set<string> {
  const names = new Set<string>();
  for (const statement of ast.program.body) {
    if (statement.type !== 'ImportDeclaration' || statement.source.value !== 'class-variance-authority') continue;
    for (const specifier of statement.specifiers) {
      if (specifier.type === 'ImportSpecifier' && (specifier.imported.type === 'Identifier' ? specifier.imported.name : specifier.imported.value) === 'cva') names.add(specifier.local.name);
    }
  }
  return names;
}

function objectProperty(object: t.ObjectExpression, name: string): t.Node | null {
  for (const property of object.properties) {
    if (property.type === 'ObjectProperty' && !property.computed && keyName(property.key) === name) return property.value;
  }
  return null;
}

function classText(node: t.Node): { text: string; editable: boolean } | null {
  if (node.type === 'StringLiteral') return { text: node.value, editable: !(node.extra?.raw as string | undefined)?.includes('\\') };
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) return { text: node.quasis[0]?.value.cooked ?? '', editable: false };
  if (node.type === 'ArrayExpression') {
    const parts = node.elements.map((element) => (element?.type === 'StringLiteral' ? element.value : null));
    return parts.every((part) => part !== null) ? { text: parts.join(' '), editable: false } : null;
  }
  return null;
}

function variantGroups(config: t.ObjectExpression): VariantGroup[] {
  const variants = objectProperty(config, 'variants');
  const defaults = objectProperty(config, 'defaultVariants');
  if (!variants || variants.type !== 'ObjectExpression') return [];
  const groups: VariantGroup[] = [];
  for (const property of variants.properties) {
    if (property.type !== 'ObjectProperty' || property.computed || property.value.type !== 'ObjectExpression') continue;
    const prop = keyName(property.key);
    if (!prop) continue;
    const options = property.value.properties.flatMap((option) => {
      if (option.type !== 'ObjectProperty' || option.computed) return [];
      const value = keyName(option.key);
      const classes = classText(option.value);
      return value !== null && classes ? [{ value, classes: classes.text, line: option.loc?.start.line ?? 1, editable: classes.editable }] : [];
    });
    const fallback = defaults?.type === 'ObjectExpression' ? literalValue(objectProperty(defaults, prop)) : undefined;
    groups.push({ prop, options: options.slice(0, MAX_OPTIONS), default: fallback === undefined ? null : String(fallback) });
  }
  return groups;
}

export interface CvaCall {
  info: CvaInfo;
  node: t.CallExpression;
}

export function cvaCalls(ast: t.File): CvaCall[] {
  const names = cvaImportNames(ast);
  if (names.size === 0) return [];
  const out: CvaCall[] = [];
  walk(ast.program, (node) => {
    if (node.type !== 'VariableDeclarator' || node.id.type !== 'Identifier' || !node.init || !isCvaCall(node.init, names)) return;
    const [base, config] = node.init.arguments;
    const baseText = base ? classText(base)?.text ?? '' : '';
    const variants = config?.type === 'ObjectExpression' ? variantGroups(config) : [];
    out.push({ info: { name: node.id.name, line: node.loc?.start.line ?? 1, base: baseText, variants }, node: node.init });
  });
  return out;
}

function linkedCva(code: string, declared: Declared, calls: CvaCall[]): CvaInfo | null {
  const body = code.slice(declared.start, declared.end);
  const used = calls.find((call) => new RegExp(`\\b${call.info.name}\\s*\\(`).test(body));
  if (used) return used.info;
  const named = calls.find((call) => call.info.name.toLowerCase().startsWith(declared.name.toLowerCase()));
  return named?.info ?? null;
}

function variantSpecs(cva: CvaInfo | null, defaults: Record<string, PropValue>): PropSpec[] {
  if (!cva) return [];
  return cva.variants.map((group) => {
    const values = group.options.map((option) => option.value);
    const isBoolean = values.length > 0 && values.every((value) => value === 'true' || value === 'false');
    const fallback = defaults[group.prop] ?? group.default ?? undefined;
    if (isBoolean) return { name: group.prop, control: 'boolean', optional: true, from: 'variant', ...(fallback !== undefined ? { default: fallback === true || fallback === 'true' } : {}) };
    return { name: group.prop, control: 'select', options: values, optional: true, from: 'variant', ...(fallback !== undefined ? { default: String(fallback) } : {}) };
  });
}

export async function readModule(file: string): Promise<ParsedModule | null> {
  const code = await readFile(file, 'utf8').catch(() => null);
  if (code === null || code.length > 512 * 1024) return null;
  const ast = parseModuleFile(code, file);
  return ast ? { ast, code } : null;
}

export function resolveImport(ts: Ts | null, specifier: string, fromFile: string, root: string): string | null {
  if (ts) {
    const options = compilerOptionsFor(ts, fromFile, root);
    const resolved = ts.resolveModuleName(specifier, fromFile, options, ts.sys).resolvedModule;
    if (!resolved || resolved.isExternalLibraryImport || nodeModulesFile(resolved.resolvedFileName)) return null;
    return resolved.resolvedFileName;
  }
  if (!specifier.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), specifier);
  for (const candidate of [base, ...['.tsx', '.ts', '.jsx', '.js'].map((ext) => base + ext), ...['index.tsx', 'index.ts', 'index.jsx'].map((name) => path.join(base, name))]) {
    if (SOURCE_EXT.test(candidate) && existsSync(candidate)) return candidate;
  }
  return null;
}

export async function insideRoot(root: string, file: string): Promise<string | null> {
  const real = await realpath(file).catch(() => null);
  if (!real || !real.startsWith(root + path.sep) || nodeModulesFile(path.relative(root, real))) return null;
  return real;
}

export interface ComponentRef {
  file: string;
  name: string;
}

export async function followExport(ts: Ts | null, root: string, ref: ComponentRef): Promise<ComponentRef | null> {
  let current: ComponentRef = ref;
  for (let hop = 0; hop <= MAX_HOPS; hop += 1) {
    const parsed = await readModule(current.file);
    if (!parsed) return null;
    const local = current.name === 'default' ? defaultExportName(parsed.ast) : (exportedLocalName(parsed.ast, current.name) ?? current.name);
    if (local && declaredComponents(parsed.ast).some((item) => item.name === local)) return { file: current.file, name: local };
    const next = reExportSource(parsed.ast, current.name);
    if (!next) return null;
    const resolved = resolveImport(ts, next.source, current.file, root);
    const inside = resolved ? await insideRoot(root, resolved) : null;
    if (!inside) return null;
    current = { file: inside, name: next.imported };
  }
  return null;
}

async function stampOf(file: string): Promise<string> {
  const info = await stat(file).catch(() => null);
  return info ? `${info.mtimeMs}:${info.size}` : 'missing';
}

function remember(key: string, entry: CacheEntry): void {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
  cache.set(key, entry);
}

function moduleSpecifiers(ast: t.File): string[] {
  const out = new Set<string>();
  for (const statement of ast.program.body) {
    if ((statement.type === 'ImportDeclaration' || statement.type === 'ExportAllDeclaration' || statement.type === 'ExportNamedDeclaration') && statement.source) out.add(statement.source.value);
  }
  return [...out];
}

type ProgramFor = (file: string, parsed: ParsedModule) => ProgramScope | Error;

function programs(ts: Ts, root: string): ProgramFor {
  const built = new Map<string, ProgramScope | Error>();
  return (file, parsed) => {
    let scope = built.get(file);
    if (!scope) {
      try {
        scope = createProgram(ts, file, moduleSpecifiers(parsed.ast), root);
      } catch (error) {
        scope = error instanceof Error ? error : new Error(String(error));
      }
      built.set(file, scope);
    }
    return scope;
  };
}

function typedNote(typed: TypedProps): string | null {
  const parts = [typed.inherited > 0 ? `${typed.inherited} inherited attributes are not listed.` : '', typed.partial ? 'Only the first props are listed.' : ''].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}

function failureNote(error: unknown): string {
  if (error instanceof ProgramBudgetError) return `The props type is too large to read here (${error.message}); only cva variants are shown.`;
  console.error(`props schema: ${error instanceof Error ? error.message : String(error)}`);
  return 'The props type could not be read; only cva variants are shown.';
}

interface TypedRead {
  typed: TypedProps | null;
  note: string | null;
  keep: boolean;
}

function failed(error: unknown): TypedRead {
  return { typed: null, note: failureNote(error), keep: !(error instanceof ProgramBudgetError && error.timedOut) };
}

function readTyped(program: ProgramFor | null, parsed: ParsedModule, ref: ComponentRef, defaults: Record<string, PropValue>): TypedRead {
  if (!program) return { typed: null, note: 'TypeScript is not available, so only cva variants are shown.', keep: true };
  const scope = program(ref.file, parsed);
  if (scope instanceof Error) return failed(scope);
  try {
    const typed = typedProps(scope, ref.file, ref.name, defaults);
    return typed ? { typed, note: typedNote(typed), keep: !typed.timedOut } : { typed: null, note: 'The props type could not be read; only cva variants are shown.', keep: true };
  } catch (error) {
    return failed(error);
  }
}

function buildSchema(parsed: ParsedModule, ref: ComponentRef, root: string, program: ProgramFor | null): { schema: ComponentSchema | null; keep: boolean } {
  const declared = declaredComponents(parsed.ast).find((item) => item.name === ref.name);
  if (!declared) return { schema: null, keep: true };
  const cva = linkedCva(parsed.code, declared, cvaCalls(parsed.ast));
  const variants = variantSpecs(cva, declared.defaults);
  const { typed, note, keep } = readTyped(program, parsed, ref, declared.defaults);
  const names = new Set(variants.map((spec) => spec.name));
  const props = [...variants, ...(typed?.specs ?? []).filter((spec) => !names.has(spec.name))];
  const schema: ComponentSchema = { name: ref.name, file: path.relative(root, ref.file).split(path.sep).join('/'), line: declared.line, props, cva, asChild: props.some((spec) => spec.name === 'asChild'), note };
  return { schema, keep };
}

export async function componentSchemas(workTree: string, refs: ComponentRef[]): Promise<(ComponentSchema | null)[]> {
  const root = await realpath(workTree);
  const stamps = await Promise.all(refs.map((ref) => stampOf(ref.file)));
  const keys = refs.map((ref, index) => `${root}|${ref.file}|${ref.name}|${stamps[index]}`);
  const fresh = new Map<string, ComponentSchema | null>();
  const missing = refs.filter((_, index) => !cache.has(keys[index] as string));
  if (missing.length > 0) {
    const ts = await loadTypeScript();
    const program = ts ? programs(ts, root) : null;
    for (const ref of missing) {
      const key = keys[refs.indexOf(ref)] as string;
      const parsed = await readModule(ref.file);
      const built = parsed ? buildSchema(parsed, ref, root, program) : { schema: null, keep: true };
      fresh.set(key, built.schema);
      if (built.keep) remember(key, { stamp: key.slice(key.lastIndexOf('|') + 1), schema: built.schema });
    }
  }
  return keys.map((key) => (fresh.has(key) ? (fresh.get(key) ?? null) : (cache.get(key)?.schema ?? null)));
}

export async function componentSchema(workTree: string, ref: ComponentRef): Promise<ComponentSchema | null> {
  const [schema] = await componentSchemas(workTree, [ref]);
  return schema ?? null;
}
