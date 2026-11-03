import { Effect } from "effect";

import { loadConfig } from "../config/index.js";

interface RuntimeSlot<Runtime> {
  readonly bind: (runtime: Runtime) => void;
  readonly bindAt: (dataDir: string, runtime: Runtime) => void;
  readonly peek: () => Runtime | null;
  readonly peekAt: (dataDir: string) => Runtime | null;
  readonly read: Effect.Effect<Runtime>;
}

const unboundText = (label: string): string =>
  `${label} runtime is not bound in this Design Studio process.`;

const requireBound = <Runtime>(
  label: string,
  runtime: Runtime | null
): Effect.Effect<Runtime> => {
  if (runtime === null) {
    return Effect.die(unboundText(label));
  }

  return Effect.succeed(runtime);
};

const makeRuntimeSlot = <Runtime>(label: string): RuntimeSlot<Runtime> => {
  const runtimes = new Map<string, Runtime>();

  const peekAt = (dataDir: string): Runtime | null =>
    runtimes.get(dataDir) ?? null;

  const peek = (): Runtime | null => peekAt(loadConfig().dataDir);

  const read = Effect.suspend(() => requireBound(label, peek()));

  return {
    bind: (runtime) => {
      runtimes.set(loadConfig().dataDir, runtime);
    },
    bindAt: (dataDir, runtime) => {
      runtimes.set(dataDir, runtime);
    },
    peek,
    peekAt,
    read,
  };
};

export { makeRuntimeSlot, requireBound };

export type { RuntimeSlot };
