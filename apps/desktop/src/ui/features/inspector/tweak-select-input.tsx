import { UiSelect } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import type { SelectTweak } from "../../../shared/tweaks.js";
import type { EditFn } from "./tweaks-model.js";

const TweakSelectInput = ({
  control,
  value,
  onEdit,
}: {
  readonly control: SelectTweak;
  readonly value: string;
  readonly onEdit: EditFn;
}): ReactElement => {
  const change = useCallback(
    (next: string) => onEdit(control, next),
    [onEdit, control]
  );

  return (
    <UiSelect
      id={`twk-${control.id}`}
      options={control.options}
      size="sm"
      value={value}
      onChange={change}
    />
  );
};

export { TweakSelectInput };
