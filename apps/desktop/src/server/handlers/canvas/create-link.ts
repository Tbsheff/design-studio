import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { createLinkCanvas } from "../../../shared/actions/canvas/create-link.js";
import { LinkWriter } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type CreateLinkCanvasInput = Input<typeof createLinkCanvas>;

const handle = Effect.fn("canvas.createLink")(function* run(
  input: CreateLinkCanvasInput
) {
  const writer = yield* LinkWriter;

  return yield* writer.create(input);
}) satisfies Handle<typeof createLinkCanvas>;

export { handle };
