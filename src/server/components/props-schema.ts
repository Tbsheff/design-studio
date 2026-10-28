import { existsSync } from 'node:fs';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { parse, type ParserPlugin } from '@babel/parser';
import type * as t from '@babel/types';
import type * as TS from 'typescript';
import type { ComponentSchema, CvaInfo, PropSpec, PropValue, VariantGroup } from '../../shared/props.js';

type Ts = typeof TS;

const SOURCE_EXT = /\.(tsx|ts|jsx|js|mts|mjs)$/i;
const SKIPPED_PROPS = new Set(['children', 'className', 'style', 'ref', 'key', 'dangerouslySetInnerHTML']);
const MAX_OPTIONS = 60;
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

interface ProgramScope {
  ts: Ts;
  program: TS.Program;
  root: string;
}

function compilerOptionsFor(ts: Ts, file: string, root: string): TS.CompilerOptions {
  const base: TS.CompilerOptions = { jsx: ts.JsxEmit.Preserve, allowJs: true, noEmit: true, skipLibCheck: true, strict: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, types: [] };
  let dir = path.dirname(file);
  while (dir.startsWith(root)) {
    for (const name of ['tsconfig.app.json', 'tsconfig.json']) {
      const candidate = path.join(dir, name);
      if (!existsSync(candidate)) continue;
      const read = ts.readConfigFile(candidate, (target) => ts.sys.readFile(target));
      if (read.error || !read.config) continue;
      const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, path.dirname(candidate), undefined, candidate);
      if (name === 'tsconfig.json' && !parsed.options.paths && Array.isArray(read.config.references) && existsSync(path.join(dir, 'tsconfig.app.json'))) continue;
      return { ...parsed.options, ...base, jsx: ts.JsxEmit.Preserve, paths: parsed.options.paths, baseUrl: parsed.options.baseUrl, moduleResolution: parsed.options.moduleResolution ?? base.moduleResolution };
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return base;
}

export function createProgram(ts: Ts, files: string[], root: string): ProgramScope {
  const options = compilerOptionsFor(ts, files[0] ?? path.join(root, 'index.ts'), root);
  return { ts, program: ts.createProgram({ rootNames: files, options }), root };
}

function nodeModulesFile(file: string): boolean {
  return file.split(/[\\/]/).includes('node_modules');
}

function controlOf(ts: Ts, checker: TS.TypeChecker, type: TS.Type): Pick<PropSpec, 'control' | 'options' | 'node'> | null {
  const text = checker.typeToString(type);
  if (/\bReactNode\b|\bReactElement\b|JSX\.Element/.test(text) || type.aliasSymbol?.name === 'ReactNode') return { control: 'text', node: true };
  const parts = type.isUnion() ? type.types : [type];
  if (parts.every((part) => (part.flags & ts.TypeFlags.BooleanLike) !== 0)) return { control: 'boolean' };
  if (parts.every((part) => part.isStringLiteral())) return { control: 'select', options: parts.map((part) => (part as TS.StringLiteralType).value).slice(0, MAX_OPTIONS) };
  if (parts.every((part) => (part.flags & ts.TypeFlags.StringLike) !== 0)) return { control: 'text' };
  if (parts.every((part) => (part.flags & ts.TypeFlags.NumberLike) !== 0)) return { control: 'number' };
  return null;
}

function declarationNode(ts: Ts, source: TS.SourceFile, name: string): TS.Node | null {
  let found: TS.Node | null = null;
  const visit = (node: TS.Node): void => {
    if (found) return;
    if ((ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node)) && node.name && ts.isIdentifier(node.name) && node.name.text === name) {
      found = node.name;
      return;
    }
    if (ts.isSourceFile(node) || ts.isVariableStatement(node) || ts.isVariableDeclarationList(node)) ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

export function typedProps(scope: ProgramScope, file: string, name: string, defaults: Record<string, PropValue>): PropSpec[] | null {
  const { ts, program, root } = scope;
  const source = program.getSourceFile(file);
  if (!source) return null;
  const checker = program.getTypeChecker();
  const at = declarationNode(ts, source, name);
  if (!at) return null;
  const symbol = checker.getSymbolAtLocation(at);
  if (!symbol) return null;
  const signature = checker.getTypeOfSymbolAtLocation(symbol, at).getCallSignatures()[0];
  const param = signature?.parameters[0];
  if (!param) return [];
  const propsType = checker.getTypeOfSymbolAtLocation(param, at);
  const specs: PropSpec[] = [];
  for (const prop of checker.getPropertiesOfType(propsType)) {
    if (SKIPPED_PROPS.has(prop.name) || specs.length >= 40) continue;
    const declared = prop.declarations?.[0]?.getSourceFile().fileName ?? '';
    if (!declared || nodeModulesFile(declared) || !path.resolve(declared).startsWith(root)) continue;
    const type = checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(prop, at));
    const control = controlOf(ts, checker, type);
    if (!control) continue;
    const fallback = defaults[prop.name];
    specs.push({ name: prop.name, ...control, optional: (prop.flags & ts.SymbolFlags.Optional) !== 0, from: 'type', ...(fallback !== undefined ? { default: fallback } : {}) });
  }
  return specs;
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

function buildSchema(parsed: ParsedModule, ref: ComponentRef, root: string, scope: ProgramScope | null): ComponentSchema | null {
  const declared = declaredComponents(parsed.ast).find((item) => item.name === ref.name);
  if (!declared) return null;
  const cva = linkedCva(parsed.code, declared, cvaCalls(parsed.ast));
  const variants = variantSpecs(cva, declared.defaults);
  const typed = scope ? typedProps(scope, ref.file, ref.name, declared.defaults) : null;
  const names = new Set(variants.map((spec) => spec.name));
  const props = [...variants, ...(typed ?? []).filter((spec) => !names.has(spec.name))];
  const note = typed === null ? (scope ? 'The props type could not be read; only cva variants are shown.' : 'TypeScript is not available, so only cva variants are shown.') : null;
  return { name: ref.name, file: path.relative(root, ref.file).split(path.sep).join('/'), line: declared.line, props, cva, asChild: props.some((spec) => spec.name === 'asChild'), note };
}

export async function componentSchemas(workTree: string, refs: ComponentRef[]): Promise<(ComponentSchema | null)[]> {
  const root = await realpath(workTree);
  const stamps = await Promise.all(refs.map((ref) => stampOf(ref.file)));
  const keys = refs.map((ref, index) => `${root}|${ref.file}|${ref.name}|${stamps[index]}`);
  const missing = refs.filter((_, index) => !cache.has(keys[index] as string));
  if (missing.length > 0) {
    const ts = await loadTypeScript();
    const scope = ts ? createProgram(ts, [...new Set(missing.map((ref) => ref.file))], root) : null;
    for (const ref of missing) {
      const index = refs.indexOf(ref);
      const parsed = await readModule(ref.file);
      remember(keys[index] as string, { stamp: stamps[index] as string, schema: parsed ? buildSchema(parsed, ref, root, scope) : null });
    }
  }
  return keys.map((key) => cache.get(key)?.schema ?? null);
}

export async function componentSchema(workTree: string, ref: ComponentRef): Promise<ComponentSchema | null> {
  const [schema] = await componentSchemas(workTree, [ref]);
  return schema ?? null;
}
