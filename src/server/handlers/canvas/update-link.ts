import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { updateLinkCanvas } from "../../../shared/actions/canvas/update-link.js";
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
