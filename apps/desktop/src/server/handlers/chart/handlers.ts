// @generated
import type { ChartActions } from "@design-studio/actions/chart/index";

import type { Entries } from "../_core/handler.js";
import { handle as insertChartHandle } from "./insert.js";
import { handle as inspectChartHandle } from "./inspect.js";

const ChartEntries = {
  insertChart: { handle: insertChartHandle },
  inspectChart: { handle: inspectChartHandle },
} satisfies Entries<typeof ChartActions>;

export { ChartEntries };
