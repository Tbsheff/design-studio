import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listImplicitLinksCanvas } from "../../../shared/actions/canvas/list-implicit-links.js";
import { LinkStore } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type ListImplicitLinksCanvasInput = Input<typeof listImplicitLinksCanvas>;

const handle = Effect.fn("canvas.listImplicitLinks")(function* run(
  input: ListImplicitLinksCanvasInput
) {
  const store = yield* LinkStore;
  const implicit = yield* store.implicit(input.projectId);

  return { implicit };
}) satisfies Handle<typeof listImplicitLinksCanvas>;

export { handle };
