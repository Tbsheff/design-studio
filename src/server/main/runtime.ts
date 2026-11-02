import { ManagedRuntime } from "effect";

import { liveLayer } from "./live-layer.js";
import type { LiveServices } from "./live-layer.js";

type StudioRuntime = ManagedRuntime.ManagedRuntime<LiveServices, never>;

const buildRuntime = (): StudioRuntime => ManagedRuntime.make(liveLayer);

const disposeRuntime = (runtime: StudioRuntime): Promise<void> =>
  runtime.dispose();

export { buildRuntime, disposeRuntime };

export type { StudioRuntime };
