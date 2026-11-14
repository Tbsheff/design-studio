import type { Input } from "@design-studio/actions/_core/action";
import type { createLinkCanvas } from "@design-studio/actions/canvas/create-link";
import { Effect } from "effect";

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
