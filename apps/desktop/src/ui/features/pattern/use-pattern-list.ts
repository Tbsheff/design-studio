import { useMemo } from "react";

import { patternRoutes, useAction } from "./deps.js";
import { isMatch } from "./pattern-model.js";
import type { PatternItem } from "./pattern-model.js";

interface PatternList {
  readonly error: string | null;
  readonly isLoading: boolean;
  readonly items: readonly PatternItem[];
  readonly total: number;
}

const LIST_LIMIT = 200;

const usePatternList = (query: string): PatternList => {
  const input = useMemo(() => ({ limit: LIST_LIMIT }), []);
  const read = useAction(patternRoutes.listPattern, input);
  const all = useMemo(() => read.data?.items ?? [], [read.data]);

  const kept = useMemo(
    () => all.filter((item) => isMatch(item, query)),
    [all, query]
  );

  return {
    error: read.error?.message ?? null,
    isLoading: read.loading,
    items: kept,
    total: all.length,
  };
};

export { usePatternList };

export type { PatternList };
