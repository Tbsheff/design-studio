import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker, type Transferable } from 'node:worker_threads';
import { REPO_ROOT } from './config.js';
import type { WorkerReply, WorkerRequest } from './worker-serve.js';

const TSX_LOADER = path.join(REPO_ROOT, 'node_modules', 'tsx', 'dist', 'loader.mjs');
const MAX_FAILURES = 3;

interface Pending<R> {
  resolve: (value: R) => void;
  reject: (error: Error) => void;
}

export function siblingWorkerFile(moduleUrl: string, name: string): string {
  const own = fileURLToPath(moduleUrl);
  return path.join(path.dirname(own), `${name}${path.extname(own)}`);
}

export class WorkerClient<Q, R> {
  private worker: Worker | null = null;
  private readonly pending = new Map<number, Pending<R>>();
  private nextId = 1;
  private failures = 0;
  private idleTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly options: {
      file: string;
      label: string;
      workerData?: unknown;
      inProcess: (request: Q) => Promise<R>;
      idleMs?: number;
    },
  ) {}

  run(request: Q, transfer: Transferable[] = []): Promise<R> {
    const worker = this.failures >= MAX_FAILURES ? null : this.spawn();
    if (!worker) return this.options.inProcess(request);
    const id = this.nextId++;
    this.clearIdle();
    return new Promise<R>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      worker.ref();
      worker.postMessage({ id, request } satisfies WorkerRequest<Q>, transfer);
    });
  }

  get started(): boolean {
    return this.worker !== null || this.failures >= MAX_FAILURES;
  }

  async close(): Promise<void> {
    const worker = this.worker;
    this.worker = null;
    this.clearIdle();
    if (worker) await worker.terminate();
  }

  private spawn(): Worker | null {
    if (this.worker) return this.worker;
    try {
      const execArgv = this.options.file.endsWith('.ts') ? ['--import', pathToFileURL(TSX_LOADER).href] : [];
      const worker = new Worker(this.options.file, { workerData: this.options.workerData, execArgv });
      worker.unref();
      worker.on('message', (reply: WorkerReply<R>) => this.settle(reply));
      worker.on('error', (error) => this.fail(worker, error));
      worker.on('exit', (code) => this.fail(worker, new Error(`${this.options.label} worker exited with code ${code}`)));
      this.worker = worker;
      return worker;
    } catch (error) {
      console.error(`[${this.options.label}] worker did not start; running in process`, error);
      this.failures = MAX_FAILURES;
      return null;
    }
  }

  private settle(reply: WorkerReply<R>): void {
    if (typeof reply !== 'object' || reply === null || !('id' in reply)) return;
    const waiting = this.pending.get(reply.id);
    if (!waiting) return;
    this.pending.delete(reply.id);
    if (this.pending.size === 0) this.rest();
    if ('error' in reply) waiting.reject(new Error(reply.error));
    else waiting.resolve(reply.result);
  }

  private rest(): void {
    const worker = this.worker;
    worker?.unref();
    const idleMs = this.options.idleMs;
    if (!worker || idleMs === undefined) return;
    this.idleTimer = setTimeout(() => {
      this.idleTimer = null;
      if (this.worker !== worker || this.pending.size > 0) return;
      this.worker = null;
      void worker.terminate();
    }, idleMs);
    this.idleTimer.unref();
  }

  private clearIdle(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }

  private fail(worker: Worker, error: Error): void {
    if (this.worker !== worker) return;
    this.worker = null;
    this.failures += 1;
    if (this.failures >= MAX_FAILURES) console.error(`[${this.options.label}] worker failed ${this.failures} times; running in process`, error);
    const waiting = [...this.pending.values()];
    this.pending.clear();
    for (const item of waiting) item.reject(error);
  }
}
