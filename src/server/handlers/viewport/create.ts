import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { createViewport } from "../../../shared/actions/viewport/create.js";
import { ViewportWriter } from "../../viewport/index.js";
import type { Handle } from "../_core/handler.js";

type CreateViewportInput = Input<typeof createViewport>;

const handle = Effect.fn("viewport.create")(function* run(
  input: CreateViewportInput
) {
  const writer = yield* ViewportWriter;

  return yield* writer.create({
    directionId: input.directionId,
    page: input.page ?? "",
    projectId: input.projectId,
    schemes: input.schemes ?? "both",
    widths: input.widths ?? [],
  });
}) satisfies Handle<typeof createViewport>;

export { handle };
