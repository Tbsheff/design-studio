import type { Input } from "@design-studio/actions/_core/action";
import type { applyViewport } from "@design-studio/actions/viewport/apply";
import { Effect } from "effect";

import { ViewportFixWriter } from "../../viewport/index.js";
import type { Handle } from "../_core/handler.js";

type ApplyViewportInput = Input<typeof applyViewport>;

const handle = Effect.fn("viewport.apply")(function* run(
  input: ApplyViewportInput
) {
  const writer = yield* ViewportFixWriter;

  return yield* writer.apply({
    directionId: input.directionId,
    isDryRun: input.isDryRun,
    kinds: input.kinds,
    page: input.page,
    projectId: input.projectId,
    widths: input.widths,
  });
}) satisfies Handle<typeof applyViewport>;

export { handle };
