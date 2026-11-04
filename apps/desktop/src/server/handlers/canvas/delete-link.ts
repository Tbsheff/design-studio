import type { Input } from "@design-studio/actions/_core/action";
import type { deleteLinkCanvas } from "@design-studio/actions/canvas/delete-link";
import { Effect } from "effect";

import { LinkWriter } from "../../canvas/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type DeleteLinkCanvasInput = Input<typeof deleteLinkCanvas>;

const handle = Effect.fn("canvas.deleteLink")(function* run(
  input: DeleteLinkCanvasInput
) {
  const writer = yield* LinkWriter;

  return yield* writer.delete(input.projectId, input.linkId);
}) satisfies Handle<typeof deleteLinkCanvas>;

const preview = Effect.fn("canvas.deleteLink.preview")(function* card(
  input: DeleteLinkCanvasInput
) {
  yield* Effect.void;

  return {
    action: "Remove link",
    detail: `Remove prototype link ${input.linkId}. The pages and frames stay. Undo brings the link back.`,
    title: "Remove this link?",
  };
}) satisfies Preview<typeof deleteLinkCanvas>;

export { handle, preview };
