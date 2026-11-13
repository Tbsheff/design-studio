import type { Input } from "@design-studio/actions/_core/action";
import type { deleteFramesCanvas } from "@design-studio/actions/canvas/delete-frames";
import { Effect } from "effect";

import { CanvasStore, CanvasWriter } from "../../canvas/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type DeleteFramesCanvasInput = Input<typeof deleteFramesCanvas>;

const handle = Effect.fn("canvas.deleteFrames")(function* run(
  input: DeleteFramesCanvasInput
) {
  const writer = yield* CanvasWriter;

  return yield* writer.deleteFrames(input);
}) satisfies Handle<typeof deleteFramesCanvas>;

const preview = Effect.fn("canvas.deleteFrames.preview")(function* card(
  input: DeleteFramesCanvasInput
) {
  const store = yield* CanvasStore;

  return yield* store.deleteFramesCard(input);
}) satisfies Preview<typeof deleteFramesCanvas>;

export { handle, preview };
