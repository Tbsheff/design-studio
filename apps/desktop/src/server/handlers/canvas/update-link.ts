import type { Input } from "@design-studio/actions/_core/action";
import type { updateLinkCanvas } from "@design-studio/actions/canvas/update-link";
import { Effect } from "effect";

import { LinkWriter } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type UpdateLinkCanvasInput = Input<typeof updateLinkCanvas>;

const handle = Effect.fn("canvas.updateLink")(function* run(
  input: UpdateLinkCanvasInput
) {
  const writer = yield* LinkWriter;

  return yield* writer.update(input);
}) satisfies Handle<typeof updateLinkCanvas>;

export { handle };
