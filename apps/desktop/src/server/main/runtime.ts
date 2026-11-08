import { Layer, ManagedRuntime } from "effect";

import type { ServerConfig } from "../platform/config/index.js";
import type { StudioRuntime } from "../platform/studio-runtime/index.js";
import { toAgentLayer } from "./agent-runner.js";
import type { AgentServices } from "./agent-runner.js";
import { liveLayer } from "./live-layer.js";
import type { LiveServices } from "./live-layer.js";

declare module "../platform/studio-runtime/index.js" {
  interface StudioServiceGroups {
    readonly agent: AgentServices;
    readonly live: LiveServices;
  }
}

const buildRuntime = (config: ServerConfig): StudioRuntime =>
  ManagedRuntime.make(
    Layer.mergeAll(liveLayer, toAgentLayer(config.agentMode))
  );

const disposeRuntime = (runtime: StudioRuntime): Promise<void> =>
  runtime.dispose();

export { buildRuntime, disposeRuntime };

export type { StudioRuntime };
