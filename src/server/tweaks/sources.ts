import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
import { TOKENS_CSS_FILE } from '../../shared/contracts.js';
import { lastDeclarationOf, rootDeclarations, usesVar, type CssDecl } from './css-vars.js';

type ParentNode = DefaultTreeAdapterMap['parentNode'];
type ChildNode = DefaultTreeAdapterMap['childNode'];
type Element = DefaultTreeAdapterMap['element'];
type Template = DefaultTreeAdapterMap['template'];

export type SourceKind = 'css' | 'html' | 'script';

export interface CssRegion {
  start: number;
  end: number;
}

export interface StyleSource {
  relative: string;
  kind: SourceKind;
  text: string;
  regions: CssRegion[];
}

interface FoundDeclaration {
  source: StyleSource;
  decl: CssDecl;
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.vite', '.studio', 'vite-cache', 'build', 'coverage']);
const KIND_BY_EXTENSION: Record<string, SourceKind> = {
  '.css': 'css',
  '.html': 'html',
  '.htm': 'html',
  '.tsx': 'script',
  '.jsx': 'script',
  '.ts': 'script',
  '.js': 'script',
};
const MAX_FILES = 400;
const MAX_BYTES = 1_000_000;
const MAX_DEPTH = 6;

function isElement(node: ChildNode | ParentNode): node is Element {
  return 'tagName' in node;
}

function childrenOf(node: ParentNode): ChildNode[] {
  if (isElement(node) && node.tagName === 'template') return (node as Template).content.childNodes;
  return node.childNodes;
}

function collectStyleRegions(node: ParentNode, out: CssRegion[]): void {
  for (const child of childrenOf(node)) {
    if (!isElement(child)) continue;
    if (child.tagName === 'style') {
      const text = child.childNodes[0];
      const location = text && 'sourceCodeLocation' in text ? text.sourceCodeLocation : null;
      if (location) out.push({ start: location.startOffset, end: location.endOffset });
      continue;
    }
    collectStyleRegions(child, out);
  }
}

export function htmlStyleRegions(html: string): CssRegion[] {
  const regions: CssRegion[] = [];
  collectStyleRegions(parse(html, { sourceCodeLocationInfo: true }), regions);
  return regions;
}

async function walk(root: string, dir: string, depth: number, out: string[]): Promise<void> {
  if (depth > MAX_DEPTH || out.length >= MAX_FILES) return;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (out.length >= MAX_FILES) return;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name.toLowerCase())) await walk(root, full, depth + 1, out);
    } else if (entry.isFile() && KIND_BY_EXTENSION[path.extname(entry.name).toLowerCase()]) {
      out.push(path.relative(root, full).split(path.sep).join('/'));
    }
  }
}

async function loadSource(workTree: string, relative: string): Promise<StyleSource | null> {
  const file = path.join(workTree, relative);
  const info = await stat(file);
  if (info.size > MAX_BYTES) return null;
  const text = await readFile(file, 'utf8');
  const kind = KIND_BY_EXTENSION[path.extname(relative).toLowerCase()] ?? 'script';
  if (kind === 'css') return { relative, kind, text, regions: [{ start: 0, end: text.length }] };
  if (kind === 'html') return { relative, kind, text, regions: htmlStyleRegions(text) };
  return { relative, kind, text, regions: [] };
}

export async function loadStyleSources(workTree: string): Promise<StyleSource[]> {
  const files: string[] = [];
  await walk(workTree, workTree, 0, files);
  const generated = TOKENS_CSS_FILE.toLowerCase();
  const sources = await Promise.all(files.filter((relative) => relative.toLowerCase() !== generated).map((relative) => loadSource(workTree, relative).catch(() => null)));
  return sources.filter((source): source is StyleSource => source !== null);
}

function rootDeclarationsOf(source: StyleSource): CssDecl[] {
  return source.regions.flatMap((region) => rootDeclarations(source.text, region.start, region.end));
}

export function declarationsFor(sources: StyleSource[], name: string): FoundDeclaration[] {
  const out: FoundDeclaration[] = [];
  for (const source of sources) {
    const decl = lastDeclarationOf(rootDeclarationsOf(source), name);
    if (decl) out.push({ source, decl });
  }
  return out;
}

export function isVarUsed(sources: StyleSource[], name: string): boolean {
  return sources.some((source) => usesVar(source.text, name));
}
