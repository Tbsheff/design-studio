import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { Context, Effect, Layer } from "effect";

import { BadRequestError } from "../store/errors.js";

interface LocalStart {
  readonly bundle: string;
  readonly secrets: string;
  readonly runner: string | null;
  readonly databaseId: string;
}

interface LocalWorker {
  readonly stateDir: string;
  readonly port: number;
  readonly start: (input: LocalStart) => Promise<string>;
  readonly ensure: (input: LocalStart) => Promise<string>;
  readonly stop: () => void;
}

interface LocalRuntimeApi {
  readonly open: (dir: string) => Effect.Effect<LocalWorker>;
}

interface WorkerState {
  child: ChildProcess | null;
  url: string | null;
  starting: Promise<string> | null;
}

const LOCAL_D1_ID = "5e7f0d1a-0000-4000-8000-00000000d1d1";

const READY =
  /publish worker local ready at (?<url>http:\/\/127\.0\.0\.1:\d+\/)/u;

const START_TIMEOUT_MS = 60_000;

const SEEN_MAX = 8000;

const KILL_SIGNAL = "SIGTERM";

const toLastErrorLine = (seen: string): string =>
  seen
    .split("\n")
    .filter((line) => /error/iu.test(line))
    .slice(-1)[0]
    ?.slice(0, 200) ?? "";

const inspectStart = (input: LocalStart): BadRequestError | null => {
  if (!input.runner) {
    return new BadRequestError(
      "Local mode needs cloud/publish-worker with its packages installed."
    );
  }

  if (!existsSync(input.bundle) || !existsSync(input.secrets)) {
    return new BadRequestError(
      "The local Worker build is missing. Run Set up publishing again."
    );
  }

  return null;
};

const toRunnerArgs = (
  input: LocalStart,
  stateDir: string,
  port: number
): string[] => [
  input.runner ?? "",
  "--script",
  input.bundle,
  "--persist",
  stateDir,
  "--d1",
  input.databaseId,
  "--secrets",
  input.secrets,
  "--port",
  String(port),
];

const startRunner = (
  input: LocalStart,
  stateDir: string,
  port: number
): ChildProcess =>
  spawn(process.execPath, toRunnerArgs(input, stateDir, port), {
    cwd: path.dirname(path.dirname(input.runner ?? "")),
    env: { HOME: process.env.HOME ?? "", PATH: process.env.PATH ?? "" },
    stdio: ["ignore", "pipe", "pipe"],
  });

const runUntilReady = (
  state: WorkerState,
  spawned: ChildProcess
): Promise<string> =>
  new Promise((resolve, reject) => {
    let seen = "";
    const timer = setTimeout(() => {
      reject(new BadRequestError("The local Worker did not start in time."));
    }, START_TIMEOUT_MS);
    const watch = (chunk: Buffer): void => {
      seen = (seen + chunk.toString("utf-8")).slice(-SEEN_MAX);
      const found = READY.exec(seen)?.groups?.["url"] ?? null;

      if (found === null) {
        return;
      }

      clearTimeout(timer);
      state.url = found;
      resolve(found);
    };

    spawned.stdout?.on("data", watch);
    spawned.stderr?.on("data", watch);
    spawned.once("exit", (code) => {
      clearTimeout(timer);

      if (state.child === spawned) {
        state.child = null;
        state.url = null;
      }

      reject(
        new BadRequestError(
          `The local Worker stopped (code ${code}). ${toLastErrorLine(seen)}`
        )
      );
    });
  });

const createLocalRuntime = (dir: string): LocalWorker => {
  const stateDir = path.join(dir, "state");
  const port = Number(process.env.STUDIO_PUBLISH_LOCAL_PORT ?? "13770");
  const state: WorkerState = { child: null, starting: null, url: null };

  const stop = (): void => {
    state.child?.kill(KILL_SIGNAL);
    state.child = null;
    state.url = null;
  };

  process.once("exit", stop);

  const startNow = (input: LocalStart): Promise<string> => {
    stop();
    const refused = inspectStart(input);

    if (refused !== null) {
      return Promise.reject(refused);
    }

    const spawned = startRunner(input, stateDir, port);

    state.child = spawned;

    return runUntilReady(state, spawned);
  };

  const start = (input: LocalStart): Promise<string> => {
    state.starting ??= startNow(input).finally(() => {
      state.starting = null;
    });

    return state.starting;
  };

  const ensure = async (input: LocalStart): Promise<string> => {
    if (state.child && state.url) {
      return state.url;
    }

    return await start(input);
  };

  return { ensure, port, start, stateDir, stop };
};

class LocalRuntime extends Context.Service<LocalRuntime, LocalRuntimeApi>()(
  "design-studio/publish/LocalRuntime"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    LocalRuntime,
    Effect.gen(function* make() {
      const opened = new Map<string, LocalWorker>();

      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          for (const worker of opened.values()) {
            worker.stop();
          }

          opened.clear();
        })
      );

      const open = Effect.fn("LocalRuntime.open")(function* run(dir: string) {
        return yield* Effect.sync(() => {
          const known = opened.get(dir);

          if (known) {
            return known;
          }

          const worker = createLocalRuntime(dir);

          opened.set(dir, worker);

          return worker;
        });
      });

      return LocalRuntime.of({ open });
    })
  );
}

export { createLocalRuntime, LOCAL_D1_ID, LocalRuntime };

export type { LocalRuntimeApi, LocalStart, LocalWorker };
