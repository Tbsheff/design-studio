import { existsSync } from 'node:fs';
import path from 'node:path';
import { frameworkOf, readPackage, workspaceGlobs } from './detect.js';

const MAX_LEVELS_UP = 6;
const TURBO_ONLY_GLOBS = ['apps/*', 'packages/*'];

export interface WorkspaceRoot {
  root: string;
  appDir: string;
  name: string;
}

export function hasWorkspaceMarker(dir: string): boolean {
  return existsSync(path.join(dir, 'pnpm-workspace.yaml')) || existsSync(path.join(dir, 'turbo.json'));
}

function globPattern(glob: string): RegExp {
  const clean = glob.replace(/^\.\//, '').replace(/\/+$/, '');
  const body = clean
    .split('/')
    .map((part) => (part === '**' ? '.*' : part.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')))
    .join('/');
  return new RegExp(`^${body}$`);
}

function isMember(rel: string, globs: string[]): boolean {
  const include = globs.filter((glob) => !glob.startsWith('!'));
  const exclude = globs.filter((glob) => glob.startsWith('!')).map((glob) => glob.slice(1));
  return include.some((glob) => globPattern(glob).test(rel)) && !exclude.some((glob) => globPattern(glob).test(rel));
}

async function rootAt(dir: string, folder: string): Promise<WorkspaceRoot | null | 'none'> {
  const pkg = await readPackage(dir);
  const globs = await workspaceGlobs(dir, pkg);
  if (globs === null && !existsSync(path.join(dir, 'turbo.json'))) return 'none';
  const rel = path.relative(dir, folder).split(path.sep).join('/');
  if (!isMember(rel, globs ?? TURBO_ONLY_GLOBS)) return null;
  return { root: dir, appDir: rel, name: typeof pkg?.name === 'string' && pkg.name ? pkg.name : path.basename(dir) };
}

export async function findWorkspaceRoot(folder: string): Promise<WorkspaceRoot | null> {
  const home = process.env.HOME ? path.resolve(process.env.HOME) : null;
  let dir = path.dirname(folder);
  for (let up = 0; up < MAX_LEVELS_UP; up += 1) {
    if (dir === home || dir === path.dirname(dir)) return null;
    const found = await rootAt(dir, folder);
    if (found !== 'none') return found;
    if (existsSync(path.join(dir, '.git'))) return null;
    dir = path.dirname(dir);
  }
  return null;
}

export async function nextAppWorkspace(folder: string): Promise<WorkspaceRoot | null> {
  if (frameworkOf(await readPackage(folder)) !== 'next') return null;
  return findWorkspaceRoot(folder);
}
