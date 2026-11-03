import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listLinksCanvas } from "../../../shared/actions/canvas/list-links.js";
import { LinkStore } from "../../canvas/links/link-store.js";
import type { Handle } from "../_core/handler.js";

type ListLinksCanvasInput = Input<typeof listLinksCanvas>;

const handle = Effect.fn("canvas.listLinks")(function* run(
  input: ListLinksCanvasInput
) {
  const store = yield* LinkStore;

  return yield* store.list({
    check: input.check ?? false,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof listLinksCanvas>;

export { handle };
