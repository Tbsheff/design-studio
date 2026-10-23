import path from 'node:path';
import { _electron as electron, type ElectronApplication } from '@playwright/test';
import { ROOT } from './server';
import { writeSkillsFixture } from './skills-fixture';

export const PACKAGED_EXECUTABLE = process.env.STUDIO_DESKTOP_EXECUTABLE ?? '';
export const APP_BINARY = PACKAGED_EXECUTABLE ? 'Contents/MacOS/Design Studio' : 'Electron.app/Contents/MacOS/Electron';
export const SERVER_MARKER = PACKAGED_EXECUTABLE ? 'server/index.js' : 'src/server/index.ts';

export function desktopEnv(work: string, extra: Record<string, string> = {}): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) if (value !== undefined) env[key] = value;
  delete env.ELECTRON_RUN_AS_NODE;
  const claudeHome = path.join(work, 'claude-home');
  writeSkillsFixture(claudeHome);
  return {
    ...env,
    STUDIO_AGENT: 'mock',
    STUDIO_DATA_DIR: path.join(work, 'data'),
    STUDIO_CLAUDE_HOME: claudeHome,
    STUDIO_DESKTOP_USER_DATA: path.join(work, 'user-data'),
    STUDIO_DESKTOP_SETUP: 'skip',
    ...extra,
  };
}

export function launchDesktop(env: Record<string, string>): Promise<ElectronApplication> {
  if (PACKAGED_EXECUTABLE) return electron.launch({ executablePath: PACKAGED_EXECUTABLE, args: [], env, timeout: 120_000 });
  return electron.launch({ args: ['.'], cwd: ROOT, env, timeout: 120_000 });
}
