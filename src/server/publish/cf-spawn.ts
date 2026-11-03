import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { once } from "node:events";

interface CliResult {
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly timedOut: boolean;
}

interface CfSpawnOptions {
  readonly cwd?: string | undefined;
  readonly env: NodeJS.ProcessEnv;
  readonly timeoutMs: number;
  readonly onSpawn?: ((child: CfChild) => void) | undefined;
}

interface CfRun {
  readonly bin: string;
  readonly args: readonly string[];
  readonly options: CfSpawnOptions;
}

type CfChild = ChildProcess;

const OUTPUT_MAX = 400_000;

const KILL_SIGNAL = "SIGTERM";

const spawnChild = (input: CfRun): CfChild =>
  spawn(input.bin, [...input.args], {
    cwd: input.options.cwd,
    env: input.options.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

const killChild = (child: CfChild): void => {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill(KILL_SIGNAL);
  }
};

interface OutputBuffer {
  stdout: string;
  stderr: string;
}

const bufferOutput = (child: CfChild): OutputBuffer => {
  const buffer: OutputBuffer = { stderr: "", stdout: "" };

  child.stdout?.on("data", (chunk: Buffer) => {
    if (buffer.stdout.length < OUTPUT_MAX) {
      buffer.stdout += chunk.toString("utf-8");
    }
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    if (buffer.stderr.length < OUTPUT_MAX) {
      buffer.stderr += chunk.toString("utf-8");
    }
  });

  return buffer;
};

const toFailedResult = (
  buffer: OutputBuffer,
  error: Error,
  isTimedOut: boolean
): CliResult => ({
  code: -1,
  stderr: `${buffer.stderr}\n${error.message}`,
  stdout: buffer.stdout,
  timedOut: isTimedOut,
});

const spawnCf = async (input: CfRun): Promise<CliResult> => {
  const child = spawnChild(input);
  const buffer = bufferOutput(child);

  input.options.onSpawn?.(child);
  let isTimedOut = false;

  const timer = setTimeout(() => {
    isTimedOut = true;
    killChild(child);
  }, input.options.timeoutMs);

  try {
    const [code] = (await once(child, "close")) as [number | null];

    return {
      code,
      stderr: buffer.stderr,
      stdout: buffer.stdout,
      timedOut: isTimedOut,
    };
  } catch (error) {
    return toFailedResult(buffer, error as Error, isTimedOut);
  } finally {
    clearTimeout(timer);
  }
};

export { bufferOutput, killChild, spawnCf, spawnChild, toFailedResult };

export type { CfChild, CfRun, CfSpawnOptions, CliResult, OutputBuffer };
