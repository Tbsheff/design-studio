import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { inspectViewport } from "../../../shared/actions/viewport/inspect.js";
import { ViewportRunner } from "../../viewport/index.js";
import type { Handle } from "../_core/handler.js";

type InspectViewportInput = Input<typeof inspectViewport>;

const handle = Effect.fn("viewport.inspect")(function* run(
  input: InspectViewportInput
) {
  const runner = yield* ViewportRunner;

  return yield* runner.inspect({
    directionId: input.directionId,
    page: input.page ?? "",
    projectId: input.projectId,
    schemes: input.schemes ?? "both",
    widths: input.widths ?? [],
  });
}) satisfies Handle<typeof inspectViewport>;

export { handle };
