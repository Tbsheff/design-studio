import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import type * as TS from 'typescript';
import type { PropSpec, PropValue } from '../../shared/props.js';

type Ts = typeof TS;

const SKIPPED_PROPS = new Set(['children', 'className', 'style', 'ref', 'key', 'dangerouslySetInnerHTML']);
export const MAX_OPTIONS = 60;
const MAX_TYPED_PROPS = 40;
const MAX_SCANNED_PROPS = 600;
const PROGRAM_FILES_MAX = 160;
const PROGRAM_BYTES_MAX = 16 * 1024 * 1024;
const SOURCE_BYTES_MAX = 1024 * 1024;
const LIBRARY_DTS_BYTES_MAX = 256 * 1024;
const BUDGET_MS = 1500;
const SOURCE_CACHE_MAX = 400;
const REACT_TYPES = /[\\/]@types[\\/]react[\\/]/;

export interface ProgramScope {
  ts: Ts;
  program: TS.Program;
  root: string;
  deadline: number;
}

export interface TypedProps {
  specs: PropSpec[];
  inherited: number;
  partial: boolean;
  timedOut: boolean;
}

export class ProgramBudgetError extends Error {
  constructor(
    message: string,
    readonly timedOut: boolean,
  ) {
    super(message);
  }
}

const configCache = new Map<string, { stamp: number; options: TS.CompilerOptions | null }>();
const sourceCache = new Map<string, { stamp: number; file: TS.SourceFile }>();

export function nodeModulesFile(file: string): boolean {
  return file.split(/[\\/]/).includes('node_modules');
}

function configOptions(ts: Ts, candidate: string, base: TS.CompilerOptions): TS.CompilerOptions | null {
  const stamp = statSync(candidate, { throwIfNoEntry: false })?.mtimeMs ?? -1;
  const known = configCache.get(candidate);
  if (known?.stamp === stamp) return known.options;
  const read = ts.readConfigFile(candidate, (target) => ts.sys.readFile(target));
  let options: TS.CompilerOptions | null = null;
  if (!read.error && read.config) {
    const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, path.dirname(candidate), undefined, candidate);
    const skip = path.basename(candidate) === 'tsconfig.json' && !parsed.options.paths && Array.isArray(read.config.references) && existsSync(path.join(path.dirname(candidate), 'tsconfig.app.json'));
    if (!skip) options = { ...parsed.options, ...base, jsx: ts.JsxEmit.Preserve, paths: parsed.options.paths, baseUrl: parsed.options.baseUrl, moduleResolution: parsed.options.moduleResolution ?? base.moduleResolution };
  }
  if (configCache.size > 100) configCache.clear();
  configCache.set(candidate, { stamp, options });
  return options;
}

export function compilerOptionsFor(ts: Ts, file: string, root: string): TS.CompilerOptions {
  const base: TS.CompilerOptions = { jsx: ts.JsxEmit.Preserve, allowJs: true, noEmit: true, skipLibCheck: true, strict: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, types: [] };
  let dir = path.dirname(file);
  while (dir.startsWith(root)) {
    for (const name of ['tsconfig.app.json', 'tsconfig.json']) {
      const candidate = path.join(dir, name);
      if (!existsSync(candidate)) continue;
      const options = configOptions(ts, candidate, base);
      if (options) return options;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return base;
}

function directImports(ts: Ts, file: string, specifiers: string[], options: TS.CompilerOptions, root: string): Set<string> {
  const out = new Set<string>();
  for (const specifier of specifiers) {
    const resolved = ts.resolveModuleName(specifier, file, options, ts.sys).resolvedModule;
    if (!resolved) continue;
    const target = path.resolve(resolved.resolvedFileName);
    const external = resolved.isExternalLibraryImport || nodeModulesFile(target);
    if (external ? target.endsWith('.d.ts') : target.startsWith(root + path.sep)) out.add(target);
  }
  return out;
}

function cachedSource(ts: Ts, file: string, language: TS.ScriptTarget | TS.CreateSourceFileOptions, limit: number): TS.SourceFile | undefined {
  const stamp = statSync(file, { throwIfNoEntry: false });
  if (!stamp?.isFile() || stamp.size > limit) return undefined;
  const key = `${file}|${JSON.stringify(language)}`;
  const known = sourceCache.get(key);
  if (known?.stamp === stamp.mtimeMs) return known.file;
  const text = ts.sys.readFile(file);
  if (text === undefined) return undefined;
  const source = ts.createSourceFile(file, text, language);
  if (sourceCache.size >= SOURCE_CACHE_MAX) sourceCache.delete(sourceCache.keys().next().value as string);
  sourceCache.set(key, { stamp: stamp.mtimeMs, file: source });
  return source;
}

function boundedHost(ts: Ts, options: TS.CompilerOptions, allowed: Set<string>, deadline: number): TS.CompilerHost {
  const host = ts.createCompilerHost(options, false);
  const libDir = path.dirname(ts.getDefaultLibFilePath(options));
  let files = 0;
  let bytes = 0;
  host.getSourceFile = (name, language) => {
    const file = path.resolve(name);
    const library = file.startsWith(libDir + path.sep) || REACT_TYPES.test(file);
    if (!library && !allowed.has(file)) return undefined;
    const limit = library ? Number.POSITIVE_INFINITY : nodeModulesFile(file) ? LIBRARY_DTS_BYTES_MAX : SOURCE_BYTES_MAX;
    const source = cachedSource(ts, file, language, limit);
    if (!source) return undefined;
    files += 1;
    bytes += source.text.length;
    if (files > PROGRAM_FILES_MAX || bytes > PROGRAM_BYTES_MAX) throw new ProgramBudgetError(`it pulls in more than ${PROGRAM_FILES_MAX} files`, false);
    if (!library && Date.now() > deadline) throw new ProgramBudgetError('it took too long', true);
    return source;
  };
  return host;
}

export function createProgram(ts: Ts, file: string, imports: string[], root: string): ProgramScope {
  const deadline = Date.now() + BUDGET_MS;
  const options = compilerOptionsFor(ts, file, root);
  const allowed = directImports(ts, file, imports, options, root);
  allowed.add(path.resolve(file));
  const program = ts.createProgram({ rootNames: [file], options, host: boundedHost(ts, options, allowed, deadline) });
  return { ts, program, root, deadline: Math.max(deadline, Date.now() + BUDGET_MS / 2) };
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

function propsTypeOf(scope: ProgramScope, file: string, name: string): { checker: TS.TypeChecker; at: TS.Node; type: TS.Type | null } | null {
  const source = scope.program.getSourceFile(file);
  if (!source) return null;
  const checker = scope.program.getTypeChecker();
  const at = declarationNode(scope.ts, source, name);
  const symbol = at ? checker.getSymbolAtLocation(at) : undefined;
  if (!at || !symbol) return null;
  const param = checker.getTypeOfSymbolAtLocation(symbol, at).getCallSignatures()[0]?.parameters[0];
  return { checker, at, type: param ? checker.getTypeOfSymbolAtLocation(param, at) : null };
}

function ownDeclaration(prop: TS.Symbol, root: string): boolean {
  const declared = prop.declarations?.[0]?.getSourceFile().fileName ?? '';
  return declared !== '' && !nodeModulesFile(declared) && path.resolve(declared).startsWith(root);
}

export function typedProps(scope: ProgramScope, file: string, name: string, defaults: Record<string, PropValue>): TypedProps | null {
  const found = propsTypeOf(scope, file, name);
  if (!found) return null;
  const result: TypedProps = { specs: [], inherited: 0, partial: false, timedOut: false };
  if (!found.type) return result;
  const { ts, root, deadline } = scope;
  const { checker, at } = found;
  const props = checker.getPropertiesOfType(found.type);
  result.partial = props.length > MAX_SCANNED_PROPS;
  for (const prop of props.slice(0, MAX_SCANNED_PROPS)) {
    if (SKIPPED_PROPS.has(prop.name)) continue;
    if (!ownDeclaration(prop, root)) {
      result.inherited += 1;
      continue;
    }
    result.timedOut = Date.now() > deadline;
    if (result.specs.length >= MAX_TYPED_PROPS || result.timedOut) {
      result.partial = true;
      break;
    }
    const control = controlOf(ts, checker, checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(prop, at)));
    if (!control) continue;
    const fallback = defaults[prop.name];
    result.specs.push({ name: prop.name, ...control, optional: (prop.flags & ts.SymbolFlags.Optional) !== 0, from: 'type', ...(fallback !== undefined ? { default: fallback } : {}) });
  }
  return result;
}
