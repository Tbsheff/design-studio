import { existsSync } from 'node:fs';
import { readdir, realpath } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { FoundApp, FoundAppKind, FoundApps } from '../../shared/found-apps.js';
import type { Project } from '../../shared/contracts.js';
import { detectApp, frameworkOf, readPackage } from './detect.js';

const ROOTS = ['Documents', 'code', 'dev', 'Projects', 'Developer'];
const MAX_DEPTH = 2;
const TIME_BOX_MS = 1000;
const CACHE_MS = 60_000;
const MAX_APPS = 60;
const SKIP = new Set(['node_modules', 'Library', 'Applications', 'Pictures', 'Music', 'Movies', 'dist', 'build', 'out', 'vendor']);

type Scan = Omit<FoundApps, 'apps'> & { apps: Omit<FoundApp, 'projectId'>[] };

const cache = new Map<string, { at: number; scan: Scan }>();

function inside(parent: string, child: string): boolean {
  return child.startsWith(`${parent}${path.sep}`);
}

async function classify(dir: string): Promise<{ kind: FoundAppKind; apps: string[] } | 'package' | null> {
  const pkg = await readPackage(dir);
  if (pkg) {
    const detected = await detectApp(dir);
    if (detected.framework === 'next') return { kind: 'next', apps: detected.candidates.map((candidate) => candidate.appDir) };
    if (frameworkOf(pkg) === 'vite') return { kind: 'vite', apps: [] };
  }
  if (existsSync(path.join(dir, 'index.html'))) return { kind: 'html', apps: [] };
  return pkg ? 'package' : null;
}

async function childDirs(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && !SKIP.has(entry.name)).map((entry) => path.join(dir, entry.name));
}

async function scanRoot(home: string, root: string, found: Scan, deadline: number): Promise<void> {
  let level = [root];
  for (let depth = 1; depth <= MAX_DEPTH && level.length > 0; depth += 1) {
    const next: string[] = [];
    for (const parent of level) {
      for (const dir of await childDirs(parent)) {
        if (Date.now() > deadline || found.apps.length >= MAX_APPS) {
          found.truncated = true;
          return;
        }
        const kind = await classify(dir);
        if (kind && kind !== 'package') found.apps.push({ path: dir, name: path.basename(dir), kind: kind.kind, apps: kind.apps, root: path.relative(home, root) });
        else if (!kind) next.push(dir);
      }
    }
    level = next;
  }
}

async function scanHome(home: string): Promise<Scan> {
  const scan: Scan = { home, roots: [], apps: [], truncated: false, scannedAt: Date.now() };
  const deadline = Date.now() + TIME_BOX_MS;
  for (const name of ROOTS) {
    const root = await realpath(path.join(home, name)).catch(() => null);
    if (!root || !inside(home, root) || scan.roots.includes(root)) continue;
    scan.roots.push(root);
    await scanRoot(home, root, scan, deadline);
    if (scan.truncated) break;
  }
  return scan;
}

function projectFor(projects: Project[], folder: string): string | null {
  return projects.find((project) => !project.designSystemFor && project.imported?.sourcePath === folder)?.id ?? null;
}

export async function findApps(projects: Project[], options: { fresh?: boolean } = {}): Promise<FoundApps> {
  const home = await realpath(os.homedir());
  const hit = cache.get(home);
  const scan = hit && !options.fresh && Date.now() - hit.at < CACHE_MS ? hit.scan : await scanHome(home);
  if (scan !== hit?.scan) cache.set(home, { at: Date.now(), scan });
  return { ...scan, apps: scan.apps.map((app) => ({ ...app, projectId: projectFor(projects, app.path) })) };
}
