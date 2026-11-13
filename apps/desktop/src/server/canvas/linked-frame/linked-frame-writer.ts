import { Context, Effect, Layer } from "effect";

import { runDirectionWrite } from "../../direct-edit/index.js";
import type { KnownFailure } from "../../platform/attempt/index.js";
import { createLinkedFrame } from "./linked-frame-ops.js";
import type {
  LinkedFrameQuery,
  LinkedFrameWritten,
} from "./linked-frame-ops.js";

interface LinkedFrameCommand extends LinkedFrameQuery {
  readonly directionId: string;
  readonly projectId: string;
}

interface LinkedFrameWriterApi {
  readonly create: (
    command: LinkedFrameCommand
  ) => Effect.Effect<LinkedFrameWritten, KnownFailure>;
}

class LinkedFrameWriter extends Context.Service<
  LinkedFrameWriter,
  LinkedFrameWriterApi
>()("design-studio/canvas/LinkedFrameWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    LinkedFrameWriter,
    LinkedFrameWriter.of({
      create: Effect.fn("LinkedFrameWriter.create")(function* run(
        command: LinkedFrameCommand
      ) {
        return yield* runDirectionWrite<LinkedFrameWritten>(
          command,
          (target) => createLinkedFrame(target, command),
          (): null => null
        );
      }),
    })
  );
}

export { LinkedFrameWriter };

export type { LinkedFrameCommand, LinkedFrameWriterApi };
