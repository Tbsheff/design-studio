import type { ReactElement } from "react";

import type { TweakControl, TweakValue } from "../../../shared/tweaks.js";
import { TweakColorInput } from "./tweak-color-input.js";
import { TweakRangeInput } from "./tweak-range-input.js";
import { TweakSelectInput } from "./tweak-select-input.js";
import { TweakToggleInput } from "./tweak-toggle-input.js";
import type { EditFn } from "./tweaks-model.js";

const TweakControlInput = ({
  control,
  value,
  onEdit,
}: {
  readonly control: TweakControl;
  readonly value: TweakValue;
  readonly onEdit: EditFn;
}): ReactElement => {
  if (control.type === "range") {
    return (
      <TweakRangeInput
        control={control}
        value={Number(value)}
        onEdit={onEdit}
      />
    );
  }

  if (control.type === "toggle") {
    return (
      <TweakToggleInput
        control={control}
        isOn={value === true}
        onEdit={onEdit}
      />
    );
  }

  if (control.type === "select") {
    return (
      <TweakSelectInput
        control={control}
        value={String(value)}
        onEdit={onEdit}
      />
    );
  }

  return (
    <TweakColorInput control={control} value={String(value)} onEdit={onEdit} />
  );
};

export { TweakControlInput };
