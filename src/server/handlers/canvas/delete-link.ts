import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { deleteLinkCanvas } from "../../../shared/actions/canvas/delete-link.js";
import { LinkWriter } from "../../canvas/links/link-writer.js";
import type { Handle } from "../_core/handler.js";

type DeleteLinkCanvasInput = Input<typeof deleteLinkCanvas>;

const handle = Effect.fn("canvas.deleteLink")(function* run(
  input: DeleteLinkCanvasInput
) {
  const writer = yield* LinkWriter;

  return yield* writer.delete(input.projectId, input.linkId);
}) satisfies Handle<typeof deleteLinkCanvas>;

export { handle };
