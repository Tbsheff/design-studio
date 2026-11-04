import { Effect } from "effect";

import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { Direction, Project } from "@design-studio/actions/_core/contracts";
import { DirectEditError } from "../direct-edit/index.js";
import type { DirectEditDeps } from "../direct-edit/index.js";
import { attemptKnown } from "../platform/attempt/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import {
  makeRuntimeSlot,
  requireBound,
} from "../platform/runtime-slot/index.js";

type WithDirection = <Value>(
  projectId: string,
  directionId: string,
  task: (project: Project, direction: Direction) => Promise<Value>
) => Promise<Value>;

interface ContentRuntime {
  readonly editDeps: DirectEditDeps;
  readonly withDirection: WithDirection;
}

const UNPROCESSABLE = 422;

const runtimes = makeRuntimeSlot<ContentRuntime>("Content");

const bindContentRuntime = (runtime: ContentRuntime): void => {
  runtimes.bind(runtime);
};

const toContentFailure = (cause: unknown): BadRequest | null => {
  if (cause instanceof DirectEditError && cause.status === UNPROCESSABLE) {
    return new BadRequest({ message: cause.message });
  }

  return null;
};

const attemptContent = <Value>(
  task: (runtime: ContentRuntime) => Promise<Value>
): Effect.Effect<Value, KnownFailure> =>
  Effect.gen(function* withRuntime() {
    const runtime = yield* requireBound("Content", runtimes.peek());

    return yield* attemptKnown(() => task(runtime), toContentFailure);
  });

export { attemptContent, bindContentRuntime };

export type { ContentRuntime };
