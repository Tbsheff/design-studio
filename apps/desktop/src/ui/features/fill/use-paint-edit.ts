import { useCallback, useMemo } from "react";

import type { DirectEdit } from "./deps.js";

type Patch = Parameters<DirectEdit["preview"]>[0];

const PAINT_PROP = "background-color";

const noop = (): null => null;

const usePaintEdit = (
  edit: DirectEdit,
  color: string,
  onColor: (color: string) => void
): DirectEdit => {
  const preview = useCallback(
    (patch: Patch): void => {
      const next = patch[PAINT_PROP];

      if (next) {
        onColor(next);
      }
    },
    [onColor]
  );

  return useMemo(
    () => ({
      ...edit,
      commit: noop,
      commitSoon: noop,
      dirty: [],
      preview,
      revert: noop,
      shift: noop,
      values: { ...edit.values, [PAINT_PROP]: color },
    }),
    [color, edit, preview]
  );
};

export { PAINT_PROP, usePaintEdit };
