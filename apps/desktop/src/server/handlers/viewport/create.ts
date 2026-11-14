import type { Input } from "@design-studio/actions/_core/action";
import type { createViewport } from "@design-studio/actions/viewport/create";
import { Effect } from "effect";

import { ViewportWriter } from "../../viewport/index.js";
import type { Handle } from "../_core/handler.js";

type CreateViewportInput = Input<typeof createViewport>;

const handle = Effect.fn("viewport.create")(function* run(
  input: CreateViewportInput
) {
  const writer = yield* ViewportWriter;

  return yield* writer.create({
    directionId: input.directionId,
    page: input.page,
    projectId: input.projectId,
    schemes: input.schemes,
    widths: input.widths,
  });
}) satisfies Handle<typeof createViewport>;

export { handle };
