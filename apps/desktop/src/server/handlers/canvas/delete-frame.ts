import type { Input } from "@design-studio/actions/_core/action";
import type { deleteFrameCanvas } from "@design-studio/actions/canvas/delete-frame";
import { Effect } from "effect";

import { CanvasStore, CanvasWriter } from "../../canvas/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type DeleteFrameCanvasInput = Input<typeof deleteFrameCanvas>;

const handle = Effect.fn("canvas.deleteFrame")(function* run(
  input: DeleteFrameCanvasInput
) {
  const writer = yield* CanvasWriter;

  return yield* writer.deleteFrame(input);
}) satisfies Handle<typeof deleteFrameCanvas>;

const preview = Effect.fn("canvas.deleteFrame.preview")(function* card(
  input: DeleteFrameCanvasInput
) {
  const store = yield* CanvasStore;

  return yield* store.deleteCard(input);
}) satisfies Preview<typeof deleteFrameCanvas>;

export { handle, preview };
