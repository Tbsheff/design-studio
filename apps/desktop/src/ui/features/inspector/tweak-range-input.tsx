import type { ChangeEvent, ReactElement } from "react";
import { useCallback } from "react";

import type { RangeTweak } from "../../../shared/tweaks.js";
import { toReadout } from "./tweaks-model.js";
import type { EditFn } from "./tweaks-model.js";

const TweakRangeInput = ({
  control,
  value,
  onEdit,
}: {
  readonly control: RangeTweak;
  readonly value: number;
  readonly onEdit: EditFn;
}): ReactElement => {
  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      onEdit(control, Number(event.currentTarget.value)),
    [onEdit, control]
  );

  return (
    <input
      id={`twk-${control.id}`}
      type="range"
      className="twk-range"
      min={control.min}
      max={control.max}
      step={control.step ?? "any"}
      value={value}
      aria-valuetext={toReadout(control, value)}
      onChange={change}
    />
  );
};

export { TweakRangeInput };
