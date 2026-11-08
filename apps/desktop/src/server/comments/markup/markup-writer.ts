import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { Conflict } from "@design-studio/actions/_core/errors/conflict";
import type { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { MarkupSchema } from "@design-studio/actions/markup/schema";
import { Context, Effect, Layer } from "effect";

import { CanvasStore } from "../../canvas/index.js";
import {
  runDirectionRead,
  toDirectEditStatusFailure,
} from "../../direct-edit/index.js";
import type { DirectEditStatusFailure } from "../../direct-edit/index.js";
import { EditError, LayerRefError } from "../../page-probe/index.js";
import { ProjectStore, ProjectWriter } from "../../store/index.js";
import type { LocalOrgScope } from "../../store/index.js";
import { getMarkupFrame } from "./markup-frame.js";
import { getMarkupLayers } from "./markup-layers.js";
import type { MarkupBox } from "./markup-layers.js";

type Markup = typeof MarkupSchema.Type;

const PNG_BASE64_PREFIX = "iVBORw0KGgo";

interface CreateMarkupCommand {
  readonly boxes: readonly MarkupBox[];
  readonly directionId: string;
  readonly frameId: string;
  readonly image: string;
  readonly projectId: string;
}

type WriteFailure = BadRequest | Conflict | NotFound;

interface MarkupWriterApi {
  readonly create: (
    command: CreateMarkupCommand
  ) => Effect.Effect<Markup, WriteFailure, LocalOrgScope>;
}

const toProbeFailure = (
  cause: unknown
): BadRequest | DirectEditStatusFailure | null => {
  if (cause instanceof LayerRefError || cause instanceof EditError) {
    return new BadRequest({ message: cause.message });
  }

  return toDirectEditStatusFailure(cause);
};

class MarkupWriter extends Context.Service<MarkupWriter, MarkupWriterApi>()(
  "design-studio/comments/MarkupWriter"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    MarkupWriter,
    Effect.gen(function* build() {
      const projects = yield* ProjectStore;
      const canvases = yield* CanvasStore;
      const writer = yield* ProjectWriter;

      return MarkupWriter.of({
        create: Effect.fn("MarkupWriter.create")(function* run(
          command: CreateMarkupCommand
        ) {
          if (!command.image.startsWith(PNG_BASE64_PREFIX)) {
            return yield* new BadRequest({
              message: "The picture must be a PNG, sent as base64.",
            });
          }

          const project = yield* projects.get(command.projectId);
          const doc = yield* canvases.getDoc(command.projectId);

          const frame = yield* getMarkupFrame(
            project,
            doc.canvas?.frames ?? [],
            command.frameId
          );

          const layers = yield* runDirectionRead(
            { directionId: command.directionId, projectId: command.projectId },
            (direction) =>
              getMarkupLayers(direction, {
                boxes: command.boxes,
                framePath: frame.path,
                frameSize: frame.size,
              }),
            toProbeFailure
          );

          const attachment = yield* writer.saveEncodedAttachment(
            command.projectId,
            {
              data: command.image,
              mime: "image/png",
              name: `markup-${command.frameId}.png`,
            }
          );

          return { attachment, layers };
        }),
      });
    })
  );
}

export { MarkupWriter };

export type { CreateMarkupCommand, MarkupWriterApi };
