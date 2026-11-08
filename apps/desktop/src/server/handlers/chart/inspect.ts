import type { Input } from "@design-studio/actions/_core/action";
import type { inspectChart } from "@design-studio/actions/chart/inspect";
import { Effect } from "effect";

import { ChartStore } from "../../icons/index.js";
import type { Handle } from "../_core/handler.js";

type InspectChartInput = Input<typeof inspectChart>;

const handle = Effect.fn("chart.inspect")(function* run(
  input: InspectChartInput
) {
  const store = yield* ChartStore;

  return yield* store.inspect({
    directionId: input.directionId,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof inspectChart>;

export { handle };
