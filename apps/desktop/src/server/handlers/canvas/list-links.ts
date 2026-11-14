import type { Input } from "@design-studio/actions/_core/action";
import type { listLinksCanvas } from "@design-studio/actions/canvas/list-links";
import { Effect } from "effect";

import { LinkStore } from "../../canvas/index.js";
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
