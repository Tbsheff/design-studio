import type { Input } from "@design-studio/actions/_core/action";
import type { insertChart } from "@design-studio/actions/chart/insert";
import { Effect } from "effect";

import { ChartWriter } from "../../icons/index.js";
import type { Handle } from "../_core/handler.js";

type InsertChartInput = Input<typeof insertChart>;

const handle = Effect.fn("chart.insert")(function* run(
  input: InsertChartInput
) {
  const writer = yield* ChartWriter;

  return yield* writer.insert({
    directionId: input.directionId,
    hasLegend: input.hasLegend,
    height: input.height,
    isStacked: input.isStacked,
    kind: input.kind,
    layerId: input.layerId,
    position: input.position,
    projectId: input.projectId,
    rows: input.rows,
    series: input.series,
    title: input.title,
  });
}) satisfies Handle<typeof insertChart>;

export { handle };
