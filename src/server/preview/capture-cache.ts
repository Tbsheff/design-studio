import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export type StampFor = (url: string) => Promise<string | null>;

interface Entry<T> {
  stamp: string;
  value: T;
  files: string[];
}

const MAX_ENTRIES = 400;

export function cacheKey(parts: unknown): string {
  return createHash('sha1').update(JSON.stringify(parts)).digest('hex').slice(0, 20);
}

async function cloneFile(from: string, to: string): Promise<void> {
  await mkdir(path.dirname(to), { recursive: true });
  await copyFile(from, to, constants.COPYFILE_FICLONE);
}

export class CaptureCache<T> {
  private readonly entries = new Map<string, Entry<T>>();

  constructor(private readonly dir: string) {}

  peek(key: string, stamp: string | null): T | null {
    const entry = stamp ? this.entries.get(key) : undefined;
    return entry && entry.stamp === stamp ? entry.value : null;
  }

  async hit(key: string, stamp: string | null, outFiles: string[]): Promise<T | null> {
    const entry = stamp ? this.entries.get(key) : undefined;
    if (!entry || entry.stamp !== stamp || entry.files.length !== outFiles.length) return null;
    try {
      await Promise.all(entry.files.map((file, index) => cloneFile(file, outFiles[index] as string)));
    } catch {
      this.entries.delete(key);
      return null;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  async store(key: string, stamp: string | null, value: T, files: string[]): Promise<void> {
    if (!stamp) return;
    const kept = files.map((file, index) => path.join(this.dir, `${key}-${index}${path.extname(file)}`));
    try {
      await Promise.all(files.map((file, index) => cloneFile(file, kept[index] as string)));
    } catch {
      return;
    }
    this.entries.delete(key);
    this.entries.set(key, { stamp, value, files: kept });
    while (this.entries.size > MAX_ENTRIES) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }
}
