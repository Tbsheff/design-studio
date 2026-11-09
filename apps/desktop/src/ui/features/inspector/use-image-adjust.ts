import { createContext, useCallback, useContext, useMemo } from "react";

import {
  hasAdjust,
  toAdjustValues,
  toWithAdjust,
  toWithoutAdjust,
} from "./image-adjust-model.js";
import type { AdjustField, AdjustValues } from "./image-adjust-model.js";
import type { DirectEdit } from "./use-direct-edit.js";

interface ImageAdjust {
  readonly isAdjusted: boolean;
  readonly values: AdjustValues;
  readonly handleChange: (field: AdjustField, value: number) => void;
  readonly handleRelease: () => void;
  readonly handleReset: () => void;
}

const DirectEditContext = createContext<DirectEdit | null>(null);

const useImageAdjust = (): ImageAdjust | null => {
  const edit = useContext(DirectEditContext);
  const filter = edit?.values.filter ?? "";
  const values = useMemo(() => toAdjustValues(filter), [filter]);

  const handleChange = useCallback(
    (field: AdjustField, value: number): void => {
      edit?.preview({ filter: toWithAdjust(filter, field, value) });
    },
    [edit, filter]
  );

  const handleRelease = useCallback((): void => {
    edit?.commit();
  }, [edit]);

  const handleReset = useCallback((): void => {
    edit?.preview({ filter: toWithoutAdjust(filter) });
    edit?.commit();
  }, [edit, filter]);

  if (!edit) {
    return null;
  }

  const isAdjusted = hasAdjust(values);

  return {
    handleChange,
    handleRelease,
    handleReset,
    isAdjusted,
    values,
  };
};

export { DirectEditContext, useImageAdjust };

export type { ImageAdjust };
