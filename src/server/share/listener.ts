import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import { createAdaptorServer } from '@hono/node-server';
import type { Hono } from 'hono';
import type { ShareServerState } from '../../shared/share.js';
import type { ShareStore } from './store.js';

export interface ShareListener {
  sync(): Promise<ShareServerState>;
  setLan(on: boolean): Promise<ShareServerState>;
  state(): ShareServerState;
  stop(): Promise<void>;
}

const MAX_TIMER_MS = 2 ** 31 - 1;

export function lanAddress(): string | null {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const item of list ?? []) {
      if (item.family === 'IPv4' && !item.internal) return item.address;
    }
  }
  return null;
}

function listen(server: Server, port: number, host: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error): void => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = (): void => {
      server.off('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
    server.closeAllConnections?.();
  });
}

export function createShareListener(app: Hono, shares: ShareStore, preferredPort: number): ShareListener {
  let server: Server | null = null;
  let lan = false;
  let port: number | null = null;
  let timer: NodeJS.Timeout | null = null;
  let queue: Promise<unknown> = Promise.resolve();

  const state = (): ShareServerState => {
    const ip = lan ? lanAddress() : null;
    return { running: server !== null, lan, localUrl: port !== null && server ? `http://127.0.0.1:${port}` : null, lanUrl: server && lan && ip && port !== null ? `http://${ip}:${port}` : null };
  };

  const start = async (): Promise<void> => {
    const next = createAdaptorServer({ fetch: app.fetch }) as Server;
    const host = lan ? '0.0.0.0' : '127.0.0.1';
    try {
      await listen(next, port ?? preferredPort, host);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw error;
      await listen(next, 0, host);
    }
    port = (next.address() as AddressInfo).port;
    server = next;
  };

  const halt = async (): Promise<void> => {
    if (!server) return;
    const old = server;
    server = null;
    await close(old);
  };

  const schedule = async (): Promise<void> => {
    if (timer) clearTimeout(timer);
    timer = null;
    const at = await shares.nextExpiry();
    if (at === null) return;
    timer = setTimeout(() => void run(apply), Math.min(MAX_TIMER_MS, Math.max(1000, at - Date.now() + 500)));
    timer.unref();
  };

  const apply = async (): Promise<ShareServerState> => {
    const live = await shares.activeCount();
    if (live === 0) {
      await halt();
      lan = false;
    } else if (!server) await start();
    await schedule();
    return state();
  };

  const run = <T>(task: () => Promise<T>): Promise<T> => {
    const next = queue.then(task, task);
    queue = next.catch(() => undefined);
    return next;
  };

  return {
    sync: () => run(apply),
    setLan: (on) =>
      run(async () => {
        if (on === lan) return apply();
        lan = on;
        await halt();
        return apply();
      }),
    state,
    stop: () =>
      run(async () => {
        if (timer) clearTimeout(timer);
        await halt();
      }),
  };
}
