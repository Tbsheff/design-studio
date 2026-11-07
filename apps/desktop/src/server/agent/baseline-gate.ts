import { once } from "node:events";

import type { RunToolState } from "./types.js";

const toAbortWait = async (signal: AbortSignal): Promise<void> => {
  if (signal.aborted) {
    return;
  }

  await once(signal, "abort");
};

const toBaselineWait = async (baseline: Promise<unknown>): Promise<void> => {
  await Promise.allSettled([baseline]);
};

const toBaselineGate = (
  run: RunToolState,
  signal: AbortSignal
): (() => Promise<void>) | undefined => {
  const { baseline } = run;

  if (!baseline) {
    return;
  }

  const gate = Promise.race([toBaselineWait(baseline), toAbortWait(signal)]);

  return () => gate;
};

export { toBaselineGate };
