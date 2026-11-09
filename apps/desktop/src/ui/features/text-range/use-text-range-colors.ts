import { useMemo } from "react";

import { tokenRoutes, useAction } from "./deps.js";
import { isColorValue } from "./text-range-model.js";

interface TextRangeColor {
  readonly className: string;
  readonly value: string;
}

const COLOR_PREFIX = "text-";

const COLOR_LIMIT = 12;

const useTextRangeColors = (
  projectId: string,
  directionId: string | null,
  isOpen: boolean
): readonly TextRangeColor[] => {
  const input = useMemo(() => {
    if (!isOpen || directionId === null) {
      return null;
    }

    const cursor = null;
    const limit = 100;

    return { cursor, directionId, limit, projectId, query: COLOR_PREFIX };
  }, [directionId, isOpen, projectId]);

  const found = useAction(tokenRoutes.listClassesToken, input);
  const items = found.data?.items;

  return useMemo(
    () =>
      (items ?? [])
        .filter((item) => isColorValue(item.value))
        .slice(0, COLOR_LIMIT)
        .map((item) => ({ className: item.className, value: item.value })),
    [items]
  );
};

export { useTextRangeColors };

export type { TextRangeColor };
