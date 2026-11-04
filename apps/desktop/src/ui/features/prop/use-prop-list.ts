import { useMemo } from "react";

import { propRoutes, useAction } from "./deps.js";
import type { PropRowView, PropTarget } from "./prop-model.js";

interface PropList {
  readonly error: string | null;
  readonly isLoading: boolean;
  readonly rows: readonly PropRowView[];
}

const usePropList = (target: PropTarget): PropList => {
  const { component, directionId, file, projectId } = target;

  const input = useMemo(
    () => ({ component, directionId, file, projectId }),
    [component, directionId, file, projectId]
  );

  const read = useAction(propRoutes.listProp, input);
  const rows = useMemo(() => read.data?.items ?? [], [read.data]);

  return {
    error: read.error?.message ?? null,
    isLoading: read.loading,
    rows,
  };
};

export { usePropList };

export type { PropList };
