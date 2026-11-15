import { useCallback, useMemo } from "react";

import { copy } from "./copy.js";
import {
  SMOOTHING_PROP,
  IOS_PERCENT,
  MAX_PERCENT,
  PERCENT_UNIT,
  SMOOTHING_PART,
  SMOOTHING_SLOT,
  hasRadius,
  toSmoothingCss,
  toCssFromText,
  toFieldText,
  toSmoothingPercent,
} from "./corner-smoothing-model.js";
import type { NumberSpec } from "./number-field-model.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { createProxyEdit } from "./use-proxy-edit.js";

interface CornerSmoothing {
  readonly handleIos: () => void;
  readonly isIos: boolean;
  readonly isShown: boolean;
  readonly spec: NumberSpec;
}

const useCornerSmoothing = (edit: DirectEdit): CornerSmoothing => {
  const percent = toSmoothingPercent(edit.values[SMOOTHING_PROP]);
  const isMixed = edit.mixed.has(SMOOTHING_PROP);

  const spec = useMemo(
    () => ({
      edit: createProxyEdit(
        edit,
        SMOOTHING_SLOT,
        toFieldText(percent, isMixed),
        {
          isMixed: null,
          part: SMOOTHING_PART,
          real: [SMOOTHING_PROP],
          write: (value) => ({ [SMOOTHING_PROP]: toCssFromText(value) }),
        }
      ),
      label: copy.cornerSmoothing,
      max: MAX_PERCENT,
      min: 0,
      prop: SMOOTHING_SLOT,
      unit: PERCENT_UNIT,
    }),
    [edit, percent, isMixed]
  );

  const handleIos = useCallback((): void => {
    edit.preview({ [SMOOTHING_PROP]: toSmoothingCss(IOS_PERCENT) });
    edit.commit();
  }, [edit]);

  const isIos = !isMixed && percent === IOS_PERCENT;
  const isShown = hasRadius(edit.values["border-radius"]);

  return { handleIos, isIos, isShown, spec };
};

export { useCornerSmoothing };

export type { CornerSmoothing };
