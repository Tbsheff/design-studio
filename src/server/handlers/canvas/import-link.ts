import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { importLinkCanvas } from "../../../shared/actions/canvas/import-link.js";
import { LinkWriter } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type ImportLinkCanvasInput = Input<typeof importLinkCanvas>;

const handle = Effect.fn("canvas.importLink")(function* run(
  input: ImportLinkCanvasInput
) {
  const writer = yield* LinkWriter;

  return yield* writer.keep(input);
}) satisfies Handle<typeof importLinkCanvas>;

export { handle };
