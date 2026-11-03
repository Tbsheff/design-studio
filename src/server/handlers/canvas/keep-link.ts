import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { keepLinkCanvas } from "../../../shared/actions/canvas/keep-link.js";
import { LinkWriter } from "../../canvas/links/link-writer.js";
import type { Handle } from "../_core/handler.js";

type KeepLinkCanvasInput = Input<typeof keepLinkCanvas>;

const handle = Effect.fn("canvas.keepLink")(function* run(
  input: KeepLinkCanvasInput
) {
  const writer = yield* LinkWriter;

  return yield* writer.keep(input);
}) satisfies Handle<typeof keepLinkCanvas>;

export { handle };
