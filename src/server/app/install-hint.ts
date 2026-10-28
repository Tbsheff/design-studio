import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export type PackageManager = 'pnpm' | 'yarn' | 'bun' | 'npm';

export interface InstallHint {
  manager: PackageManager;
  dir: string;
  command: string;
}

const LOCKFILES: [string, PackageManager][] = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['bun.lockb', 'bun'],
  ['bun.lock', 'bun'],
  ['package-lock.json', 'npm'],
];

function lockManager(dir: string): PackageManager | null {
  return LOCKFILES.find(([file]) => existsSync(path.join(dir, file)))?.[1] ?? null;
}

function declaredManager(dir: string): PackageManager | null {
  try {
    const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')) as { packageManager?: unknown };
    const name = typeof pkg.packageManager === 'string' ? pkg.packageManager.split('@')[0] : '';
    return name === 'pnpm' || name === 'yarn' || name === 'bun' || name === 'npm' ? name : null;
  } catch {
    return null;
  }
}

export function installHint(root: string, appDir: string): InstallHint {
  const top = path.resolve(root);
  let dir = path.resolve(top, appDir);
  while (dir.startsWith(top)) {
    const manager = lockManager(dir);
    if (manager) return { manager, dir, command: `${manager} install` };
    if (dir === top) break;
    dir = path.dirname(dir);
  }
  const manager = declaredManager(top) ?? 'npm';
  return { manager, dir: top, command: `${manager} install` };
}
