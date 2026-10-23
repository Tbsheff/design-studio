import { existsSync } from 'node:fs';
import path from 'node:path';

export function resourcesDir(env: NodeJS.ProcessEnv = process.env): string | null {
  const raw = env.STUDIO_RESOURCES_DIR;
  return raw ? path.resolve(raw) : null;
}

export function resourcePath(relative: string, devPath: string): string {
  const root = resourcesDir();
  return root ? path.join(root, relative) : devPath;
}

export function packagedResource(relative: string): string | null {
  const root = resourcesDir();
  if (!root) return null;
  const file = path.join(root, relative);
  return existsSync(file) ? file : null;
}
