import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { treeChangesSince, treeStamp } from '../direct-edit/change-feed.js';

const TTL_MS = 120_000;
const MAX_ROOTS = 8;

interface ListEntry {
  stamp: number;
  at: number;
  files: Promise<string[]>;
}

interface CountEntry {
  stamp: number;
  at: number;
  counts: Map<string, Map<string, number>>;
}

const lists = new Map<string, ListEntry>();
const counts = new Map<string, CountEntry>();

function onlyKnownFiles(known: Set<string>, changed: string[], accept: (name: string) => boolean): boolean {
  return changed.every((file) => (known.has(file) ? existsSync(file) : !accept(path.basename(file)) && path.extname(file) !== ''));
}

async function reusable(entry: ListEntry, root: string, accept: (name: string) => boolean): Promise<string[] | null> {
  const changed = treeChangesSince(root, entry.stamp);
  const files = await entry.files.catch(() => null);
  return files && changed && onlyKnownFiles(new Set(files), changed, accept) ? files : null;
}

export function cachedFileList(watchRoot: string, key: string, accept: (name: string) => boolean, load: () => Promise<string[]>): Promise<string[]> {
  const stamp = treeStamp(watchRoot);
  const known = lists.get(key);
  const fresh = known !== undefined && Date.now() - known.at < TTL_MS;
  if (known && fresh && known.stamp === stamp) return known.files;
  if (lists.size >= MAX_ROOTS) lists.clear();
  const files = (async () => (known && fresh ? await reusable(known, watchRoot, accept) : null) ?? load())();
  lists.set(key, { stamp, at: known && fresh ? known.at : Date.now(), files });
  files.catch(() => lists.get(key)?.files === files && lists.delete(key));
  return files;
}

async function countIn(file: string, pattern: RegExp): Promise<number> {
  const code = await readFile(file, 'utf8').catch(() => '');
  return code.match(pattern)?.length ?? 0;
}

export async function cachedUseCount(watchRoot: string, files: string[], name: string): Promise<number> {
  const stamp = treeStamp(watchRoot);
  let entry = counts.get(watchRoot);
  const changed = entry && Date.now() - entry.at < TTL_MS ? treeChangesSince(watchRoot, entry.stamp) : null;
  if (!entry || changed === null) {
    if (counts.size >= MAX_ROOTS) counts.clear();
    entry = { stamp, at: Date.now(), counts: new Map() };
    counts.set(watchRoot, entry);
  } else if (changed.length > 0) {
    for (const byFile of entry.counts.values()) for (const file of changed) byFile.delete(file);
    entry.stamp = stamp;
  }
  const pattern = new RegExp(`<${name}[\\s/>]`, 'g');
  const byFile = entry.counts.get(name) ?? new Map<string, number>();
  entry.counts.set(name, byFile);
  let total = 0;
  for (const file of files) {
    let count = byFile.get(file);
    if (count === undefined) {
      count = await countIn(file, pattern);
      byFile.set(file, count);
    }
    total += count;
  }
  return total;
}
