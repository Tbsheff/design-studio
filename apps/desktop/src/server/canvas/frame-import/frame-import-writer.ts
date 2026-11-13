import type { Attachment } from "@design-studio/contracts";
import { Context, Effect, Layer } from "effect";

import { asReferenceName, isReferenceName } from "../../../shared/reference.js";
import { runDirectionWrite } from "../../direct-edit/index.js";
import { attemptKnown } from "../../platform/attempt/index.js";
import type { KnownFailure } from "../../platform/attempt/index.js";
import { ProjectWriter } from "../../store/index.js";
import { createImportedFrame, toImageBytes } from "./frame-import-ops.js";
import type {
  FrameImportQuery,
  FrameImportWritten,
} from "./frame-import-ops.js";

interface FrameImportCommand extends FrameImportQuery {
  readonly directionId: string;
  readonly projectId: string;
}

interface FrameImportWriterApi {
  readonly create: (
    command: FrameImportCommand
  ) => Effect.Effect<FrameImportWritten, KnownFailure>;
  readonly setReference: (
    projectId: string,
    attachment: Attachment
  ) => Effect.Effect<Attachment, KnownFailure>;
}

class FrameImportWriter extends Context.Service<
  FrameImportWriter,
  FrameImportWriterApi
>()("design-studio/canvas/FrameImportWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    FrameImportWriter,
    Effect.gen(function* build() {
      const projects = yield* ProjectWriter;

      return FrameImportWriter.of({
        create: Effect.fn("FrameImportWriter.create")(function* run(
          command: FrameImportCommand
        ) {
          return yield* runDirectionWrite<FrameImportWritten>(
            command,
            (target) => createImportedFrame(target, command),
            (): null => null
          );
        }),
        setReference: Effect.fn("FrameImportWriter.setReference")(function* run(
          projectId: string,
          attachment: Attachment
        ) {
          if (isReferenceName(attachment.name)) {
            return attachment;
          }

          const bytes = yield* attemptKnown(() =>
            toImageBytes(attachment.path)
          );

          return yield* projects.saveAttachment(projectId, {
            bytes,
            mime: attachment.mime,
            name: asReferenceName(attachment.name),
          });
        }),
      });
    })
  );
}

export { FrameImportWriter };

export type { FrameImportCommand, FrameImportWriterApi };
