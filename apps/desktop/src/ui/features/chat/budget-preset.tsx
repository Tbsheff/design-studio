import { useCallback } from "react";
import type { ReactElement } from "react";

import { money } from "./budget-limit-model.js";

const BudgetPreset = ({
  current,
  value,
  onPick,
}: {
  current: number | null;
  value: number | null;
  onPick: (value: number | null) => void;
}): ReactElement => {
  const handlePick = useCallback(() => onPick(value), [onPick, value]);
  let label = "No limit";

  if (value !== null) {
    label = money(value);
  }

  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={current === value}
      className="ui-menu-item"
      onClick={handlePick}
    >
      {label}
    </button>
  );
};

export { BudgetPreset };
