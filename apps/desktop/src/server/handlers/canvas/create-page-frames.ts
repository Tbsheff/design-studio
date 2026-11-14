import type { Input } from "@design-studio/actions/_core/action";
import type { createPageFramesCanvas } from "@design-studio/actions/canvas/create-page-frames";
import { Effect } from "effect";

import { canvasOwner, PageFramesWriter } from "../../canvas/index.js";
import { ProjectStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type CreatePageFramesCanvasInput = Input<typeof createPageFramesCanvas>;

const handle = Effect.fn("canvas.createPageFrames")(function* run(
  input: CreatePageFramesCanvasInput
) {
  const projects = yield* ProjectStore;
  const writer = yield* PageFramesWriter;
  const project = yield* projects.get(input.projectId);

  return yield* writer.create({
    directionId: input.directionId ?? canvasOwner(project).id,
    fromFrame: input.fromFrame,
    pages: input.pages,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof createPageFramesCanvas>;

export { handle };
