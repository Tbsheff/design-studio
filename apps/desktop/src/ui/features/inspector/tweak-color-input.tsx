import type { ReactElement } from "react";
import { createElement, useCallback, useContext } from "react";

import type { ColorTweak } from "../../../shared/tweaks.js";
import type { EditFn } from "./tweaks-model.js";
import { TweakColorSlot } from "./use-tweak-color-slot.js";

const TweakColorInput = ({
  control,
  value,
  onEdit,
}: {
  readonly control: ColorTweak;
  readonly value: string;
  readonly onEdit: EditFn;
}): ReactElement | null => {
  const Slot = useContext(TweakColorSlot);

  const change = useCallback(
    (next: string) => onEdit(control, next),
    [onEdit, control]
  );

  if (!Slot) {
    return null;
  }

  return (
    <>
      {createElement(Slot, {
        label: control.label,
        onChange: change,
        swatch: value,
        value,
      })}
    </>
  );
};

export { TweakColorInput };
