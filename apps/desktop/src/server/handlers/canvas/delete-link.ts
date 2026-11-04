import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { deleteLinkCanvas } from "@design-studio/actions/canvas/delete-link";
import { LinkWriter } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type DeleteLinkCanvasInput = Input<typeof deleteLinkCanvas>;

const handle = Effect.fn("canvas.deleteLink")(function* run(
  input: DeleteLinkCanvasInput
) {
  const writer = yield* LinkWriter;

  return yield* writer.delete(input.projectId, input.linkId);
}) satisfies Handle<typeof deleteLinkCanvas>;

export { handle };
