import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type * as t from '@babel/types';
import type { Project, SourceLoc } from '../../shared/contracts.js';
import { parseSource } from './jsx.js';

const SKIP = /(^|\/)(node_modules|\.next|\.git|dist|build|\.turbo|coverage|\.studio)(\/|$)/;
const FILES_MAX = 6000;

function openTagAttr(html: string, name: string): string | null {
  const open = /^<[^>]*>/.exec(html)?.[0] ?? '';
  const raw = new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(open)?.[1];
  return raw === undefined ? null : raw.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function srcCandidates(src: string | null): string[] {
  if (!src) return [];
  const out = [src];
  try {
    const url = new URL(src, 'http://local');
    const inner = url.pathname.endsWith('/_next/image') ? url.searchParams.get('url') : null;
    if (inner) out.push(inner);
    if (url.origin === 'http://local') out.push(url.pathname);
  } catch {
    return out;
  }
  return [...new Set(out)];
}

function stringAttr(element: t.JSXElement, name: string): string | null {
  for (const attribute of element.openingElement.attributes) {
    if (attribute.type !== 'JSXAttribute' || attribute.name.type !== 'JSXIdentifier' || attribute.name.name !== name) continue;
    const value = attribute.value;
    if (value?.type === 'StringLiteral') return value.value;
    if (value?.type === 'JSXExpressionContainer' && value.expression.type === 'StringLiteral') return value.expression.value;
  }
  return null;
}

function* jsxElements(node: unknown): Generator<t.JSXElement> {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) yield* jsxElements(item);
    return;
  }
  const value = node as Record<string, unknown>;
  if (typeof value.type !== 'string') return;
  if (value.type === 'JSXElement') yield value as unknown as t.JSXElement;
  for (const [key, child] of Object.entries(value)) if (key !== 'loc' && key !== 'leadingComments' && key !== 'trailingComments' && typeof child === 'object') yield* jsxElements(child);
}

async function sourceFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { recursive: true }).catch(() => [] as string[]);
  return entries.filter((entry) => /\.(tsx|jsx)$/.test(entry) && !SKIP.test(entry.split(path.sep).join('/'))).slice(0, FILES_MAX);
}

function score(element: t.JSXElement, alt: string | null, srcs: string[]): number {
  const name = element.openingElement.name;
  if (name.type !== 'JSXIdentifier' || !/^(img|Image|[A-Z]\w*Image)$/.test(name.name)) return 0;
  const ownAlt = stringAttr(element, 'alt');
  const ownSrc = stringAttr(element, 'src');
  return (ownSrc !== null && srcs.includes(ownSrc) ? 2 : 0) + (alt !== null && alt !== '' && ownAlt === alt ? 1 : 0);
}

export async function findImageSource(project: Project, workTree: string, html: string): Promise<SourceLoc | null> {
  const alt = openTagAttr(html, 'alt');
  const srcs = srcCandidates(openTagAttr(html, 'src'));
  const needles = [...(alt ? [`"${alt}"`] : []), ...srcs.map((src) => `"${src}"`)];
  if (needles.length === 0) return null;
  const appRoot = path.join(workTree, project.app?.appDir ?? '.');
  const found: { loc: SourceLoc; score: number }[] = [];
  for (const entry of await sourceFiles(appRoot)) {
    const file = path.join(appRoot, entry);
    const code = await readFile(file, 'utf8').catch(() => '');
    if (!needles.some((needle) => code.includes(needle))) continue;
    let ast: t.File;
    try {
      ast = parseSource(code, file.endsWith('.tsx'));
    } catch {
      continue;
    }
    for (const element of jsxElements(ast.program)) {
      const start = element.openingElement.loc?.start;
      const points = start ? score(element, alt, srcs) : 0;
      if (start && points > 0) found.push({ loc: { file: path.relative(workTree, file).split(path.sep).join('/'), line: start.line, col: start.column + 1 }, score: points });
    }
  }
  const best = Math.max(0, ...found.map((item) => item.score));
  const top = found.filter((item) => item.score === best);
  return best > 0 && top.length === 1 ? (top[0] as { loc: SourceLoc }).loc : null;
}
