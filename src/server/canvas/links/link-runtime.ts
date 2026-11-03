import { Effect } from "effect";

import { BadRequest } from "../../../shared/actions/_core/errors/bad-request.js";
import { attemptKnown } from "../../platform/attempt/index.js";
import type { KnownFailure } from "../../platform/attempt/index.js";
import { loadConfig } from "../../platform/config/index.js";
import type { StudioProjectStore } from "../../store/projects.js";
import type { PreviewService } from "../../types.js";
import type { FrameStateDeps } from "../app-flow/frame-state-service.js";
import type { CanvasService } from "../service.js";
import { LinkError } from "./link-tools.js";

interface LinkRuntime {
  readonly canvas: CanvasService;
  readonly frameStates: FrameStateDeps;
  readonly preview: Pick<PreviewService, "directionUrl" | "withPage"> | null;
  readonly projects: Pick<StudioProjectStore, "get" | "projectDir">;
}

type LinkFailure = KnownFailure;

const NOT_READY =
  "Links are not ready in this Design Studio process. Restart Design Studio.";

const runtimes = new Map<string, LinkRuntime>();

const bindLinkRuntime = (runtime: LinkRuntime): void => {
  runtimes.set(loadConfig().dataDir, runtime);
};

const toLinkFailure = (cause: unknown): BadRequest | null => {
  if (cause instanceof LinkError) {
    return new BadRequest({ message: cause.message });
  }

  return null;
};

const attemptLink = <Value>(
  task: (runtime: LinkRuntime) => Promise<Value>
): Effect.Effect<Value, LinkFailure> =>
  Effect.gen(function* withRuntime() {
    const runtime = runtimes.get(loadConfig().dataDir) ?? null;

    if (runtime === null) {
      return yield* new BadRequest({ message: NOT_READY });
    }

    return yield* attemptKnown(() => task(runtime), toLinkFailure);
  });

const runtimeOf = (): LinkRuntime | null =>
  runtimes.get(loadConfig().dataDir) ?? null;

export { attemptLink, bindLinkRuntime, runtimeOf };

export type { LinkFailure, LinkRuntime };
