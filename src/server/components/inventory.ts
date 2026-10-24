import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { parse, type ParserPlugin } from '@babel/parser';
import { SOURCE_LOC_ATTR, type ComponentInfo, type ProjectKind } from '../../shared/contracts.js';

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'source', 'design-system', 'vite-cache']);
const MAX_FILES = 200;
const MAX_FILE_BYTES = 256 * 1024;
const MAX_DEPTH = 6;
const MAX_COMPONENTS = 40;
const NAME_RE = /^[A-Z][A-Za-z0-9]{0,47}$/;
const CLASS_RE = /^[A-Za-z_][A-Za-z0-9_-]{2,47}$/;
const LAYER_NAME_RE = /^[A-Za-z][A-Za-z0-9 _-]{0,47}$/;
const LAYOUT_CLASSES = new Set(['container', 'wrapper', 'wrap', 'inner', 'outer', 'row', 'col', 'column', 'columns', 'grid', 'flex', 'stack', 'content', 'section', 'active', 'hidden', 'visible', 'sr-only', 'visually-hidden', 'clearfix', 'left', 'right', 'center', 'muted', 'small', 'large', 'dark', 'light']);

interface AstNode {
  type: string;
  loc?: { start: { line: number; column: number } } | null;
  [key: string]: unknown;
}

function isNode(value: unknown): value is AstNode {
  return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';
}

function walk(node: AstNode, visit: (node: AstNode) => boolean | void): void {
  if (visit(node) === false) return;
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key.endsWith('Comments')) continue;
    const value = node[key];
    if (Array.isArray(value)) {
      for (const item of value) if (isNode(item)) walk(item, visit);
    } else if (isNode(value)) walk(value, visit);
  }
}

async function listFiles(root: string, accept: (name: string) => boolean): Promise<string[]> {
  const out: string[] = [];
  const visit = async (dir: string, depth: number): Promise<void> => {
    if (depth > MAX_DEPTH || out.length >= MAX_FILES) return;
    const items = await readdir(dir, { withFileTypes: true }).catch(() => []);
    items.sort((a, b) => a.name.localeCompare(b.name));
    for (const item of items) {
      if (out.length >= MAX_FILES || item.name.startsWith('.')) continue;
      const full = path.join(dir, item.name);
      if (item.isDirectory() && !SKIP_DIRS.has(item.name)) await visit(full, depth + 1);
      else if (item.isFile() && accept(item.name)) out.push(full);
    }
  };
  await visit(root, 0);
  return out;
}

async function readSmall(file: string): Promise<string | null> {
  const info = await stat(file).catch(() => null);
  if (!info?.isFile() || info.size > MAX_FILE_BYTES) return null;
  const text = await readFile(file, 'utf8').catch(() => null);
  return text === null || text.includes('\u0000') ? null : text;
}

function jsxName(node: unknown): string | null {
  return isNode(node) && node.type === 'JSXIdentifier' && typeof node.name === 'string' ? node.name : null;
}

function componentBody(node: AstNode): AstNode | null {
  if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') return node;
  if (node.type === 'CallExpression' && Array.isArray(node.arguments) && isNode(node.arguments[0])) return componentBody(node.arguments[0]);
  if (node.type === 'TSAsExpression' && isNode(node.expression)) return componentBody(node.expression);
  return null;
}

function declaredComponents(statement: AstNode): { name: string; body: AstNode }[] {
  const target = (statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportDefaultDeclaration') && isNode(statement.declaration) ? statement.declaration : statement;
  if (target.type === 'FunctionDeclaration' && isNode(target.id) && typeof target.id.name === 'string') return [{ name: target.id.name, body: target }];
  if (target.type !== 'VariableDeclaration' || !Array.isArray(target.declarations)) return [];
  const out: { name: string; body: AstNode }[] = [];
  for (const decl of target.declarations) {
    if (!isNode(decl) || !isNode(decl.id) || typeof decl.id.name !== 'string' || !isNode(decl.init)) continue;
    const body = componentBody(decl.init);
    if (body) out.push({ name: decl.id.name, body });
  }
  return out;
}

function rootHost(body: AstNode): { line: number; column: number } | null {
  let found: { line: number; column: number } | null = null;
  walk(body, (node) => {
    if (found) return false;
    if (node.type !== 'JSXOpeningElement') return;
    const name = jsxName(node.name);
    if (name && /^[a-z]/.test(name) && node.loc) found = { line: node.loc.start.line, column: node.loc.start.column + 1 };
  });
  return found;
}

function parseModule(code: string, file: string): AstNode | null {
  const plugins: ParserPlugin[] = /\.tsx$/i.test(file) ? ['jsx', 'typescript'] : ['jsx'];
  try {
    const ast: unknown = parse(code, { sourceType: 'module', plugins, errorRecovery: true });
    return isNode(ast) ? ast : null;
  } catch {
    return null;
  }
}

function collectDeclared(ast: AstNode, rel: string, found: Map<string, ComponentInfo>): void {
  const program = isNode(ast.program) ? ast.program : null;
  for (const statement of Array.isArray(program?.body) ? program.body : []) {
    if (!isNode(statement)) continue;
    for (const { name, body } of declaredComponents(statement)) {
      if (!NAME_RE.test(name) || name === 'App' || found.has(name)) continue;
      const host = rootHost(body);
      if (host) found.set(name, { id: name, name, source: 'react', file: rel, line: body.loc?.start.line ?? host.line, uses: 0, selector: `[${SOURCE_LOC_ATTR}="${rel}:${host.line}:${host.column}"]` });
    }
  }
}

function countUses(ast: AstNode, uses: Map<string, number>): void {
  walk(ast, (node) => {
    if (node.type !== 'JSXOpeningElement') return;
    const name = jsxName(node.name);
    if (name && NAME_RE.test(name)) uses.set(name, (uses.get(name) ?? 0) + 1);
  });
}

async function reactComponents(root: string): Promise<ComponentInfo[]> {
  const files = await listFiles(path.join(root, 'src'), (name) => /\.(tsx|jsx)$/i.test(name));
  const found = new Map<string, ComponentInfo>();
  const uses = new Map<string, number>();
  for (const file of files) {
    const code = await readSmall(file);
    const ast = code === null ? null : parseModule(code, file);
    if (!ast) continue;
    collectDeclared(ast, path.relative(root, file).split(path.sep).join('/'), found);
    countUses(ast, uses);
  }
  return [...found.values()].map((item) => ({ ...item, uses: uses.get(item.name) ?? 0 }));
}

function pascal(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

const TAG_RE = /<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g;
const ATTR_RE = /\b(class|data-name)\s*=\s*("([^"]*)"|'([^']*)')/g;

function stripNonMarkup(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|template)\b[\s\S]*?<\/\1>/gi, '');
}

interface Seen {
  file: string;
  line: number;
  count: number;
}

function bump(map: Map<string, Seen>, key: string, file: string, line: number): void {
  const known = map.get(key);
  if (known) known.count += 1;
  else map.set(key, { file, line, count: 1 });
}

function scanHtml(html: string, file: string, classes: Map<string, Seen>, layers: Map<string, Seen>): void {
  for (const tag of html.matchAll(TAG_RE)) {
    const line = html.slice(0, tag.index).split('\n').length;
    for (const attr of (tag[2] ?? '').matchAll(ATTR_RE)) {
      const value = (attr[3] ?? attr[4] ?? '').trim();
      if (attr[1] === 'data-name') {
        if (LAYER_NAME_RE.test(value)) bump(layers, value, file, line);
        continue;
      }
      const first = value.split(/\s+/)[0] ?? '';
      if (CLASS_RE.test(first) && !LAYOUT_CLASSES.has(first.toLowerCase())) bump(classes, first, file, line);
    }
  }
}

function patternsOf(seen: Map<string, Seen>, minCount: number, selector: (key: string) => string, names: Set<string>): ComponentInfo[] {
  const out: ComponentInfo[] = [];
  for (const [key, info] of seen) {
    const name = pascal(key);
    if (info.count < minCount || !NAME_RE.test(name) || names.has(name)) continue;
    names.add(name);
    out.push({ id: name, name, source: 'html', file: info.file, line: info.line, uses: info.count, selector: selector(key) });
  }
  return out;
}

async function htmlComponents(root: string): Promise<ComponentInfo[]> {
  const files = await listFiles(root, (name) => /\.html?$/i.test(name));
  const classes = new Map<string, Seen>();
  const layers = new Map<string, Seen>();
  for (const file of files.slice(0, 20)) {
    const raw = await readSmall(file);
    if (raw !== null) scanHtml(stripNonMarkup(raw), path.relative(root, file).split(path.sep).join('/'), classes, layers);
  }
  const names = new Set<string>();
  return [...patternsOf(layers, 1, (layer) => `[data-name="${layer}"]`, names), ...patternsOf(classes, 2, (cls) => `.${cls}`, names)];
}

export async function listComponents(workTree: string, kind: ProjectKind): Promise<ComponentInfo[]> {
  const found = kind === 'react' ? await reactComponents(workTree) : await htmlComponents(workTree);
  return found.sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name)).slice(0, MAX_COMPONENTS);
}
