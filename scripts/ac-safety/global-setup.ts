import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startE2eRenderer, stopRenderHost } from '../../e2e/support/render-host';
import { ROOT, readState, startServer, stateExists, stopServer, writeState } from '../../e2e/support/server';

export default async function globalSetup(): Promise<void> {
  if (stateExists()) {
    const previous = readState();
    await stopServer(previous.pid).catch(() => undefined);
    if (previous.renderHostPid) stopRenderHost(previous.renderHostPid);
  }
  if (!existsSync(path.join(ROOT, 'dist', 'ui', 'index.html'))) execFileSync('npm', ['run', 'build:ui'], { cwd: ROOT, stdio: 'inherit' });
  const renderHostPid = await startE2eRenderer();
  const workDir = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'studio ac safety ')));
  const dataDir = path.join(workDir, 'data');
  const { pid, listenMs } = await startServer(dataDir);
  console.log(`[ac-safety] studio server pid ${pid} answered after ${listenMs}ms, data ${dataDir}`);
  writeState({ dataDir, workDir, pid, ...(renderHostPid ? { renderHostPid } : {}) });
}
