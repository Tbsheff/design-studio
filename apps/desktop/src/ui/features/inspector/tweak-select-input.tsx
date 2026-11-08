import type { ChangeEvent, ReactElement } from "react";
import { useCallback } from "react";

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
    (event: ChangeEvent<HTMLSelectElement>) =>
      onEdit(control, event.currentTarget.value),
    [onEdit, control]
  );

  return (
    <select
      id={`twk-${control.id}`}
      className="ins-input twk-select"
      value={value}
      onChange={change}
    >
      {control.options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

export { TweakSelectInput };
