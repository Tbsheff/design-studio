import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import type { AppCandidate, AppFramework } from '../../shared/contracts.js';

const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies'] as const;
const DEFAULT_WORKSPACE_GLOBS = ['apps/*'];
const MAX_WORKSPACE_DIRS = 200;

export async function readPackage(dir: string): Promise<Record<string, unknown> | null> {
  try {
    const parsed = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8')) as unknown;
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function hasDependency(pkg: Record<string, unknown>, name: string): boolean {
  return DEP_FIELDS.some((field) => {
    const deps = pkg[field];
    return typeof deps === 'object' && deps !== null && name in deps;
  });
}

export function frameworkOf(pkg: Record<string, unknown> | null): AppFramework | null {
  if (!pkg) return null;
  if (hasDependency(pkg, 'next')) return 'next';
  if (hasDependency(pkg, 'vite')) return 'vite';
  return null;
}

function globsFromPnpmWorkspace(text: string): string[] {
  const globs: string[] = [];
  let inPackages = false;
  for (const line of text.split('\n')) {
    if (/^packages\s*:/.test(line)) {
      inPackages = true;
      continue;
    }
    if (inPackages && /^\S/.test(line)) break;
    const match = inPackages ? /^\s*-\s*['"]?([^'"#]+?)['"]?\s*(#.*)?$/.exec(line) : null;
    if (match?.[1]) globs.push(match[1].trim());
  }
  return globs;
}

export async function workspaceGlobs(root: string, pkg: Record<string, unknown> | null): Promise<string[] | null> {
  const pnpmFile = path.join(root, 'pnpm-workspace.yaml');
  if (existsSync(pnpmFile)) return globsFromPnpmWorkspace(await readFile(pnpmFile, 'utf8'));
  const workspaces = pkg?.workspaces;
  if (Array.isArray(workspaces)) return workspaces.filter((entry): entry is string => typeof entry === 'string');
  if (typeof workspaces === 'object' && workspaces !== null && Array.isArray((workspaces as { packages?: unknown }).packages)) {
    return ((workspaces as { packages: unknown[] }).packages).filter((entry): entry is string => typeof entry === 'string');
  }
  return null;
}

async function dirsOfGlob(root: string, glob: string): Promise<string[]> {
  const clean = glob.replace(/^\.\//, '').replace(/\/+$/, '');
  if (clean.startsWith('!') || clean.includes('..') || path.isAbsolute(clean)) return [];
  if (!clean.endsWith('/*')) return clean.includes('*') ? [] : [clean];
  const parent = clean.slice(0, -2);
  if (parent.includes('*')) return [];
  const entries = await readdir(path.join(root, parent), { withFileTypes: true }).catch(() => []);
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.')).map((entry) => `${parent}/${entry.name}`);
}

export interface AppDetection {
  framework: AppFramework | null;
  appDir: string | null;
  candidates: AppCandidate[];
}

async function workspaceDirs(root: string, rootPkg: Record<string, unknown> | null): Promise<string[]> {
  const globs = (await workspaceGlobs(root, rootPkg)) ?? (existsSync(path.join(root, 'apps')) ? DEFAULT_WORKSPACE_GLOBS : []);
  const dirs = new Set<string>();
  for (const glob of globs) for (const dir of await dirsOfGlob(root, glob)) if (dirs.size < MAX_WORKSPACE_DIRS) dirs.add(dir);
  return [...dirs].sort();
}

async function nextCandidate(root: string, dir: string): Promise<AppCandidate | null> {
  const pkg = await readPackage(path.join(root, dir));
  if (frameworkOf(pkg) !== 'next') return null;
  if (!existsSync(path.join(root, dir, 'app')) && !existsSync(path.join(root, dir, 'src', 'app'))) return null;
  return { appDir: dir, name: String(pkg?.name ?? path.basename(dir)), framework: 'next' };
}

export async function detectApp(root: string): Promise<AppDetection> {
  const rootPkg = await readPackage(root);
  const rootFramework = frameworkOf(rootPkg);
  if (rootFramework === 'next') return { framework: 'next', appDir: '.', candidates: [{ appDir: '.', name: String(rootPkg?.name ?? path.basename(root)), framework: 'next' }] };
  const found = await Promise.all((await workspaceDirs(root, rootPkg)).map((dir) => nextCandidate(root, dir)));
  const candidates = found.filter((candidate): candidate is AppCandidate => candidate !== null);
  const [only] = candidates;
  if (candidates.length === 1 && only) return { framework: 'next', appDir: only.appDir, candidates };
  if (candidates.length > 1) return { framework: 'next', appDir: null, candidates };
  return { framework: rootFramework, appDir: rootFramework ? '.' : null, candidates: [] };
}

export function cleanAppDir(raw: string): string | null {
  const clean = raw.trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
  if (clean === '' || clean === '.') return '.';
  if (path.isAbsolute(clean) || clean.split('/').some((part) => part === '..' || part === '' || part === '.git' || part === 'node_modules')) return null;
  return clean;
}
