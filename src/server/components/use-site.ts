import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import type * as t from '@babel/types';
import { SourceMapConsumer, type RawSourceMap } from 'source-map-js';
import type { SourceLoc } from '../../shared/contracts.js';
import type { ComponentInstance, ComponentOwner, InstanceQuery, PropValue } from '../../shared/props.js';
import { parseStack } from '../app/source-map.js';
import { componentSchema, followExport, insideRoot, loadTypeScript, parseModuleFile, resolveImport, type ComponentRef } from './props-schema.js';

const MODULE_PATH = /^\/(?!@)[A-Za-z0-9_@.\-/ ]{1,300}\.(tsx|jsx)$/;
const MAP_URL = /\/\/# sourceMappingURL=data:application\/json;(?:charset=utf-8;)?base64,([A-Za-z0-9+/=]+)\s*$/;
const MAP_TTL_MS = 5000;
const maps = new Map<string, { at: number; consumer: Promise<SourceMapConsumer | null> }>();

export interface UseSiteScope {
  workTree: string;
  previewOrigin: string | null;
}

function isNode(value: unknown): value is t.Node {
  return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';
}

function tagName(name: t.JSXOpeningElement['name']): string {
  if (name.type === 'JSXIdentifier') return name.name;
  if (name.type === 'JSXMemberExpression') return `${tagName(name.object)}.${name.property.name}`;
  return `${name.namespace.name}:${name.name.name}`;
}

function childNodes(node: t.Node): t.Node[] {
  const out: t.Node[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc' || key.endsWith('Comments') || key === 'extra') continue;
    const items: unknown[] = Array.isArray(value) ? value : [value];
    for (const item of items) if (isNode(item)) out.push(item);
  }
  return out;
}

export function componentElements(ast: t.File): t.JSXElement[] {
  const out: t.JSXElement[] = [];
  const stack: t.Node[] = [ast.program];
  while (stack.length > 0) {
    const node = stack.pop() as t.Node;
    if (node.type === 'JSXElement' && /^[A-Z]/.test(tagName(node.openingElement.name))) out.push(node);
    stack.push(...childNodes(node));
  }
  return out;
}

function locOf(element: t.JSXElement): { line: number; col: number } {
  const start = element.openingElement.loc?.start;
  return { line: start?.line ?? 0, col: (start?.column ?? 0) + 1 };
}

export function elementAt(ast: t.File, line: number, col: number, name?: string): t.JSXElement | null {
  const candidates = componentElements(ast);
  const exact = candidates.find((element) => locOf(element).line === line && locOf(element).col === col);
  if (exact) return exact;
  const onLine = candidates.filter((element) => locOf(element).line === line);
  const short = name?.split('.').pop();
  const named = onLine.filter((element) => tagName(element.openingElement.name).split('.').pop() === short);
  const pool = named.length > 0 ? named : onLine;
  return pool.sort((a, b) => Math.abs(locOf(a).col - col) - Math.abs(locOf(b).col - col))[0] ?? null;
}

function mapFor(url: string): Promise<SourceMapConsumer | null> {
  const known = maps.get(url);
  if (known && Date.now() - known.at < MAP_TTL_MS) return known.consumer;
  const consumer = fetch(url, { signal: AbortSignal.timeout(5000), headers: { accept: '*/*' } })
    .then(async (response) => {
      if (!response.ok) return null;
      const match = MAP_URL.exec(await response.text());
      if (!match?.[1]) return null;
      return new SourceMapConsumer(JSON.parse(Buffer.from(match[1], 'base64').toString('utf8')) as RawSourceMap);
    })
    .catch(() => null);
  if (maps.size > 100) maps.delete(maps.keys().next().value as string);
  maps.set(url, { at: Date.now(), consumer });
  return consumer;
}

function appFrame(stack: string): { pathname: string; line: number; col: number } | null {
  for (const frame of parseStack(stack)) {
    let url: URL;
    try {
      url = new URL(frame.file);
    } catch {
      continue;
    }
    if (url.pathname.includes('/node_modules/') || url.pathname.includes('/.vite/')) continue;
    if (!MODULE_PATH.test(url.pathname) || url.pathname.split('/').includes('..')) continue;
    return { pathname: url.pathname, line: frame.line1, col: frame.column1 };
  }
  return null;
}

async function ownerUseSite(scope: UseSiteScope, root: string, owner: ComponentOwner): Promise<SourceLoc | null> {
  if (!scope.previewOrigin) return null;
  const frame = appFrame(owner.stack);
  if (!frame) return null;
  const consumer = await mapFor(`${scope.previewOrigin}${frame.pathname}`);
  const original = consumer?.originalPositionFor({ line: frame.line, column: frame.col - 1 });
  if (!original || original.line === null) return null;
  const file = await insideRoot(root, path.join(root, decodeURIComponent(frame.pathname.slice(1))));
  if (!file) return null;
  const code = await readFile(file, 'utf8').catch(() => null);
  const ast = code === null ? null : parseModuleFile(code, file);
  const element = ast ? elementAt(ast, original.line, (original.column ?? 0) + 1, owner.name) : null;
  if (!element) return null;
  return { file: path.relative(root, file).split(path.sep).join('/'), ...locOf(element) };
}

function attributeValue(attribute: t.JSXAttribute): PropValue | undefined {
  const value = attribute.value;
  if (value === null || value === undefined) return true;
  if (value.type === 'StringLiteral') return value.value;
  if (value.type !== 'JSXExpressionContainer') return undefined;
  const expression = value.expression;
  if (expression.type === 'StringLiteral' || expression.type === 'NumericLiteral' || expression.type === 'BooleanLiteral') return expression.value;
  if (expression.type === 'TemplateLiteral' && expression.expressions.length === 0) return expression.quasis[0]?.value.cooked ?? undefined;
  if (expression.type === 'UnaryExpression' && expression.operator === '-' && expression.argument.type === 'NumericLiteral') return -expression.argument.value;
  return undefined;
}

function importedName(specifier: t.ImportDeclaration['specifiers'][number]): string | null {
  if (specifier.type === 'ImportDefaultSpecifier') return 'default';
  if (specifier.type === 'ImportSpecifier') return specifier.imported.type === 'Identifier' ? specifier.imported.name : specifier.imported.value;
  return null;
}

function importRef(ast: t.File, tag: string): { source: string; imported: string } | null {
  for (const statement of ast.program.body) {
    if (statement.type !== 'ImportDeclaration' || statement.importKind === 'type') continue;
    const specifier = statement.specifiers.find((item) => item.local.name === tag);
    const imported = specifier ? importedName(specifier) : null;
    if (imported) return { source: statement.source.value, imported };
  }
  return null;
}

async function componentRef(root: string, file: string, ast: t.File, tag: string): Promise<ComponentRef | null> {
  if (tag.includes('.')) return null;
  const ts = await loadTypeScript();
  const imported = importRef(ast, tag);
  if (!imported) return followExport(ts, root, { file, name: tag });
  const resolved = resolveImport(ts, imported.source, file, root);
  const inside = resolved ? await insideRoot(root, resolved) : null;
  return inside ? followExport(ts, root, { file: inside, name: imported.imported }) : null;
}

export async function countUses(files: string[], name: string): Promise<number> {
  const pattern = new RegExp(`<${name}[\\s/>]`, 'g');
  let total = 0;
  for (const file of files) {
    const code = await readFile(file, 'utf8').catch(() => '');
    total += code.match(pattern)?.length ?? 0;
  }
  return total;
}

export async function readInstance(workTree: string, loc: SourceLoc, uses?: (name: string) => Promise<number>): Promise<ComponentInstance | null> {
  const root = await realpath(workTree);
  const file = await insideRoot(root, path.resolve(root, loc.file));
  if (!file) return null;
  const code = await readFile(file, 'utf8').catch(() => null);
  const ast = code === null ? null : parseModuleFile(code, file);
  const element = ast ? elementAt(ast, loc.line, loc.col) : null;
  if (!ast || !element) return null;
  const tag = tagName(element.openingElement.name);
  const values: Record<string, PropValue> = {};
  const dynamic: string[] = [];
  let spread = false;
  for (const attribute of element.openingElement.attributes) {
    if (attribute.type === 'JSXSpreadAttribute') {
      spread = true;
      continue;
    }
    const name = attribute.name.type === 'JSXIdentifier' ? attribute.name.name : `${attribute.name.namespace.name}:${attribute.name.name.name}`;
    const value = attributeValue(attribute);
    if (value === undefined) dynamic.push(name);
    else values[name] = value;
  }
  const ref = await componentRef(root, file, ast, tag);
  const component = ref ? await componentSchema(root, ref) : null;
  return { use: { file: path.relative(root, file).split(path.sep).join('/'), ...locOf(element) }, tag, component, values, dynamic, spread, uses: component && uses ? await uses(component.name) : 0 };
}

function usable(instance: ComponentInstance | null): instance is ComponentInstance {
  if (!instance?.component) return false;
  return instance.component.props.length > 0 || Object.keys(instance.values).length > 0;
}

export async function resolveInstance(scope: UseSiteScope, query: InstanceQuery, uses?: (name: string) => Promise<number>): Promise<ComponentInstance | null> {
  const root = await realpath(scope.workTree);
  const direct = query.use ?? null;
  if (direct) return readInstance(root, direct, uses);
  const seen = new Set<string>();
  const tryLoc = async (loc: SourceLoc | null): Promise<ComponentInstance | null> => {
    if (!loc) return null;
    const key = `${loc.file}:${loc.line}:${loc.col}`;
    if (seen.has(key)) return null;
    seen.add(key);
    const instance = await readInstance(root, loc, uses);
    return usable(instance) ? instance : null;
  };
  for (const owner of query.owners ?? []) {
    const found = await tryLoc(await ownerUseSite(scope, root, owner).catch(() => null));
    if (found) return found;
  }
  return tryLoc(query.usedAt ?? null);
}
