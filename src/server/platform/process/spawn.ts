import { spawn } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";

interface SpawnOptions {
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
}

interface RunProcessOptions extends SpawnOptions {
  readonly input?: string;
  readonly maxStdoutBytes: number;
  readonly timeoutMs: number;
}

interface RunProcessResult {
  readonly code: number | null;
  readonly stderr: string;
  readonly stdout: string;
  readonly timedOut: boolean;
}

const ignoreError = (): null => null;

const spawnPiped = (
  binary: string,
  args: readonly string[],
  options: SpawnOptions
): ChildProcessWithoutNullStreams =>
  spawn(binary, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: ["pipe", "pipe", "pipe"],
  });

const runProcess = async (
  binary: string,
  args: readonly string[],
  options: RunProcessOptions
): Promise<RunProcessResult> => {
  const child = spawnPiped(binary, args, options);
  const out: Buffer[] = [];
  const err: Buffer[] = [];
  let size = 0;
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGKILL");
  }, options.timeoutMs);

  child.stdout.on("data", (chunk: Buffer) => {
    size += chunk.length;

    if (size <= options.maxStdoutBytes) {
      out.push(chunk);
    }
  });
  child.stderr.on("data", (chunk: Buffer) => err.push(chunk));
  child.stdin.on("error", ignoreError);
  child.stdin.end(options.input ?? "");

  try {
    const [code] = (await once(child, "close")) as [number | null];
    const stderr = Buffer.concat(err).toString("utf-8");
    const stdout = Buffer.concat(out).toString("utf-8");

    return { code, stderr, stdout, timedOut };
  } finally {
    clearTimeout(timer);
  }
};

export { runProcess, spawnPiped };

export type { RunProcessOptions, RunProcessResult, SpawnOptions };
