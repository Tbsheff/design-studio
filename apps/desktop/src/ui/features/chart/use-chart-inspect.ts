import { useMemo } from "react";

import { chartRoutes, useAction } from "./deps.js";
import type { RouteOutput } from "./deps.js";

type Inspected = RouteOutput<typeof chartRoutes.inspectChart>;

interface ChartInspect {
  readonly error: string | null;
  readonly inspected: Inspected | null;
}

const useChartInspect = (
  projectId: string,
  directionId: string | null
): ChartInspect => {
  const input = useMemo(
    () => ({ directionId, projectId }),
    [directionId, projectId]
  );

  const read = useAction(chartRoutes.inspectChart, input);

  return { error: read.error?.message ?? null, inspected: read.data ?? null };
};

export { useChartInspect };

export type { ChartInspect, Inspected };
