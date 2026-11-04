import { Context, Effect, Layer } from "effect";

import { CfFailed } from "@design-studio/actions/publish/errors/cf-failed";
import {
  bufferOutput,
  killChild,
  spawnChild,
  toFailedResult,
} from "./cf-spawn.js";
import type { CfChild, CfRun, CliResult } from "./cf-spawn.js";

interface CfCliApi {
  readonly run: (input: CfRun) => Effect.Effect<CliResult, CfFailed>;
}

const runChild = (child: CfChild): Effect.Effect<CliResult> => {
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
            Effect.flatMap((child) => runChild(child)),
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

export { CfCli };

export type { CfCliApi };

export type { CfChild, CfRun, CfSpawnOptions, CliResult } from "./cf-spawn.js";
