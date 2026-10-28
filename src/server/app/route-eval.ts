import { existsSync } from 'node:fs';
import { readdir, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import type * as t from '@babel/types';
import { loadTypeScript, parseModuleFile, resolveImport } from '../components/props-schema.js';
import { walkNodes } from '../direct-edit/text-source-files.js';

export const UNKNOWN = '[*]';
const MAX_EVAL_DEPTH = 48;
const MAX_FILE_BYTES = 512 * 1024;
const STRING_METHODS = new Set(['toString', 'replace', 'replaceAll', 'concat', 'trim', 'toLowerCase']);

export interface SourceModule {
  file: string;
  ast: t.File;
  consts: Map<string, t.Node>;
  locals: Map<string, t.Node>;
  imports: Map<string, { source: string; imported: string }>;
  exports: Map<string, string>;
  reexports: { source: string; imported: string; exported: string }[];
}

type Val = { kind: 'str'; s: string } | { kind: 'obj'; node: t.ObjectExpression; mod: SourceModule } | { kind: 'fn'; node: t.Function; mod: SourceModule } | null;

interface Env {
  mod: SourceModule;
  params: Map<string, string>;
  depth: number;
}

function keyName(key: t.Node): string | null {
  if (key.type === 'Identifier') return key.name;
  if (key.type === 'StringLiteral') return key.value;
  return null;
}

function declare(mod: SourceModule, node: t.Node, top: boolean): void {
  if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init) {
    if (top) mod.consts.set(node.id.name, node.init);
    if (!mod.locals.has(node.id.name)) mod.locals.set(node.id.name, node.init);
  } else if (node.type === 'FunctionDeclaration' && node.id) {
    if (top) mod.consts.set(node.id.name, node);
    if (!mod.locals.has(node.id.name)) mod.locals.set(node.id.name, node);
  }
}

function readImport(mod: SourceModule, node: t.ImportDeclaration): void {
  for (const spec of node.specifiers) {
    const imported = spec.type === 'ImportSpecifier' ? (keyName(spec.imported) ?? spec.local.name) : spec.type === 'ImportDefaultSpecifier' ? 'default' : '*';
    mod.imports.set(spec.local.name, { source: node.source.value, imported });
  }
}

function declaredNames(decl: t.Declaration | null | undefined): string[] {
  if (decl?.type === 'VariableDeclaration') return decl.declarations.flatMap((item) => (item.id.type === 'Identifier' ? [item.id.name] : []));
  if (decl?.type === 'FunctionDeclaration' && decl.id) return [decl.id.name];
  return [];
}

function readNamedExport(mod: SourceModule, node: t.ExportNamedDeclaration): void {
  for (const name of declaredNames(node.declaration)) mod.exports.set(name, name);
  for (const spec of node.specifiers) {
    if (spec.type !== 'ExportSpecifier') continue;
    const exported = keyName(spec.exported) ?? spec.local.name;
    if (node.source) mod.reexports.push({ source: node.source.value, imported: spec.local.name, exported });
    else mod.exports.set(exported, spec.local.name);
  }
}

function defaultName(decl: t.ExportDefaultDeclaration['declaration']): string | null {
  if (decl.type === 'Identifier') return decl.name;
  return (decl.type === 'FunctionDeclaration' || decl.type === 'ClassDeclaration') && decl.id ? decl.id.name : null;
}

function readExport(mod: SourceModule, node: t.Node): void {
  if (node.type === 'ExportNamedDeclaration') readNamedExport(mod, node);
  else if (node.type === 'ExportAllDeclaration') mod.reexports.push({ source: node.source.value, imported: '*', exported: '*' });
  else if (node.type === 'ExportDefaultDeclaration') {
    const name = defaultName(node.declaration);
    if (name) mod.exports.set('default', name);
  }
}

function indexModule(file: string, ast: t.File): SourceModule {
  const mod: SourceModule = { file, ast, consts: new Map(), locals: new Map(), imports: new Map(), exports: new Map(), reexports: [] };
  for (const statement of ast.program.body) {
    if (statement.type === 'ImportDeclaration') readImport(mod, statement);
    readExport(mod, statement);
    const decl = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement;
    if (decl?.type === 'VariableDeclaration') for (const item of decl.declarations) declare(mod, item, true);
    else if (decl?.type === 'FunctionDeclaration') declare(mod, decl, true);
  }
  walkNodes(ast, (node) => declare(mod, node, false));
  return mod;
}

async function workspacePackages(start: string): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  let dir = start;
  for (let up = 0; up < 6; up += 1) {
    if (existsSync(path.join(dir, 'pnpm-workspace.yaml')) || existsSync(path.join(dir, 'turbo.json'))) break;
    const parent = path.dirname(dir);
    if (parent === dir) return found;
    dir = parent;
  }
  for (const group of ['packages', 'apps']) {
    const entries = await readdir(path.join(dir, group), { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pkgDir = path.join(dir, group, entry.name);
      const pkg = JSON.parse((await readFile(path.join(pkgDir, 'package.json'), 'utf8').catch(() => '{}')) || '{}') as { name?: string };
      if (pkg.name) found.set(pkg.name, pkgDir);
    }
  }
  return found;
}

function splitPackage(specifier: string): { name: string; sub: string } {
  const parts = specifier.split('/');
  const count = specifier.startsWith('@') ? 2 : 1;
  return { name: parts.slice(0, count).join('/'), sub: parts.slice(count).join('/') };
}

function firstExisting(candidates: string[]): string | null {
  return candidates.find((file) => /\.(tsx?|jsx?|mjs)$/.test(file) && existsSync(file)) ?? null;
}

function packageFile(pkgDir: string, sub: string): string | null {
  const bases = sub ? [path.join(pkgDir, 'src', sub), path.join(pkgDir, sub)] : [path.join(pkgDir, 'src', 'index'), path.join(pkgDir, 'index')];
  return firstExisting(bases.flatMap((base) => [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')]));
}

export interface SourceProject {
  root: string;
  load(file: string): Promise<SourceModule | null>;
  resolve(specifier: string, fromFile: string): Promise<string | null>;
}

export async function createSourceProject(appRoot: string): Promise<SourceProject> {
  const root = await realpath(appRoot).catch(() => appRoot);
  const ts = await loadTypeScript();
  const packages = await workspacePackages(root);
  const cache = new Map<string, Promise<SourceModule | null>>();
  const read = async (file: string): Promise<SourceModule | null> => {
    const code = await readFile(file, 'utf8').catch(() => null);
    if (code === null || code.length > MAX_FILE_BYTES) return null;
    const ast = parseModuleFile(code, file);
    return ast ? indexModule(file, ast) : null;
  };
  return {
    root,
    load(file) {
      let found = cache.get(file);
      if (!found) {
        found = read(file);
        cache.set(file, found);
      }
      return found;
    },
    async resolve(specifier, fromFile) {
      const direct = resolveImport(ts, specifier, fromFile, root);
      if (direct) return realpath(direct).catch(() => direct);
      if (specifier.startsWith('.')) return null;
      const { name, sub } = splitPackage(specifier);
      const pkgDir = packages.get(name);
      return pkgDir ? packageFile(pkgDir, sub) : null;
    },
  };
}

function str(s: string): Val {
  return { kind: 'str', s };
}

function textOf(value: Val): string {
  return value?.kind === 'str' ? value.s : UNKNOWN;
}

export class RouteEvaluator {
  constructor(private readonly project: SourceProject) {}

  async exported(file: string, name: string, depth = 0): Promise<Val> {
    if (depth > MAX_EVAL_DEPTH) return null;
    const mod = await this.project.load(file);
    if (!mod) return null;
    const local = mod.exports.get(name);
    if (local) return this.identifier(local, { mod, params: new Map(), depth: depth + 1 });
    for (const item of mod.reexports) {
      if (item.exported !== name && item.exported !== '*') continue;
      const target = await this.project.resolve(item.source, file);
      const found = target ? await this.exported(target, item.imported === '*' ? name : item.imported, depth + 1) : null;
      if (found) return found;
    }
    return null;
  }

  async identifier(name: string, env: Env): Promise<Val> {
    const param = env.params.get(name);
    if (param !== undefined) return str(param);
    const local = env.mod.consts.get(name) ?? env.mod.locals.get(name);
    if (local) return this.value(local, { ...env, params: new Map() });
    const imported = env.mod.imports.get(name);
    if (!imported || imported.imported === '*') return null;
    const target = await this.project.resolve(imported.source, env.mod.file);
    return target ? this.exported(target, imported.imported, env.depth) : null;
  }

  async evaluate(node: t.Node, mod: SourceModule): Promise<string | null> {
    const value = await this.value(node, { mod, params: new Map(), depth: 0 });
    return value?.kind === 'str' ? value.s : null;
  }

  async evaluateIn(node: t.Node, env: Env): Promise<string | null> {
    const value = await this.value(node, env);
    return value?.kind === 'str' ? value.s : null;
  }

  async value(node: t.Node, env: Env): Promise<Val> {
    if (env.depth > MAX_EVAL_DEPTH) return null;
    const next: Env = { ...env, depth: env.depth + 1 };
    switch (node.type) {
      case 'StringLiteral':
        return str(node.value);
      case 'TemplateLiteral':
        return this.template(node, next);
      case 'Identifier':
        return this.identifier(node.name, next);
      case 'MemberExpression':
        return this.member(node, next);
      case 'ObjectExpression':
        return { kind: 'obj', node, mod: env.mod };
      case 'ArrowFunctionExpression':
      case 'FunctionExpression':
      case 'FunctionDeclaration':
        return { kind: 'fn', node, mod: env.mod };
      case 'CallExpression':
        return this.call(node, next);
      default:
        return this.other(node, next);
    }
  }

  private async other(node: t.Node, env: Env): Promise<Val> {
    switch (node.type) {
      case 'TSAsExpression':
      case 'TSSatisfiesExpression':
      case 'TSNonNullExpression':
      case 'ParenthesizedExpression':
        return this.value(node.expression, env);
      case 'ConditionalExpression':
        return this.conditional(node, env);
      case 'LogicalExpression': {
        const left = await this.value(node.left, env);
        return left?.kind === 'str' && left.s !== '' ? left : this.value(node.right, env);
      }
      case 'BinaryExpression':
        return node.operator === '+' && node.left.type !== 'PrivateName' ? str(textOf(await this.value(node.left, env)) + textOf(await this.value(node.right, env))) : null;
      case 'NewExpression':
        return node.callee.type === 'Identifier' && node.callee.name === 'URL' && node.arguments[0] ? this.value(node.arguments[0], env) : null;
      default:
        return null;
    }
  }

  private async conditional(node: t.ConditionalExpression, env: Env): Promise<Val> {
    if (node.test.type === 'BooleanLiteral') return this.value(node.test.value ? node.consequent : node.alternate, env);
    const alternate = await this.value(node.alternate, env);
    if (alternate?.kind === 'str') return alternate;
    return this.value(node.consequent, env);
  }

  private async template(node: t.TemplateLiteral, env: Env): Promise<Val> {
    let out = '';
    for (let i = 0; i < node.quasis.length; i += 1) {
      out += node.quasis[i]?.value.cooked ?? node.quasis[i]?.value.raw ?? '';
      const expr = node.expressions[i];
      if (expr) out += textOf(await this.value(expr, env));
    }
    return str(out);
  }

  private async member(node: t.MemberExpression, env: Env): Promise<Val> {
    const key = node.computed ? (node.property.type === 'StringLiteral' ? node.property.value : null) : node.property.type === 'Identifier' ? node.property.name : null;
    if (!key) return null;
    const object = await this.value(node.object, env);
    if (object?.kind !== 'obj') return null;
    for (const prop of object.node.properties) {
      if (prop.type === 'ObjectProperty' && keyName(prop.key) === key) return this.value(prop.value, { mod: object.mod, params: new Map(), depth: env.depth });
      if (prop.type === 'ObjectMethod' && keyName(prop.key) === key) return { kind: 'fn', node: prop, mod: object.mod };
    }
    return null;
  }

  private async call(node: t.CallExpression, env: Env): Promise<Val> {
    const callee = node.callee;
    if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier' && STRING_METHODS.has(callee.property.name)) {
      const object = await this.value(callee.object, env);
      if (object?.kind === 'str') return object;
    }
    const fn = callee.type === 'V8IntrinsicIdentifier' ? null : await this.value(callee, env);
    const applied = fn?.kind === 'fn' ? await this.apply(fn, node.arguments, env) : null;
    if (applied) return applied;
    for (const arg of node.arguments) {
      const value = await this.value(arg, env);
      if (value?.kind === 'str' && value.s.includes('/')) return value;
    }
    return null;
  }

  private async apply(fn: Extract<Val, { kind: 'fn' }>, args: t.CallExpression['arguments'], env: Env): Promise<Val> {
    const params = new Map<string, string>();
    for (const [index, param] of fn.node.params.entries()) {
      const name = param.type === 'Identifier' ? param.name : param.type === 'AssignmentPattern' && param.left.type === 'Identifier' ? param.left.name : null;
      if (!name) continue;
      const arg = args[index];
      const given = arg && arg.type !== 'SpreadElement' && arg.type !== 'ArgumentPlaceholder' ? await this.value(arg, env) : null;
      params.set(name, given?.kind === 'str' ? given.s : arg ? `[${name}]` : '');
    }
    const inner: Env = { mod: fn.mod, params, depth: env.depth };
    const body = fn.node.body;
    if (body.type !== 'BlockStatement') return this.value(body, inner);
    const ret = body.body.find((statement): statement is t.ReturnStatement => statement.type === 'ReturnStatement');
    return ret?.argument ? this.value(ret.argument, inner) : null;
  }
}

export function lineOf(node: t.Node): number {
  return node.loc?.start.line ?? 1;
}
