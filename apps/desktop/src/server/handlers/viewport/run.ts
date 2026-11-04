import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { runViewport } from "@design-studio/actions/viewport/run";
import { ViewportRunner } from "../../viewport/index.js";
import type { Handle } from "../_core/handler.js";

type RunViewportInput = Input<typeof runViewport>;

const handle = Effect.fn("viewport.run")(function* run(
  input: RunViewportInput
) {
  const runner = yield* ViewportRunner;

  return yield* runner.run({
    directionId: input.directionId,
    page: input.page,
    projectId: input.projectId,
    schemes: input.schemes,
    widths: input.widths,
  });
}) satisfies Handle<typeof runViewport>;

export { handle };
