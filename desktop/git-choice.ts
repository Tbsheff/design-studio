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

function systemGit(): GitChoice {
  return { kind: 'system', binary: SYSTEM_GIT, env: { STUDIO_GIT: SYSTEM_GIT } };
}

export async function chooseGit(gitDir: string, forced: string | undefined): Promise<GitChoice> {
  if (forced === 'bundled' || forced === 'dugite') return bundledGit(gitDir);
  if (forced !== 'system' && !(await developerDir())) return bundledGit(gitDir);
  return systemGit();
}
