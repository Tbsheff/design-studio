import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";

import { spawnPiped } from "../process/spawn.js";

interface RawObject {
  body: Buffer;
  type: string;
}

type Outcome = { error: Error } | { value: RawObject | null };

interface Pending {
  sha: string;
  signal: EventTarget;
}

type BinaryResolver = () => Promise<string>;

const NEWLINE_BYTE = 0x0a;
const DONE = "done";
const IDLE_CLOSE_MS = 20_000;
const MAX_LIVE_READERS = 4;

const ignoreError = (): null => null;

const deliver = (pending: Pending, outcome: Outcome): void => {
  pending.signal.dispatchEvent(new CustomEvent(DONE, { detail: outcome }));
};

const liveReaders = new Set<BatchReader>();

class BatchReader {
  private buffer: Buffer = Buffer.alloc(0);
  private child: ChildProcessWithoutNullStreams | null = null;
  private readonly binary: BinaryResolver;
  private readonly cwd: string;
  private readonly env: NodeJS.ProcessEnv;
  private active = 0;
  private idleTimer: NodeJS.Timeout | null = null;
  private queue: Pending[] = [];

  public constructor(
    binary: BinaryResolver,
    env: NodeJS.ProcessEnv,
    cwd: string
  ) {
    this.binary = binary;
    this.env = env;
    this.cwd = cwd;
  }

  public async read(sha: string): Promise<RawObject | null> {
    this.stopIdle();
    this.active += 1;

    try {
      return await this.readOnce(sha);
    } finally {
      this.active -= 1;
      this.armIdle();
    }
  }

  public close(): void {
    this.stopIdle();
    liveReaders.delete(this);
    this.child?.stdin.end();
    this.child = null;
  }

  public isIdle(): boolean {
    return this.active === 0;
  }

  private async readOnce(sha: string): Promise<RawObject | null> {
    const child = await this.start();
    const signal = new EventTarget();
    const settled = once(signal, DONE);

    this.queue.push({ sha, signal });
    child.stdin.write(`${sha}\n`);
    this.markLive();

    const [event] = (await settled) as [CustomEvent<Outcome>];

    if ("error" in event.detail) {
      throw event.detail.error;
    }

    return event.detail.value;
  }

  private stopIdle(): void {
    if (this.idleTimer !== null) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private armIdle(): void {
    this.stopIdle();

    if (!this.isIdle() || this.child === null) {
      return;
    }

    this.idleTimer = setTimeout(() => {
      this.idleTimer = null;

      if (this.isIdle()) {
        this.close();
      }
    }, IDLE_CLOSE_MS);
    this.idleTimer.unref();
  }

  private markLive(): void {
    liveReaders.delete(this);
    liveReaders.add(this);

    for (const reader of liveReaders) {
      if (liveReaders.size <= MAX_LIVE_READERS) {
        return;
      }

      if (reader !== this && reader.isIdle()) {
        reader.close();
      }
    }
  }

  private async start(): Promise<ChildProcessWithoutNullStreams> {
    if (this.child) {
      return this.child;
    }

    const binary = await this.binary();

    if (this.child) {
      return this.child;
    }

    const child = spawnPiped(binary, ["cat-file", "--batch"], {
      cwd: this.cwd,
      env: this.env,
    });

    this.child = child;
    child.stdout.on("data", (chunk: Buffer) => {
      if (this.child === child) {
        this.consume(chunk);
      }
    });
    child.stdin.on("error", ignoreError);
    child.once("exit", () => {
      this.fail(child, new Error("git cat-file stopped"));
    });
    child.once("error", (error) => {
      this.fail(child, error);
    });

    return child;
  }

  private fail(child: ChildProcessWithoutNullStreams, error: Error): void {
    if (this.child !== null && this.child !== child) {
      return;
    }

    this.child = null;
    liveReaders.delete(this);

    this.buffer = Buffer.alloc(0);

    for (const pending of this.queue.splice(0)) {
      deliver(pending, { error });
    }
  }

  private consume(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    let more = true;

    while (more) {
      more = this.consumeOne();
    }
  }

  private settle(pending: Pending, value: RawObject | null): true {
    this.queue.shift();
    deliver(pending, { value });

    return true;
  }

  private consumeOne(): boolean {
    const [pending] = this.queue;
    const eol = this.buffer.indexOf(NEWLINE_BYTE);

    if (!pending || eol === -1) {
      return false;
    }

    const [, type = "", sizeText] = this.buffer
      .toString("utf-8", 0, eol)
      .split(" ");

    if (type === "missing") {
      this.buffer = this.buffer.subarray(eol + 1);

      return this.settle(pending, null);
    }

    const start = eol + 1;
    const end = start + Number(sizeText);

    if (this.buffer.length < end + 1) {
      return false;
    }

    const body = Buffer.from(this.buffer.subarray(start, end));

    this.buffer = this.buffer.subarray(end + 1);

    return this.settle(pending, { body, type });
  }
}

export { BatchReader };

export type { BinaryResolver, RawObject };
