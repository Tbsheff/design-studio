import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { once } from "node:events";

import { Context, Effect, Layer } from "effect";

import { CfFailed } from "../../shared/actions/publish/errors/cf-failed.js";

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

interface CfCliApi {
  readonly run: (input: CfRun) => Effect.Effect<CliResult, CfFailed>;
}

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

const awaitChild = (child: CfChild): Effect.Effect<CliResult> => {
  const buffer = bufferOutput(child);

  return Effect.callback<CliResult>((resume) => {
    child.on("error", (error) => {
      resume(Effect.succeed(toFailedResult(buffer, error, false)));
    });
    child.on("close", (code) => {
      resume(
        Effect.succeed({
          code,
          stderr: buffer.stderr,
          stdout: buffer.stdout,
          timedOut: false,
        })
      );
    });
  });
};

class CfCli extends Context.Service<CfCli, CfCliApi>()(
  "design-studio/publish/CfCli"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    CfCli,
    CfCli.of({
      run: Effect.fn("CfCli.run")(function* run(input: CfRun) {
        return yield* Effect.scoped(
          Effect.acquireRelease(
            Effect.sync(() => spawnChild(input)),
            (child) => Effect.sync(() => killChild(child))
          ).pipe(
            Effect.tap((child) =>
              Effect.sync(() => input.options.onSpawn?.(child))
            ),
            Effect.flatMap((child) => awaitChild(child)),
            Effect.timeoutOrElse({
              duration: input.options.timeoutMs,
              orElse: () =>
                Effect.fail(
                  new CfFailed({
                    message: "The cf command did not finish in time.",
                  })
                ),
            })
          )
        );
      }),
    })
  );
}

export { CfCli, spawnCf };

export type { CfChild, CfCliApi, CfRun, CfSpawnOptions, CliResult };
