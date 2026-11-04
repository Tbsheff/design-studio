import { Effect } from "effect";

import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { attemptKnown } from "../../platform/attempt/index.js";
import type { KnownFailure } from "../../platform/attempt/index.js";
import {
  makeRuntimeSlot,
  requireBound,
} from "../../platform/runtime-slot/index.js";
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

const runtimes = makeRuntimeSlot<LinkRuntime>("Links");

const bindLinkRuntime = (runtime: LinkRuntime): void => {
  runtimes.bind(runtime);
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
    const runtime = yield* requireBound("Links", runtimes.peek());

    return yield* attemptKnown(() => task(runtime), toLinkFailure);
  });

const runtimeOf = (): LinkRuntime | null => runtimes.peek();

export { attemptLink, bindLinkRuntime, runtimeOf };

export type { LinkFailure, LinkRuntime };
