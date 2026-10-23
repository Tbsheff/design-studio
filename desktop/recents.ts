import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { isProjectId } from '../src/shared/desktop-link.js';

export interface RecentProject {
  id: string;
  name: string;
  folder: string;
}

const MAX_RECENTS = 8;

export function readRecents(file: string): RecentProject[] {
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is RecentProject => isProjectId(item?.id) && typeof item?.name === 'string' && typeof item?.folder === 'string').slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

export function addRecent(list: RecentProject[], entry: RecentProject): RecentProject[] {
  return [entry, ...list.filter((item) => item.id !== entry.id)].slice(0, MAX_RECENTS);
}

export function writeRecents(file: string, list: RecentProject[]): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(list, null, 2)}\n`);
}
