import { execFileSync } from 'node:child_process';
import { mkdtempSync, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT, readState, startServer, stateExists, stopServer, writeState } from './support/server';
import { startE2eRenderer, stopRenderHost } from './support/render-host';

export default async function globalSetup(): Promise<void> {
  if (stateExists()) {
    const previous = readState();
    await stopServer(previous.pid).catch(() => undefined);
    if (previous.renderHostPid) stopRenderHost(previous.renderHostPid);
  }
  execFileSync('npm', ['run', 'build:ui'], { cwd: ROOT, stdio: 'inherit' });
  const renderHostPid = await startE2eRenderer();
  const workDir = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'studio e2e ')));
  const dataDir = path.join(workDir, 'data');
  const { pid, listenMs } = await startServer(dataDir);
  console.log(`[e2e] studio server pid ${pid} answered after ${listenMs}ms, data ${dataDir}`);
  writeState({ dataDir, workDir, pid, ...(renderHostPid ? { renderHostPid } : {}) });
}
