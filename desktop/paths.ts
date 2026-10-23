import path from 'node:path';
import { pathToFileURL } from 'node:url';

export interface AppLayout {
  packaged: boolean;
  ownDir: string;
  serverCwd: string;
  serverArgs: string[];
  resourcesDir: string | null;
  modulesDir: string;
}

export function devLayout(ownDir: string): AppLayout {
  const repoRoot = path.resolve(ownDir, '..', '..');
  const loader = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'loader.mjs');
  return {
    packaged: false,
    ownDir,
    serverCwd: repoRoot,
    serverArgs: ['--import', pathToFileURL(loader).href, path.join(repoRoot, 'src', 'server', 'index.ts')],
    resourcesDir: null,
    modulesDir: path.join(repoRoot, 'node_modules'),
  };
}

export function packagedLayout(ownDir: string, resourcesPath: string): AppLayout {
  const serverDir = path.join(resourcesPath, 'server');
  return {
    packaged: true,
    ownDir,
    serverCwd: serverDir,
    serverArgs: [path.join(serverDir, 'index.js')],
    resourcesDir: resourcesPath,
    modulesDir: path.join(serverDir, 'node_modules'),
  };
}

export function repoDataDir(layout: AppLayout): string {
  return path.join(layout.serverCwd, 'studio-data');
}

export function claudeBinary(layout: AppLayout, arch: string = process.arch): string {
  return path.join(layout.modulesDir, '@anthropic-ai', `claude-agent-sdk-darwin-${arch}`, 'claude');
}

export function dugiteDir(layout: AppLayout): string {
  return layout.resourcesDir ? path.join(layout.resourcesDir, 'git') : path.join(layout.modulesDir, 'dugite', 'git');
}
