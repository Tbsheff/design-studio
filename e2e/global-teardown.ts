import { stopRenderHost } from './support/render-host';
import { readState, stateExists, stopServer } from './support/server';

export default async function globalTeardown(): Promise<void> {
  if (!stateExists()) return;
  const state = readState();
  await stopServer(state.pid);
  if (state.renderHostPid) stopRenderHost(state.renderHostPid);
}
