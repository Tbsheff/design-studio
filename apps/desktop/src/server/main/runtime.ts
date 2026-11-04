import { Layer, ManagedRuntime } from "effect";

import type { ServerConfig } from "../platform/config/index.js";
import { toAgentLayer } from "./agent-runner.js";
import type { AgentServices } from "./agent-runner.js";
import { liveLayer } from "./live-layer.js";
import type { LiveServices } from "./live-layer.js";

type StudioRuntime = ManagedRuntime.ManagedRuntime<
  AgentServices | LiveServices,
  never
>;

const buildRuntime = (config: ServerConfig): StudioRuntime =>
  ManagedRuntime.make(
    Layer.mergeAll(liveLayer, toAgentLayer(config.agentMode))
  );

const disposeRuntime = (runtime: StudioRuntime): Promise<void> =>
  runtime.dispose();

export { buildRuntime, disposeRuntime };

export type { StudioRuntime };
