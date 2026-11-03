import { Effect } from "effect";
import type { Cause } from "effect";

import { BadRequest } from "../../../shared/actions/_core/errors/bad-request.js";
import { NotFound } from "../../../shared/actions/_core/errors/not-found.js";
import { loadConfig } from "../../platform/config/index.js";
import { BadRequestError, NotFoundError } from "../../store/errors.js";
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

type LinkFailure = BadRequest | NotFound;

const NOT_READY =
  "Links are not ready in this Design Studio process. Restart Design Studio.";

const runtimes = new Map<string, LinkRuntime>();

const bindLinkRuntime = (runtime: LinkRuntime): void => {
  runtimes.set(loadConfig().dataDir, runtime);
};

const toLinkError = (error: Cause.UnknownError): LinkFailure => {
  const { cause } = error;

  if (cause instanceof NotFoundError) {
    return new NotFound({ message: cause.message });
  }

  if (cause instanceof LinkError || cause instanceof BadRequestError) {
    return new BadRequest({ message: cause.message });
  }

  if (cause instanceof Error) {
    return new BadRequest({ message: cause.message });
  }

  return new BadRequest({ message: String(cause) });
};

const attemptLink = <Value>(
  task: (runtime: LinkRuntime) => Promise<Value>
): Effect.Effect<Value, LinkFailure> =>
  Effect.gen(function* withRuntime() {
    const runtime = runtimes.get(loadConfig().dataDir) ?? null;

    if (runtime === null) {
      return yield* new BadRequest({ message: NOT_READY });
    }

    return yield* Effect.tryPromise(() => task(runtime)).pipe(
      Effect.mapError((failure) => toLinkError(failure))
    );
  });

const runtimeOf = (): LinkRuntime | null =>
  runtimes.get(loadConfig().dataDir) ?? null;

export { attemptLink, bindLinkRuntime, runtimeOf };

export type { LinkFailure, LinkRuntime };
