import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Direction, ReferenceElement, SelectionContext, SourceLoc } from '../../shared/contracts.js';
import { checkPathInside } from '../agent/permissions.js';

const SNIPPET_LINES = 40;
const SNIPPET_CHARS = 4000;

function sourceFile(workTree: string, file: string): string | null {
  const relative = path.isAbsolute(file) && checkPathInside(workTree, file) === null ? file : path.resolve(workTree, file.replace(/^\/+/, ''));
  return checkPathInside(workTree, relative) === null ? relative : null;
}

async function readSnippet(workTree: string, source: SourceLoc | null): Promise<string | null> {
  if (!source) return null;
  const file = sourceFile(workTree, source.file);
  if (!file) return null;
  try {
    const lines = (await readFile(file, 'utf8')).split('\n');
    const start = Math.max(0, source.line - 1);
    const snippet = lines.slice(start, start + SNIPPET_LINES).join('\n');
    if (!snippet.trim()) return null;
    return snippet.length > SNIPPET_CHARS ? snippet.slice(0, SNIPPET_CHARS) : snippet;
  } catch {
    return null;
  }
}

export function labelOf(direction: Direction): string {
  return direction.variation ? `Variation ${direction.variation.label}` : direction.name;
}

export async function buildReference(from: Direction, element: SelectionContext): Promise<ReferenceElement> {
  return {
    fromDirectionId: from.id,
    fromLabel: labelOf(from),
    selector: element.selector,
    tag: element.tag,
    outerHTML: element.outerHTML,
    styles: element.styles,
    source: element.source,
    snippet: await readSnippet(from.workTree, element.source),
  };
}

export function mixPrompt(fromLabel: string, toLabel: string, tag: string, extra: string | undefined): string {
  const base = `Use the ${tag} from ${fromLabel} in ${toLabel}: adapt that part into this design and keep ${toLabel}'s tokens, fonts and colors.`;
  return extra?.trim() ? `${base}\n\n${extra.trim()}` : base;
}
