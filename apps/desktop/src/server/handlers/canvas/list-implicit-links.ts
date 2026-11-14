import type { Input } from "@design-studio/actions/_core/action";
import type { listImplicitLinksCanvas } from "@design-studio/actions/canvas/list-implicit-links";
import { Effect } from "effect";

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
