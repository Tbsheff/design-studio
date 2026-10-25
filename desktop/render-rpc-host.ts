import type { ChildProcess } from 'node:child_process';
import { timingSafeEqual } from 'node:crypto';
import { chmodSync, rmSync } from 'node:fs';
import net from 'node:net';
import { isRenderRequest, RENDER_MESSAGE, type RenderOps, type RenderRequest, type RenderResponse } from '../src/shared/render-rpc.js';
import type { PageState, RenderPool } from './render-pool.js';

export class RenderHost {
  private readonly pages = new Map<string, PageState>();
  private nextPage = 1;

  constructor(private readonly pool: RenderPool) {}

  private page(pageId: string): PageState {
    const state = this.pages.get(pageId);
    if (!state) throw new Error(`unknown render page ${pageId}`);
    return state;
  }

  private async open(args: RenderOps['open']['args']): Promise<RenderOps['open']['result']> {
    const state = await this.pool.open(args.width, args.height, args.scale);
    const pageId = `p${this.nextPage++}`;
    this.pages.set(pageId, state);
    return { pageId };
  }

  private async closePage(pageId: string): Promise<null> {
    const state = this.pages.get(pageId);
    this.pages.delete(pageId);
    if (state) await this.pool.close(state);
    return null;
  }

  private async dispatch(request: RenderRequest): Promise<unknown> {
    const args = request.args as Record<string, unknown> & { pageId: string };
    if (request.op === 'open') return this.open(request.args as RenderOps['open']['args']);
    if (request.op === 'close') return this.closePage(args.pageId);
    const state = this.page(args.pageId);
    if (request.op === 'goto') {
      const goto = request.args as RenderOps['goto']['args'];
      await this.pool.goto(state, goto.url, goto.timeoutMs, goto.settleMs);
      return null;
    }
    if (request.op === 'evaluate') return this.pool.evaluate(state, (request.args as RenderOps['evaluate']['args']).expression);
    if (request.op === 'screenshot') {
      const shot = request.args as RenderOps['screenshot']['args'];
      return this.pool.screenshot(state, shot.path, shot.clip);
    }
    return { consoleErrors: [...state.errors.consoleErrors], pageErrors: [...state.errors.pageErrors] };
  }

  async handle(request: RenderRequest): Promise<RenderResponse> {
    try {
      return { type: RENDER_MESSAGE, id: request.id, ok: true, value: await this.dispatch(request) };
    } catch (error) {
      return { type: RENDER_MESSAGE, id: request.id, ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async closeAll(): Promise<void> {
    await Promise.all([...this.pages.keys()].map((pageId) => this.closePage(pageId)));
  }
}

export function serveChild(host: RenderHost, child: ChildProcess): void {
  child.on('message', (raw: unknown) => {
    if (!isRenderRequest(raw)) return;
    void host.handle(raw).then((response) => {
      if (child.connected) child.send(response);
    });
  });
}

function tokenMatches(expected: string, given: string | undefined): boolean {
  if (!given || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

function parseLine(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function serveSocket(host: RenderHost, socket: net.Socket, token: string): void {
  let buffer = '';
  socket.setEncoding('utf8');
  socket.on('error', () => socket.destroy());
  socket.on('data', (chunk: string) => {
    buffer += chunk;
    let newline = buffer.indexOf('\n');
    while (newline >= 0) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      const parsed = parseLine(line);
      if (!isRenderRequest(parsed) || !tokenMatches(token, parsed.token)) {
        socket.destroy();
        return;
      }
      void host.handle(parsed).then((response) => {
        if (!socket.destroyed) socket.write(`${JSON.stringify(response)}\n`);
      });
      newline = buffer.indexOf('\n');
    }
  });
}

export function listenSocket(host: RenderHost, socketPath: string, token: string): Promise<net.Server> {
  rmSync(socketPath, { force: true });
  const server = net.createServer((socket) => serveSocket(host, socket, token));
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(socketPath, () => {
      chmodSync(socketPath, 0o600);
      resolve(server);
    });
  });
}
