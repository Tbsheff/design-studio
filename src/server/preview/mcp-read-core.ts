import { Effect } from "effect";

import { BadRequest } from "../../shared/actions/_core/errors/bad-request.js";
import type { Conflict } from "../../shared/actions/_core/errors/conflict.js";
import type { NotFound } from "../../shared/actions/_core/errors/not-found.js";
import type { PortFlowPlan, PortPlan } from "../../shared/port.js";
import { attemptKnown } from "../platform/attempt/index.js";
import { loadConfig } from "../platform/config/index.js";
import type { StudioProjectStore } from "../store/projects.js";
import type { AgentRunner, PreviewService, VersionStore } from "../types.js";

interface PortPlanQuery {
  readonly flow: boolean;
  readonly path: string | null;
  readonly paths: readonly string[] | string | null;
  readonly route: string | null;
  readonly sourceDirectionId: string | null;
  readonly sourceProjectId: string;
  readonly targetProjectId: string | null;
}

interface McpReadRuntime {
  readonly planPort: (query: PortPlanQuery) => Promise<PortFlowPlan | PortPlan>;
  readonly preview: PreviewService | null;
  readonly projects: StudioProjectStore;
  readonly runner: Pick<AgentRunner, "isRunning"> | null;
  readonly runsDir: (projectId: string) => string;
  readonly versions: VersionStore;
}

type McpReadError = BadRequest | Conflict | NotFound;

const NOT_READY =
  "This read is not ready in this Design Studio process. Restart Design Studio.";

const runtimes = new Map<string, Partial<McpReadRuntime>>();

const bindMcpReadRuntime = (part: Partial<McpReadRuntime>): void => {
  const { dataDir } = loadConfig();
  runtimes.set(dataDir, { ...runtimes.get(dataDir), ...part });
};

const REQUIRED_KEYS = [
  "planPort",
  "preview",
  "projects",
  "runsDir",
  "versions",
] as const;

const isReady = (
  runtime: Partial<McpReadRuntime> | null
): runtime is McpReadRuntime =>
  runtime !== null && REQUIRED_KEYS.every((key) => key in runtime);

const attemptMcpRead = <Value>(
  task: (runtime: McpReadRuntime) => Promise<Value>
): Effect.Effect<Value, McpReadError> =>
  Effect.gen(function* withRuntime() {
    const runtime = runtimes.get(loadConfig().dataDir) ?? null;

    if (!isReady(runtime)) {
      return yield* new BadRequest({ message: NOT_READY });
    }

    return yield* attemptKnown(() => task(runtime));
  });

export { attemptMcpRead, bindMcpReadRuntime };

export type { McpReadError, McpReadRuntime, PortPlanQuery };
