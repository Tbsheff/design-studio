import { existsSync } from 'node:fs';
import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import type * as t from '@babel/types';
import type { Project } from '../../shared/contracts.js';
import type { InsertableComponent, InsertableList } from '../../shared/insert.js';
import type { ExportKind } from '../direct-edit/imports.js';
import { listFiles } from './inventory.js';
import { declaredComponents, parseModuleFile } from './props-schema.js';

export interface LibraryEntry extends InsertableComponent {
  local: string;
  kind: ExportKind;
  absolute: string;
}

export interface Library {
  root: string;
  entries: LibraryEntry[];
  files: string[];
  truncated: boolean;
}

interface FileInfo {
  stamp: string;
  text: string;
  entries: Omit<LibraryEntry, 'uses' | 'file' | 'folder' | 'absolute' | 'id'>[];
  specifiers: string[];
}

const LIST_MAX = 300;
const SKIP_FILE = /\.(test|spec|stories|story)\.[jt]sx$/i;
const NEXT_FILES = new Set(['page', 'layout', 'loading', 'error', 'not-found', 'template', 'default', 'route', 'global-error']);
const VOID_ROOT = /<(input|img|hr|br|textarea|select|meta|link|source|track|wbr|col|area|embed)\b/;
const SPREAD = /\{\s*\.\.\.\s*[A-Za-z_$][\w$]*\s*\}/;
const IMPORT_FROM = /\bfrom\s+['"]([^'"\n]+)['"]/g;
const cache = new Map<string, FileInfo>();

function defaultLocal(statement: t.ExportDefaultDeclaration): string | null {
  const decl = statement.declaration;
  if (decl.type === 'Identifier') return decl.name;
  return (decl.type === 'FunctionDeclaration' || decl.type === 'ClassDeclaration') && decl.id ? decl.id.name : null;
}

function namedExports(statement: t.ExportNamedDeclaration, out: Map<string, string>): void {
  const decl = statement.declaration;
  if (decl?.type === 'FunctionDeclaration' && decl.id) out.set(decl.id.name, decl.id.name);
  if (decl?.type === 'VariableDeclaration') for (const item of decl.declarations) if (item.id.type === 'Identifier') out.set(item.id.name, item.id.name);
  for (const specifier of statement.specifiers) {
    if (specifier.type !== 'ExportSpecifier') continue;
    const exported = specifier.exported.type === 'Identifier' ? specifier.exported.name : specifier.exported.value;
    if (!out.has(specifier.local.name) || exported !== 'default') out.set(specifier.local.name, exported);
  }
}

function exportNames(ast: t.File): Map<string, string> {
  const out = new Map<string, string>();
  for (const statement of ast.program.body) {
    if (statement.type === 'ExportDefaultDeclaration') {
      const local = defaultLocal(statement);
      if (local) out.set(local, 'default');
    } else if (statement.type === 'ExportNamedDeclaration' && !statement.source) namedExports(statement, out);
  }
  return out;
}

function takesChildren(body: string): boolean {
  if (/\bchildren\b/.test(body)) return true;
  return SPREAD.test(body) && !VOID_ROOT.test(body);
}

async function fileInfo(file: string): Promise<FileInfo | null> {
  const info = await stat(file).catch(() => null);
  if (!info?.isFile() || info.size > 512 * 1024) return null;
  const stamp = `${info.mtimeMs}:${info.size}`;
  const known = cache.get(file);
  if (known?.stamp === stamp) return known;
  const text = await readFile(file, 'utf8').catch(() => null);
  if (text === null) return null;
  const ast = parseModuleFile(text, file);
  const exported = ast ? exportNames(ast) : new Map<string, string>();
  const entries = (ast ? declaredComponents(ast) : []).flatMap((item) => {
    const name = exported.get(item.name);
    if (!name || item.name === 'App') return [];
    const kind: ExportKind = name === 'default' ? 'default' : 'named';
    return [{ name: kind === 'default' ? item.name : name, local: item.name, kind, line: item.line, children: takesChildren(text.slice(item.start, item.end)) }];
  });
  const specifiers = [...text.matchAll(IMPORT_FROM)].map((match) => match[1] as string).filter((spec) => !spec.startsWith('.'));
  const next = { stamp, text, entries, specifiers };
  if (cache.size > 2000) cache.clear();
  cache.set(file, next);
  return next;
}

function acceptFile(name: string): boolean {
  if (!/\.(tsx|jsx)$/i.test(name) || SKIP_FILE.test(name)) return false;
  return !NEXT_FILES.has(name.replace(/\.(tsx|jsx)$/i, ''));
}

async function packageNames(root: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const group of ['packages', 'apps']) {
    const items = await readdir(path.join(root, group), { withFileTypes: true }).catch(() => []);
    for (const item of items) {
      if (!item.isDirectory()) continue;
      const dir = path.join(root, group, item.name);
      const pkg = await readFile(path.join(dir, 'package.json'), 'utf8').then((raw) => JSON.parse(raw) as { name?: unknown }, () => null);
      if (typeof pkg?.name === 'string') out.set(pkg.name, dir);
    }
  }
  return out;
}

async function workspaceRoots(root: string, appDir: string): Promise<string[]> {
  const pkg = await readFile(path.join(root, appDir, 'package.json'), 'utf8').then((raw) => JSON.parse(raw) as Record<string, Record<string, string> | undefined>, () => null);
  const deps = Object.keys({ ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) });
  const names = await packageNames(root);
  return deps.flatMap((dep) => {
    const dir = names.get(dep);
    if (!dir || dir === path.join(root, appDir)) return [];
    const components = path.join(dir, 'src', 'components');
    return [existsSync(components) ? components : existsSync(path.join(dir, 'src')) ? path.join(dir, 'src') : dir];
  });
}

export async function libraryRoots(project: Project, workTree: string): Promise<{ root: string; scan: string[] }> {
  const root = await realpath(workTree);
  const appDir = project.app?.appDir;
  if (appDir && appDir !== '.' && existsSync(path.join(root, appDir))) return { root, scan: [...(await workspaceRoots(root, appDir)), path.join(root, appDir)] };
  const src = path.join(root, 'src');
  return { root, scan: [existsSync(src) ? src : root] };
}

function countTags(texts: string[], names: Set<string>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const text of texts) {
    for (const match of text.matchAll(/<([A-Z][A-Za-z0-9]*)[\s/>]/g)) {
      const name = match[1] as string;
      if (names.has(name)) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return counts;
}

const ROUTE_LOCAL = /^(?:src\/)?(?:app|pages)\//;

function rankFiles(scan: string[]): (file: string) => number {
  const appRoot = scan.at(-1) ?? '';
  return (file: string) => {
    const index = scan.findIndex((dir) => file.startsWith(dir + path.sep));
    if (index === scan.length - 1) return (ROUTE_LOCAL.test(path.relative(appRoot, file).split(path.sep).join('/')) ? 2 : 1) * scan.length + index;
    return (path.basename(scan[index] ?? '') === 'components' ? 0 : 3) * scan.length + index;
  };
}

export async function loadLibrary(project: Project, workTree: string): Promise<Library & { specifiers: Map<string, string[]> }> {
  const { root, scan } = await libraryRoots(project, workTree);
  const files = [...new Set((await Promise.all(scan.map((dir) => listFiles(dir, acceptFile)))).flat())];
  const infos = await Promise.all(files.map(async (file) => ({ file, info: await fileInfo(file) })));
  const rank = rankFiles(scan);
  const entries: LibraryEntry[] = [];
  const specifiers = new Map<string, string[]>();
  for (const { file, info } of infos) {
    if (!info) continue;
    specifiers.set(file, info.specifiers);
    const relative = path.relative(root, file).split(path.sep).join('/');
    for (const entry of info.entries) entries.push({ ...entry, id: `${relative}#${entry.name}`, file: relative, folder: path.posix.dirname(relative), absolute: file, uses: 0 });
  }
  const counts = countTags(infos.map((item) => item.info?.text ?? ''), new Set(entries.map((entry) => entry.local)));
  for (const entry of entries) entry.uses = counts.get(entry.local) ?? 0;
  entries.sort((a, b) => Number(a.uses === 0) - Number(b.uses === 0) || rank(a.absolute) - rank(b.absolute) || a.folder.localeCompare(b.folder) || b.uses - a.uses || a.name.localeCompare(b.name));
  return { root, entries: entries.slice(0, LIST_MAX), files, truncated: entries.length > LIST_MAX, specifiers };
}

export async function listInsertable(project: Project, workTree: string): Promise<InsertableList> {
  if (project.kind !== 'react') return { components: [], truncated: false, note: 'This is an HTML project. It has no component kit to insert from.' };
  const library = await loadLibrary(project, workTree);
  const components = library.entries.map(({ id, name, file, folder, line, uses, children }) => ({ id, name, file, folder, line, uses, children }));
  return { components, truncated: library.truncated, note: null };
}
