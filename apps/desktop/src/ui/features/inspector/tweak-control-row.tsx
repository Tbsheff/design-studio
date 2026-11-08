import type { ReactElement } from "react";

import type { TweakControl, TweakValue } from "../../../shared/tweaks.js";
import { TweakControlHead } from "./tweak-control-head.js";
import { TweakControlInput } from "./tweak-control-input.js";
import { toChangedClass } from "./tweaks-model.js";
import type { EditFn } from "./tweaks-model.js";

const TweakControlRow = ({
  control,
  value,
  isChanged,
  onEdit,
  onRevert,
}: {
  readonly control: TweakControl;
  readonly value: TweakValue;
  readonly isChanged: boolean;
  readonly onEdit: EditFn;
  readonly onRevert: (id: string) => void;
}): ReactElement => (
  <li
    className={`twk-row twk-row-${control.type} ${toChangedClass(isChanged)}`}
    data-tweak={control.id}
  >
    <TweakControlHead
      control={control}
      value={value}
      isChanged={isChanged}
      onRevert={onRevert}
    />
    <TweakControlInput control={control} value={value} onEdit={onEdit} />
  </li>
);

export { TweakControlRow };
