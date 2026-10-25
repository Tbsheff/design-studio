export const RENDER_MESSAGE = 'studio-render';
export const RENDER_BACKEND_ENV = 'STUDIO_RENDER_BACKEND';
export const RENDER_IPC_ENV = 'STUDIO_RENDER_IPC';
export const RENDER_SOCKET_ENV = 'STUDIO_RENDER_SOCKET';
export const RENDER_TOKEN_ENV = 'STUDIO_RENDER_TOKEN';

export type RenderBackendName = 'playwright' | 'electron';

export interface RenderClip {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RenderErrors {
  consoleErrors: string[];
  pageErrors: string[];
}

export interface RenderOps {
  open: { args: { width: number; height: number; scale?: number }; result: { pageId: string } };
  goto: { args: { pageId: string; url: string; timeoutMs: number; settleMs: number }; result: null };
  evaluate: { args: { pageId: string; expression: string }; result: unknown };
  screenshot: { args: { pageId: string; path: string; clip?: RenderClip }; result: { width: number; height: number } };
  errors: { args: { pageId: string }; result: RenderErrors };
  close: { args: { pageId: string }; result: null };
}

export type RenderOp = keyof RenderOps;

export interface RenderRequest<K extends RenderOp = RenderOp> {
  type: typeof RENDER_MESSAGE;
  id: number;
  token?: string;
  op: K;
  args: RenderOps[K]['args'];
}

export type RenderResponse = { type: typeof RENDER_MESSAGE; id: number; ok: true; value: unknown } | { type: typeof RENDER_MESSAGE; id: number; ok: false; error: string };

const RENDER_OPS: readonly RenderOp[] = ['open', 'goto', 'evaluate', 'screenshot', 'errors', 'close'];

export function isRenderRequest(value: unknown): value is RenderRequest {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Partial<RenderRequest>;
  return record.type === RENDER_MESSAGE && Number.isInteger(record.id) && RENDER_OPS.includes(record.op as RenderOp) && typeof record.args === 'object' && record.args !== null;
}

export function isRenderResponse(value: unknown): value is RenderResponse {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Partial<RenderResponse>;
  return record.type === RENDER_MESSAGE && Number.isInteger(record.id) && typeof record.ok === 'boolean';
}
