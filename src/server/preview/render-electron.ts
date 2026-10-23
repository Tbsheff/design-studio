import net from 'node:net';
import {
  RENDER_MESSAGE,
  RENDER_SOCKET_ENV,
  RENDER_TOKEN_ENV,
  isRenderResponse,
  type RenderOp,
  type RenderOps,
  type RenderRequest,
  type RenderResponse,
} from '../../shared/render-rpc.js';
import { NAVIGATION_TIMEOUT_MS, SETTLE_TIMEOUT_MS, type RenderBackend, type RenderPage } from './render-backend.js';

const OP_TIMEOUT_MS = 90_000;

interface Transport {
  send(request: RenderRequest): void;
  onResponse(handler: (response: RenderResponse) => void): void;
  close(): void;
}

function ipcTransport(): Transport {
  if (!process.send) throw new Error('electron render backend needs the app IPC channel');
  return {
    send: (request) => process.send?.(request),
    onResponse: (handler) => {
      process.on('message', (raw: unknown) => {
        if (isRenderResponse(raw)) handler(raw);
      });
    },
    close: () => undefined,
  };
}

function socketTransport(socketPath: string): Transport {
  const socket = net.connect(socketPath);
  socket.unref();
  let buffer = '';
  const handlers: ((response: RenderResponse) => void)[] = [];
  socket.setEncoding('utf8');
  socket.on('data', (chunk: string) => {
    buffer += chunk;
    let newline = buffer.indexOf('\n');
    while (newline >= 0) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      const parsed: unknown = JSON.parse(line);
      if (isRenderResponse(parsed)) for (const handler of handlers) handler(parsed);
      newline = buffer.indexOf('\n');
    }
  });
  return {
    send: (request) => socket.write(`${JSON.stringify(request)}\n`),
    onResponse: (handler) => handlers.push(handler),
    close: () => socket.destroy(),
  };
}

interface Pending {
  resolve(value: unknown): void;
  reject(error: Error): void;
  timer: NodeJS.Timeout;
}

function createClient(transport: Transport, token: string | undefined) {
  const pending = new Map<number, Pending>();
  let nextId = 1;
  transport.onResponse((response) => {
    const waiter = pending.get(response.id);
    if (!waiter) return;
    pending.delete(response.id);
    clearTimeout(waiter.timer);
    if (response.ok) waiter.resolve(response.value);
    else waiter.reject(new Error(response.error));
  });
  return function call<K extends RenderOp>(op: K, args: RenderOps[K]['args']): Promise<RenderOps[K]['result']> {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`render ${op} timed out after ${OP_TIMEOUT_MS} ms`));
      }, OP_TIMEOUT_MS);
      timer.unref();
      pending.set(id, { resolve: resolve as (value: unknown) => void, reject, timer });
      transport.send({ type: RENDER_MESSAGE, id, op, args, ...(token ? { token } : {}) });
    });
  };
}

export function createElectronBackend(env: NodeJS.ProcessEnv = process.env): RenderBackend {
  const socketPath = env[RENDER_SOCKET_ENV];
  const transport = socketPath ? socketTransport(socketPath) : ipcTransport();
  const call = createClient(transport, env[RENDER_TOKEN_ENV]);
  return {
    name: 'electron',
    async open(viewport): Promise<RenderPage> {
      const { pageId } = await call('open', viewport);
      return {
        goto: (url) => call('goto', { pageId, url, timeoutMs: NAVIGATION_TIMEOUT_MS, settleMs: SETTLE_TIMEOUT_MS }).then(() => undefined),
        evaluate: <T>(expression: string) => call('evaluate', { pageId, expression }) as Promise<T>,
        screenshot: (path, clip) => call('screenshot', { pageId, path, ...(clip ? { clip } : {}) }).then(() => undefined),
        errors: () => call('errors', { pageId }),
        close: () => call('close', { pageId }).then(() => undefined, () => undefined),
      };
    },
    async close() {
      transport.close();
    },
  };
}
