import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { parseExpression } from '@babel/parser';
import type * as t from '@babel/types';
import { parseModuleFile } from '../components/props-schema.js';

export interface TextModule {
  file: string;
  relative: string;
  code: string;
  ast: t.Node;
  json: boolean;
  parents: Map<t.Node, t.Node>;
}

const TEXT_EXTENSIONS = new Set(['.tsx', '.jsx', '.ts', '.js', '.mjs', '.mts', '.json']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.turbo', '.vite', '.studio', 'coverage', 'out']);
const SKIPPED_KEYS = new Set(['loc', 'leadingComments', 'trailingComments', 'innerComments', 'extra']);
const MAX_LISTED = 8000;
const MAX_DEPTH = 12;
const MAX_BYTES = 512 * 1024;
const LIST_TTL_MS = 10_000;
const READ_BATCH = 64;
const listed = new Map<string, { at: number; files: Promise<string[]> }>();

export function isNode(value: unknown): value is t.Node {
  return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';
}

export function childrenOf(node: t.Node): t.Node[] {
  const out: t.Node[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (SKIPPED_KEYS.has(key)) continue;
    if (Array.isArray(value)) {
      for (const item of value) if (isNode(item)) out.push(item);
    } else if (isNode(value)) out.push(value);
  }
  return out;
}

function parentMap(root: t.Node): Map<t.Node, t.Node> {
  const parents = new Map<t.Node, t.Node>();
  const stack: t.Node[] = [root];
  while (stack.length > 0) {
    const node = stack.pop() as t.Node;
    for (const child of childrenOf(node)) {
      parents.set(child, node);
      stack.push(child);
    }
  }
  return parents;
}

export function walkNodes(root: t.Node, visit: (node: t.Node) => void): void {
  const stack: t.Node[] = [root];
  while (stack.length > 0) {
    const node = stack.pop() as t.Node;
    visit(node);
    stack.push(...childrenOf(node));
  }
}

function blocked(relative: string): boolean {
  return relative.split('/').some((segment) => SKIP_DIRS.has(segment.toLowerCase()));
}

export async function textFileInRoot(root: string, file: string): Promise<{ file: string; relative: string } | null> {
  if (file.includes('\0') || !TEXT_EXTENSIONS.has(path.extname(file).toLowerCase())) return null;
  const real = await realpath(path.resolve(root, file)).catch(() => null);
  if (!real || !real.startsWith(root + path.sep)) return null;
  const relative = path.relative(root, real).split(path.sep).join('/');
  if (blocked(relative)) return null;
  const info = await stat(real).catch(() => null);
  return info?.isFile() && info.size <= MAX_BYTES ? { file: real, relative } : null;
}

function parseJson(code: string): t.Node | null {
  try {
    return parseExpression(code, { plugins: [] });
  } catch {
    return null;
  }
}

export function createModuleCache(root: string) {
  const cache = new Map<string, Promise<TextModule | null>>();
  const load = async (file: string): Promise<TextModule | null> => {
    const safe = await textFileInRoot(root, file);
    if (!safe) return null;
    const code = await readFile(safe.file, 'utf8').catch(() => null);
    if (code === null) return null;
    const json = safe.file.toLowerCase().endsWith('.json');
    const ast = json ? parseJson(code) : parseModuleFile(code, safe.file);
    return ast ? { ...safe, code, ast, json, parents: parentMap(ast) } : null;
  };
  return (file: string): Promise<TextModule | null> => {
    const key = path.resolve(root, file);
    let found = cache.get(key);
    if (!found) {
      found = load(key);
      cache.set(key, found);
    }
    return found;
  };
}

export type ModuleLoader = ReturnType<typeof createModuleCache>;

async function listInto(dir: string, depth: number, accept: (name: string) => boolean, out: string[]): Promise<void> {
  if (depth > MAX_DEPTH || out.length >= MAX_LISTED) return;
  const items = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const item of items) {
    if (out.length >= MAX_LISTED || item.name.startsWith('.')) continue;
    const full = path.join(dir, item.name);
    if (item.isDirectory() && !SKIP_DIRS.has(item.name)) await listInto(full, depth + 1, accept, out);
    else if (item.isFile() && accept(item.name)) out.push(full);
  }
}

export function jsxFiles(root: string): Promise<string[]> {
  const known = listed.get(root);
  if (known && Date.now() - known.at < LIST_TTL_MS) return known.files;
  const out: string[] = [];
  const files = listInto(root, 0, (name) => /\.(tsx|jsx)$/i.test(name), out).then(() => out);
  listed.set(root, { at: Date.now(), files });
  return files;
}

export async function messageFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  await listInto(root, 0, (name) => name.toLowerCase().endsWith('.json'), out);
  return out.filter((file) => /(^|[\\/])(locales?|messages|i18n|lang|translations)([\\/]|$)/i.test(path.relative(root, file)));
}

export async function filesMentioning(files: string[], needle: RegExp): Promise<string[]> {
  const hits: string[] = [];
  for (let index = 0; index < files.length; index += READ_BATCH) {
    const batch = files.slice(index, index + READ_BATCH);
    const texts = await Promise.all(batch.map((file) => readFile(file, 'utf8').catch(() => '')));
    texts.forEach((text, offset) => {
      if (needle.test(text)) hits.push(batch[offset] as string);
    });
  }
  return hits;
}
