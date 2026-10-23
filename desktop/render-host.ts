import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { app } from 'electron';
import { RENDER_SOCKET_ENV, RENDER_TOKEN_ENV } from '../src/shared/render-rpc.js';
import { RenderPool } from './render-pool.js';
import { listenSocket, RenderHost } from './render-rpc-host.js';

export const RENDER_HOST_READY = 'studio render host ready';

app.commandLine.appendSwitch('force-color-profile', 'srgb');
app.dock?.hide();

async function start(): Promise<void> {
  await app.whenReady();
  const dir = mkdtempSync(path.join(os.tmpdir(), 'studio-render-'));
  const socketPath = process.env[RENDER_SOCKET_ENV] || path.join(dir, 'render.sock');
  const token = process.env[RENDER_TOKEN_ENV] || randomBytes(24).toString('hex');
  const pool = new RenderPool();
  const host = new RenderHost(pool);
  await listenSocket(host, socketPath, token);
  console.log(`${RENDER_HOST_READY} ${JSON.stringify({ socket: socketPath, token })}`);
  const stop = () => {
    pool.destroy();
    app.exit(0);
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  if (process.env.STUDIO_RENDER_HOST_STDIN === '1') {
    process.stdin.on('end', stop);
    process.stdin.resume();
  }
}

app.on('window-all-closed', () => undefined);
start().catch((error: unknown) => {
  console.error('[render-host] failed', error);
  app.exit(1);
});
