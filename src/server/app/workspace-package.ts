import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import type { PackageManager } from './install-hint.js';

export interface WorkspacePackage {
  name: string;
  dir: string;
  built: boolean;
  hasBuild: boolean;
}

interface Manifest {
  name?: unknown;
  main?: unknown;
  exports?: unknown;
  scripts?: Record<string, unknown>;
}

const SEARCH_DIRS = ['packages', 'apps', 'libs', 'tooling'];

function readManifest(dir: string): Manifest | null {
  try {
    return JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')) as Manifest;
  } catch {
    return null;
  }
}

function inTree(root: string, dir: string): boolean {
  const relative = path.relative(root, dir);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative) && !relative.split(path.sep).includes('node_modules');
}

function linked(workTree: string, appRoot: string, name: string): string | null {
  for (const base of [appRoot, workTree]) {
    try {
      const real = realpathSync(path.join(base, 'node_modules', name));
      if (inTree(realpathSync(workTree), real)) return real;
    } catch {
      continue;
    }
  }
  return null;
}

function scanned(workTree: string, name: string): string | null {
  for (const top of SEARCH_DIRS) {
    let entries: string[] = [];
    try {
      entries = readdirSync(path.join(workTree, top));
    } catch {
      continue;
    }
    const hit = entries.map((entry) => path.join(workTree, top, entry)).find((dir) => readManifest(dir)?.name === name);
    if (hit) return hit;
  }
  return null;
}

function targets(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (value && typeof value === 'object') for (const item of Object.values(value)) targets(item, out);
  return out;
}

function exportFor(manifest: Manifest, subpath: string): unknown {
  const map = manifest.exports;
  if (subpath === '.' && (typeof map === 'string' || map === undefined)) return map ?? manifest.main;
  return map && typeof map === 'object' ? (map as Record<string, unknown>)[subpath] : undefined;
}

export function findWorkspacePackage(workTree: string, appRoot: string, specifier: string): WorkspacePackage | null {
  const parts = specifier.split('/');
  const name = parts.slice(0, specifier.startsWith('@') ? 2 : 1).join('/');
  const dir = linked(workTree, appRoot, name) ?? scanned(workTree, name);
  const manifest = dir ? readManifest(dir) : null;
  if (!dir || !manifest) return null;
  const rest = parts.slice(specifier.startsWith('@') ? 2 : 1).join('/');
  const files = targets(exportFor(manifest, rest ? `./${rest}` : '.')).filter((file) => !file.endsWith('.d.ts'));
  const built = files.length === 0 || files.every((file) => existsSync(path.join(dir, file)));
  return { name, dir, built, hasBuild: typeof manifest.scripts?.build === 'string' };
}

export function buildCommand(manager: PackageManager, name: string): string {
  if (manager === 'pnpm') return `pnpm --filter ${name} build`;
  if (manager === 'yarn') return `yarn workspace ${name} build`;
  if (manager === 'bun') return `bun run --filter ${name} build`;
  return `npm run build -w ${name}`;
}
