import { existsSync, readFileSync } from 'node:fs';
import { stopRenderHost } from '../../e2e/support/render-host';
import { stopServer } from '../../e2e/support/server';
import { BACKUP_STATE, killListeners } from './ports';

export default async function globalTeardown(): Promise<void> {
  if (!existsSync(BACKUP_STATE)) return;
  const state = JSON.parse(readFileSync(BACKUP_STATE, 'utf8')) as { pid: number; ports: number[]; renderHostPid?: number };
  await stopServer(state.pid).catch(() => undefined);
  await killListeners(state.ports);
  if (state.renderHostPid) stopRenderHost(state.renderHostPid);
}
