import { once } from "node:events";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";
import type { Transferable } from "node:worker_threads";

import { REPO_ROOT } from "../config/index.js";

type WorkerReply<Reply> =
  | { id: number; result: Reply }
  | { id: number; error: string };

interface WorkerRequest<Query> {
  id: number;
  request: Query;
}

interface WorkerClientOptions<Query, Reply> {
  file: string;
  label: string;
  workerData?: unknown;
  inProcess: (request: Query) => Promise<Reply>;
  idleMs?: number;
}

const TSX_LOADER = path.join(
  REPO_ROOT,
  "node_modules",
  "tsx",
  "dist",
  "loader.mjs"
);

const MAX_FAILURES = 3;
const SETTLED = "settled";

const siblingWorkerFile = (moduleUrl: string, name: string): string => {
  const own = fileURLToPath(moduleUrl);

  return path.join(path.dirname(own), `${name}${path.extname(own)}`);
};

const workerArgs = (file: string): string[] => {
  if (!file.endsWith(".ts")) {
    return [];
  }

  return ["--import", pathToFileURL(TSX_LOADER).href];
};

type Outcome<Reply> = { result: Reply } | { error: Error };

type SettledEvent<Reply> = Event & { outcome: Outcome<Reply> };

const settledEvent = <Reply>(outcome: Outcome<Reply>): SettledEvent<Reply> =>
  Object.assign(new Event(SETTLED), { outcome });

const awaitReply = async <Reply>(signal: EventTarget): Promise<Reply> => {
  const [event] = (await once(signal, SETTLED)) as [SettledEvent<Reply>];
  const { outcome } = event;

  if ("error" in outcome) {
    throw outcome.error;
  }

  return outcome.result;
};

class WorkerClient<Query, Reply> {
  private worker: Worker | null = null;
  private readonly pending = new Map<number, EventTarget>();
  private nextId = 1;
  private failures = 0;
  private idleTimer: NodeJS.Timeout | null = null;
  private readonly options: WorkerClientOptions<Query, Reply>;

  public constructor(options: WorkerClientOptions<Query, Reply>) {
    this.options = options;
  }

  public run(request: Query, transfer: Transferable[] = []): Promise<Reply> {
    const worker = this.available();

    if (!worker) {
      return this.options.inProcess(request);
    }

    const id = this.nextId;

    this.nextId += 1;
    this.clearIdle();

    const signal = new EventTarget();
    const reply = awaitReply<Reply>(signal);

    this.pending.set(id, signal);
    worker.ref();

    try {
      worker.postMessage(
        { id, request } satisfies WorkerRequest<Query>,
        transfer
      );
    } catch (error) {
      this.pending.delete(id);

      return Promise.reject(error);
    }

    return reply;
  }

  public get started(): boolean {
    return this.worker !== null || this.failures >= MAX_FAILURES;
  }

  public async close(): Promise<void> {
    const { worker } = this;

    this.worker = null;
    this.clearIdle();

    if (worker) {
      await worker.terminate();
    }
  }

  private available(): Worker | null {
    if (this.failures >= MAX_FAILURES) {
      return null;
    }

    return this.spawn();
  }

  private spawn(): Worker | null {
    if (this.worker) {
      return this.worker;
    }

    try {
      const worker = new Worker(this.options.file, {
        execArgv: workerArgs(this.options.file),
        workerData: this.options.workerData,
      });

      worker.unref();
      worker.on("message", (reply: WorkerReply<Reply>) => this.settle(reply));
      worker.on("error", (error) => this.fail(worker, error));
      worker.on("exit", (code) =>
        this.fail(
          worker,
          new Error(`${this.options.label} worker exited with code ${code}`)
        )
      );
      this.worker = worker;

      return worker;
    } catch (error) {
      console.error(
        `[${this.options.label}] worker did not start; running in process`,
        error
      );
      this.failures = MAX_FAILURES;

      return null;
    }
  }

  private settle(reply: WorkerReply<Reply>): void {
    if (!Object.hasOwn(new Object(reply), "id")) {
      return;
    }

    const waiting = this.pending.get(reply.id);

    if (!waiting) {
      return;
    }

    this.pending.delete(reply.id);

    if (this.pending.size === 0) {
      this.rest();
    }

    if ("error" in reply) {
      waiting.dispatchEvent(
        settledEvent<Reply>({ error: new Error(reply.error) })
      );
    } else {
      waiting.dispatchEvent(settledEvent({ result: reply.result }));
    }
  }

  private rest(): void {
    const { worker } = this;

    worker?.unref();

    const { idleMs = null } = this.options;

    if (!worker || idleMs === null) {
      return;
    }

    this.idleTimer = setTimeout(() => {
      this.idleTimer = null;

      if (this.worker !== worker || this.pending.size > 0) {
        return;
      }

      this.worker = null;
      void worker.terminate();
    }, idleMs);
    this.idleTimer.unref();
  }

  private clearIdle(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    this.idleTimer = null;
  }

  private fail(worker: Worker, error: Error): void {
    if (this.worker !== worker) {
      return;
    }

    this.worker = null;
    this.failures += 1;

    if (this.failures >= MAX_FAILURES) {
      console.error(
        `[${this.options.label}] worker failed ${this.failures} times; running in process`,
        error
      );
    }

    const waiting = [...this.pending.values()];

    this.pending.clear();

    for (const signal of waiting) {
      signal.dispatchEvent(settledEvent<Reply>({ error }));
    }
  }
}

export { WorkerClient, siblingWorkerFile };
