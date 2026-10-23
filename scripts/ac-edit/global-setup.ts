import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PREVIEW_PORT, ROOT, STUDIO_PORT, VITE_PORT_BASE, startServer, writeState } from '../../e2e/support/server';
import { startE2eRenderer } from '../../e2e/support/render-host';
import { BACKUP_STATE, killListeners } from './ports';

export default async function globalSetup(): Promise<void> {
  if (!existsSync(path.join(ROOT, 'dist', 'ui', 'index.html'))) throw new Error('dist/ui/index.html missing; run npm run build:ui once');
  const ports = [STUDIO_PORT, PREVIEW_PORT, ...Array.from({ length: 10 }, (_, index) => VITE_PORT_BASE + index)];
  await killListeners(ports);
  const renderHostPid = await startE2eRenderer();
  const workDir = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'studio ac edit ')));
  const dataDir = path.join(workDir, 'data');
  const { pid, listenMs } = await startServer(dataDir);
  const owner = execFileSync('lsof', ['-nP', `-iTCP:${STUDIO_PORT}`, '-sTCP:LISTEN', '-t'], { encoding: 'utf8' }).trim();
  console.log(`[ac-edit] studio server pid ${pid} (listener ${owner}) answered after ${listenMs}ms, data ${dataDir}`);
  const state = { dataDir, workDir, pid, ...(renderHostPid ? { renderHostPid } : {}) };
  writeState(state);
  writeFileSync(BACKUP_STATE, JSON.stringify({ ...state, ports }, null, 2));
}
