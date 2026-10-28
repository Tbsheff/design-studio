import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

export type GitKind = 'system' | 'bundled' | 'missing';

export interface GitChoice {
  kind: GitKind;
  binary: string | null;
  env: Record<string, string>;
}

export const FORCE_GIT_ENV = 'STUDIO_DESKTOP_GIT';
const SYSTEM_GIT = '/usr/bin/git';
const XCODE_SELECT_TIMEOUT_MS = 5000;

export function developerDir(): Promise<string | null> {
  return new Promise((resolve) => {
    execFile('/usr/bin/xcode-select', ['-p'], { timeout: XCODE_SELECT_TIMEOUT_MS }, (error, stdout) => {
      const dir = error ? '' : String(stdout).trim();
      resolve(dir !== '' && existsSync(dir) ? dir : null);
    });
  });
}

export function bundledGit(gitDir: string): GitChoice {
  const binary = path.join(gitDir, 'bin', 'git');
  if (!existsSync(binary)) return { kind: 'missing', binary: null, env: {} };
  return {
    kind: 'bundled',
    binary,
    env: {
      STUDIO_GIT: binary,
      GIT_EXEC_PATH: path.join(gitDir, 'libexec', 'git-core'),
      GIT_TEMPLATE_DIR: path.join(gitDir, 'share', 'git-core', 'templates'),
    },
  };
}

function xcrunGit(): Promise<string | null> {
  return new Promise((resolve) => {
    execFile('/usr/bin/xcrun', ['--find', 'git'], { timeout: XCODE_SELECT_TIMEOUT_MS }, (error, stdout) => {
      const found = error ? '' : String(stdout).trim();
      resolve(found !== '' && found !== SYSTEM_GIT && existsSync(found) ? found : null);
    });
  });
}

async function gitBehindXcrunShim(devDir: string | null): Promise<string> {
  const direct = devDir ? path.join(devDir, 'usr', 'bin', 'git') : null;
  if (direct && existsSync(direct)) return direct;
  return (await xcrunGit()) ?? SYSTEM_GIT;
}

function systemGit(binary: string): GitChoice {
  return { kind: 'system', binary, env: { STUDIO_GIT: binary } };
}

export async function chooseGit(gitDir: string, forced: string | undefined): Promise<GitChoice> {
  if (forced === 'bundled' || forced === 'dugite') return bundledGit(gitDir);
  const devDir = await developerDir();
  if (forced !== 'system' && !devDir) return bundledGit(gitDir);
  return systemGit(await gitBehindXcrunShim(devDir));
}
