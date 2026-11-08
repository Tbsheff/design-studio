import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement } from "react";
import { useCallback } from "react";

import { PIN_OPTIONS, pinPatch } from "./constraints.js";
import type { PinAxis, PinMode } from "./constraints.js";
import type { DirectEdit } from "./deps.js";
import { InspectorSelect } from "./inspector-fields.js";
import {
  PIN_LABEL,
  PIN_SHORT,
  PIN_TIPS,
  toPinMode,
  toPinStyles,
} from "./position-model.js";

const PinSelect = ({
  axis,
  mode,
  edit,
  selection,
  onPick,
  isReady,
  queue,
}: {
  readonly axis: PinAxis;
  readonly mode: PinMode;
  readonly edit: DirectEdit;
  readonly selection: SelectionContext;
  readonly onPick: (axis: PinAxis, mode: PinMode) => void;
  readonly isReady: boolean;
  readonly queue: (axis: PinAxis, mode: PinMode, from: PinMode) => void;
}): ReactElement => {
  const change = useCallback(
    (value: string): void => {
      const next = toPinMode(axis, value);

      if (next === null || next === mode) {
        return;
      }

      onPick(axis, next);

      if (!isReady) {
        queue(axis, next, mode);

        return;
      }

      edit.previewForced(
        pinPatch(axis, next, toPinStyles(edit, selection), mode)
      );
      edit.commit();
    },
    [axis, mode, onPick, isReady, queue, edit, selection]
  );

  return (
    <div
      className="ins-field select ins-pin"
      data-tip={PIN_TIPS[axis]}
      data-tip-align="end"
    >
      <span className="ins-scrub static">{PIN_SHORT[axis]}</span>
      <InspectorSelect
        id={`ins-pin-${axis}`}
        label={PIN_LABEL[axis]}
        value={mode}
        placeholder=""
        isDisabled={false}
        options={PIN_OPTIONS[axis]}
        onChange={change}
      />
    </div>
  );
};

export { PinSelect };
