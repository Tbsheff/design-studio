import { readFile } from 'node:fs/promises';
import path from 'node:path';

const MAX_KEPT = 500;
const WRITE_TEMP = /(^|\/)\.[^/]+\.(studio|mcp)-[0-9a-f]{8}\.tmp$/;
const kept = new Map<string, string>();

function tagStarts(text: string): string {
  const lines = text.split('\n');
  return lines.map((line) => {
    const at: number[] = [];
    for (let index = line.indexOf('<'); index >= 0; index = line.indexOf('<', index + 1)) if (line[index + 1] !== '/') at.push(index);
    return at.join(',');
  }).join('\n');
}

export function sameTagLayout(before: string, after: string): boolean {
  return before.split('\n').length === after.split('\n').length && tagStarts(before) === tagStarts(after);
}

function keyOf(projectId: string, directionId: string, relative: string): string {
  return `${projectId}:${directionId}:${relative}`;
}

export function noteLayoutKeepingWrite(projectId: string, directionId: string, files: { relative: string; before: string; after: string }[]): boolean {
  const keeps = files.length > 0 && files.every((file) => sameTagLayout(file.before, file.after));
  for (const file of files) {
    const key = keyOf(projectId, directionId, file.relative);
    if (!keeps) {
      kept.delete(key);
      continue;
    }
    kept.delete(key);
    kept.set(key, file.after);
    if (kept.size > MAX_KEPT) kept.delete(kept.keys().next().value as string);
  }
  return keeps;
}

export async function writesKeptLayout(change: { projectId: string; directionId: string; root: string; paths: string[] }): Promise<boolean> {
  const paths = change.paths.filter((relative) => !WRITE_TEMP.test(relative));
  if (paths.length === 0) return change.paths.length > 0;
  const checks = await Promise.all(paths.map(async (relative) => {
    const known = kept.get(keyOf(change.projectId, change.directionId, relative));
    if (known === undefined) return false;
    const now = await readFile(path.join(change.root, ...relative.split('/')), 'utf8').catch(() => null);
    return now === known;
  }));
  return checks.every(Boolean);
}
