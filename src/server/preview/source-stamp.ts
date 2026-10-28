import { createHash } from 'node:crypto';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { stateOfHost } from '../../shared/frame-state.js';
import { RouteStamps } from './route-stamp.js';

interface Owner {
  prefix: string;
  key: string;
  workTree: string;
  appDir: string | null;
}

export interface SourceStamp {
  key: string;
  newest: number | null;
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.vite', 'vite-cache', '.studio', '.next', '.turbo']);
const WALK_CAP = 3000;
const MEMO_MS = 200;

async function treeStamp(root: string): Promise<SourceStamp> {
  const parts: string[] = [];
  let newest = 0;
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
          if (info) {
            parts.push(`${full}:${info.size}:${info.mtimeMs}`);
            newest = Math.max(newest, info.mtimeMs);
          }
        }
      }),
    );
  };
  await walk(root);
  return { key: createHash('sha1').update(parts.sort().join('|')).digest('hex').slice(0, 16), newest };
}

function pathOf(url: string): string {
  return new URL(url).pathname;
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
  private readonly epochs = new Map<string, number>();
  private readonly landedAt = new Map<string, string>();
  private readonly memo = new Map<string, { at: number; stamp: Promise<SourceStamp | null> }>();
  private readonly routes = new RouteStamps();

  register(prefix: string, key: string, workTree: string, appDir: string | null): void {
    const index = this.owners.findIndex((owner) => owner.prefix === prefix);
    const owner = { prefix, key, workTree, appDir };
    if (index === -1) this.owners.push(owner);
    else this.owners[index] = owner;
    this.owners.sort((a, b) => b.prefix.length - a.prefix.length);
  }

  forget(url: string): void {
    for (let index = this.owners.length - 1; index >= 0; index -= 1) {
      const owner = this.owners[index];
      if (owner && owner.appDir === null && url.startsWith(owner.prefix)) this.owners.splice(index, 1);
    }
  }

  forgetKey(key: string): void {
    for (let index = this.owners.length - 1; index >= 0; index -= 1) if (this.owners[index]?.key === key) this.owners.splice(index, 1);
  }

  bump(key: string): void {
    this.generations.set(key, (this.generations.get(key) ?? 0) + 1);
  }

  bumpProject(projectId: string): void {
    this.epochs.set(projectId, (this.epochs.get(projectId) ?? 0) + 1);
    for (const owner of this.owners) if (owner.key.startsWith(`${projectId}:`)) this.bump(owner.key);
  }

  landed(url: string, href: string): void {
    const from = url.split('#')[0] ?? url;
    const to = pathOf(href);
    if (to === pathOf(from)) this.landedAt.delete(from);
    else this.landedAt.set(from, to);
  }

  stampFor(url: string, settled: (key: string) => Promise<void>): Promise<SourceStamp | null> {
    const known = this.memo.get(url);
    if (known && Date.now() - known.at < MEMO_MS) return known.stamp;
    const stamp = this.compute(url, settled);
    this.memo.set(url, { at: Date.now(), stamp });
    if (this.memo.size > 200) this.memo.delete(this.memo.keys().next().value as string);
    return stamp;
  }

  private async compute(url: string, settled: (key: string) => Promise<void>): Promise<SourceStamp | null> {
    if (isStateHost(url)) return null;
    const owner = this.owners.find((candidate) => url.startsWith(candidate.prefix));
    if (!owner) return null;
    await settled(owner.key);
    const generation = this.generations.get(owner.key) ?? 0;
    if (owner.appDir === null) {
      const tree = await treeStamp(owner.workTree);
      return { key: `g${generation}:${tree.key}`, newest: tree.newest };
    }
    return (await this.routeStamp(owner, url)) ?? { key: `g${generation}`, newest: null };
  }

  private async routeStamp(owner: Owner, url: string): Promise<SourceStamp | null> {
    const appDir = owner.appDir as string;
    const paths = [...new Set([pathOf(url), this.landedAt.get(url.split('#')[0] ?? url)].filter((item): item is string => Boolean(item)))];
    const stamps = await Promise.all(paths.map((pathname) => this.routes.stamp(owner.workTree, appDir, pathname).catch(() => null)));
    if (stamps.some((stamp) => stamp === null)) return null;
    const epoch = this.epochs.get(owner.key.split(':')[0] ?? '') ?? 0;
    return { key: `e${epoch}:${stamps.map((stamp) => stamp?.key).join('+')}`, newest: Math.max(...stamps.map((stamp) => stamp?.newest ?? 0)) };
  }
}
