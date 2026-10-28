import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type * as t from '@babel/types';
import type { SourceLoc } from '../../shared/contracts.js';
import { parseSource } from '../direct-edit/jsx.js';
import { EditError } from './edit-deps.js';

const FULL = /^(.+):(\d+):(\d+)$/;
const LINE_ONLY = /^(.+):(\d+)$/;
const SCRIPT = /\.(tsx|jsx|ts|js|mjs|cjs)$/;
const FILES_MAX = 2000;
const shownFiles = new Map<string, Map<string, Set<string>>>();

export function noteShownFiles(scope: string, files: Iterable<string>): void {
  let byBase = shownFiles.get(scope);
  if (!byBase || byBase.size > FILES_MAX) {
    byBase = new Map();
    shownFiles.set(scope, byBase);
  }
  for (const file of files) {
    const base = path.posix.basename(file);
    byBase.set(base, (byBase.get(base) ?? new Set()).add(file));
  }
}

function fullFile(scope: string, file: string): string {
  if (file.includes('/')) return file;
  const known = [...(shownFiles.get(scope)?.get(file) ?? [])];
  return known.length === 1 ? (known[0] as string) : file;
}

function insideTree(workTree: string, file: string): string {
  const absolute = path.resolve(workTree, file);
  if (path.isAbsolute(file) || file.split(/[\\/]/).includes('..') || !absolute.startsWith(workTree + path.sep)) throw new EditError(`${file} must be a path relative to the project folder.`);
  return absolute;
}

function tagStartsOn(root: t.Node, line: number): number[] {
  const cols: number[] = [];
  const stack: unknown[] = [root];
  while (stack.length > 0) {
    const node = stack.pop() as Record<string, unknown> | null;
    if (!node || typeof node !== 'object') continue;
    if (Array.isArray(node)) {
      stack.push(...node);
      continue;
    }
    if (node.type === 'JSXOpeningElement') {
      const start = (node.loc as t.SourceLocation | undefined)?.start;
      if (start?.line === line) cols.push(start.column + 1);
    }
    for (const [key, value] of Object.entries(node)) if (key !== 'loc' && value && typeof value === 'object') stack.push(value);
  }
  return cols.sort((a, b) => a - b);
}

async function colOnLine(workTree: string, file: string, line: number, raw: string): Promise<number> {
  if (!SCRIPT.test(file)) throw new EditError(`${raw}: pass file:line:col for a file that is not JSX.`);
  const text = await readFile(insideTree(workTree, file), 'utf8').catch(() => null);
  if (text === null) throw new EditError(`${raw}: there is no file ${file} in the project.`);
  const cols = tagStartsOn(parseSource(text, /\.tsx?$/.test(file)), line);
  if (cols.length === 1) return cols[0] as number;
  if (cols.length === 0) throw new EditError(`${raw}: no JSX tag starts on line ${line} of ${file}.`);
  throw new EditError(`${raw}: ${cols.length} JSX tags start on line ${line} (columns ${cols.join(', ')}). Pass file:line:col, for example ${file}:${line}:${cols[0]}.`);
}

export async function resolveSourceLoc(workTree: string, scope: string, raw: string): Promise<SourceLoc> {
  const full = FULL.exec(raw.trim());
  if (full) return { file: fullFile(scope, full[1] as string), line: Number(full[2]), col: Number(full[3]) };
  const lineOnly = LINE_ONLY.exec(raw.trim());
  if (!lineOnly) throw new EditError('pass the source as file:line:col or file:line, for example src/App.tsx:12:7 (get_layers prints it).');
  const file = fullFile(scope, lineOnly[1] as string);
  const line = Number(lineOnly[2]);
  return { file, line, col: await colOnLine(workTree, file, line, raw) };
}
