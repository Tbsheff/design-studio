import { RENDER_BACKEND_ENV, RENDER_IPC_ENV, RENDER_SOCKET_ENV, type RenderBackendName, type RenderClip, type RenderErrors } from '../../shared/render-rpc.js';

export interface RenderPage {
  goto(url: string): Promise<void>;
  evaluate<T>(expression: string): Promise<T>;
  screenshot(outPath: string, clip?: RenderClip): Promise<void>;
  errors(): Promise<RenderErrors>;
  close(): Promise<void>;
}

export interface RenderBackend {
  readonly name: RenderBackendName;
  open(viewport: { width: number; height: number }): Promise<RenderPage>;
  close(): Promise<void>;
}

export const NAVIGATION_TIMEOUT_MS = 30_000;
export const SETTLE_TIMEOUT_MS = 5_000;

export function chooseBackend(env: NodeJS.ProcessEnv = process.env): RenderBackendName {
  const forced = env[RENDER_BACKEND_ENV];
  if (forced === 'playwright' || forced === 'electron') return forced;
  if (forced) throw new Error(`${RENDER_BACKEND_ENV} must be "playwright" or "electron", got "${forced}"`);
  return env[RENDER_IPC_ENV] === '1' || env[RENDER_SOCKET_ENV] ? 'electron' : 'playwright';
}

export async function createRenderBackend(env: NodeJS.ProcessEnv = process.env): Promise<RenderBackend> {
  if (chooseBackend(env) === 'electron') {
    const { createElectronBackend } = await import('./render-electron.js');
    return createElectronBackend(env);
  }
  const { createPlaywrightBackend } = await import('./render-playwright.js');
  return createPlaywrightBackend();
}
