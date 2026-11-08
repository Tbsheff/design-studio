import { useCallback } from "react";
import type { KeyboardEvent } from "react";

import { runStageFocus } from "./nudge-focus-model.js";
import { applyMixedShift, startSelect, toStep } from "./number-field-model.js";
import type { NumberSpec } from "./number-field-model.js";
import { toArrowSign } from "./number-input-model.js";
import type { UseNumberTextResult } from "./use-number-text.js";

const useNumberKeys = (
  spec: NumberSpec,
  field: UseNumberTextResult,
  shown: string
): ((event: KeyboardEvent<HTMLInputElement>) => void) => {
  const { cancel, isMixed, nudge, settle } = field;

  const arrow = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      event.preventDefault();
      const delta = toStep(event, spec) * toArrowSign(event);

      if (isMixed) {
        applyMixedShift(spec, delta);
        spec.edit.commitSoon();

        return;
      }

      nudge(delta, shown);
      startSelect(event.currentTarget);
    },
    [spec, isMixed, nudge, shown]
  );

  const keyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        arrow(event);

        return;
      }

      if (event.key === "Enter" && !event.nativeEvent.isComposing) {
        event.preventDefault();
        settle();
        startSelect(event.currentTarget);

        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        cancel();
        runStageFocus();
      }
    },
    [arrow, settle, cancel]
  );

  return keyDown;
};

export { useNumberKeys };
