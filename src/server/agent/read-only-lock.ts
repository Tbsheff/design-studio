import { chmod, lstat, readdir } from 'node:fs/promises';
import path from 'node:path';

const WRITE_BITS = 0o222;
const OWNER_WRITE = 0o200;

async function walk(root: string, visit: (entry: string, mode: number) => Promise<void>): Promise<void> {
  const info = await lstat(root).catch(() => null);
  if (!info || info.isSymbolicLink()) return;
  if (info.isDirectory()) {
    const names = await readdir(root).catch(() => [] as string[]);
    for (const name of names) await walk(path.join(root, name), visit);
  }
  await visit(root, info.mode);
}

export async function lockReadOnly(workTree: string, dirs: string[]): Promise<() => Promise<void>> {
  const roots = dirs.map((dir) => path.join(workTree, dir));
  for (const root of roots) await walk(root, (entry, mode) => chmod(entry, mode & ~WRITE_BITS).catch(() => undefined));
  return async () => {
    for (const root of roots) await walk(root, (entry, mode) => chmod(entry, mode | OWNER_WRITE).catch(() => undefined));
  };
}
