import { Effect } from "effect";
import type { Cause } from "effect";

import { BadRequest } from "../../shared/actions/_core/errors/bad-request.js";
import { Conflict } from "../../shared/actions/_core/errors/conflict.js";
import { NotFound } from "../../shared/actions/_core/errors/not-found.js";
import type { PortFlowPlan, PortPlan } from "../../shared/port.js";
import { loadConfig } from "../platform/config/index.js";
import { ConflictError, NotFoundError } from "../store/errors.js";
import type { StudioProjectStore } from "../store/projects.js";
import type { PreviewService, VersionStore } from "../types.js";

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

const toMcpReadError = (error: Cause.UnknownError): McpReadError => {
  if (error.cause instanceof NotFoundError) {
    return new NotFound({ message: error.cause.message });
  }

  if (error.cause instanceof ConflictError) {
    return new Conflict({ message: error.cause.message });
  }

  if (error.cause instanceof Error) {
    return new BadRequest({ message: error.cause.message });
  }

  return new BadRequest({ message: String(error.cause) });
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

    return yield* Effect.tryPromise(() => task(runtime)).pipe(
      Effect.mapError((failure) => toMcpReadError(failure))
    );
  });

export { attemptMcpRead, bindMcpReadRuntime };

export type { McpReadError, McpReadRuntime, PortPlanQuery };
