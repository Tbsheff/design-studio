import { createHash } from 'node:crypto';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { stateOfHost } from '../../shared/frame-state.js';

interface Owner {
  prefix: string;
  key: string;
  workTree: string;
  app: boolean;
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.vite', 'vite-cache', '.studio', '.next', '.turbo']);
const WALK_CAP = 3000;
const APP_STAMP_MS = 5 * 60_000;

async function treeStamp(root: string): Promise<string> {
  const parts: string[] = [];
  let left = WALK_CAP;
  const walk = async (dir: string): Promise<void> => {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    await Promise.all(
      entries.map(async (entry) => {
        if (left-- <= 0) return;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name)) await walk(full);
        } else if (entry.isFile()) {
          const info = await stat(full).catch(() => null);
          if (info) parts.push(`${full}:${info.size}:${info.mtimeMs}`);
        }
      }),
    );
  };
  await walk(root);
  return createHash('sha1').update(parts.sort().join('|')).digest('hex').slice(0, 16);
}

function isStateHost(url: string): boolean {
  try {
    return stateOfHost(new URL(url).hostname)?.state != null;
  } catch {
    return true;
  }
}

export class SourceStamps {
  private readonly owners: Owner[] = [];
  private readonly generations = new Map<string, number>();

  register(prefix: string, key: string, workTree: string, app: boolean): void {
    const index = this.owners.findIndex((owner) => owner.prefix === prefix);
    const owner = { prefix, key, workTree, app };
    if (index === -1) this.owners.push(owner);
    else this.owners[index] = owner;
    this.owners.sort((a, b) => b.prefix.length - a.prefix.length);
  }

  forget(url: string): void {
    for (let index = this.owners.length - 1; index >= 0; index -= 1) {
      const owner = this.owners[index];
      if (owner && !owner.app && url.startsWith(owner.prefix)) this.owners.splice(index, 1);
    }
  }

  forgetKey(key: string): void {
    for (let index = this.owners.length - 1; index >= 0; index -= 1) if (this.owners[index]?.key === key) this.owners.splice(index, 1);
  }

  bump(key: string): void {
    this.generations.set(key, (this.generations.get(key) ?? 0) + 1);
  }

  bumpProject(projectId: string): void {
    for (const owner of this.owners) if (owner.key.startsWith(`${projectId}:`)) this.bump(owner.key);
  }

  async stampFor(url: string, settled: (key: string) => Promise<void>): Promise<string | null> {
    if (isStateHost(url)) return null;
    const owner = this.owners.find((candidate) => url.startsWith(candidate.prefix));
    if (!owner) return null;
    await settled(owner.key);
    const generation = this.generations.get(owner.key) ?? 0;
    if (owner.app) return `g${generation}:t${Math.floor(Date.now() / APP_STAMP_MS)}`;
    return `g${generation}:${await treeStamp(owner.workTree)}`;
  }
}
