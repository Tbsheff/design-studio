import type { ShipMode } from "@design-studio/contracts/ship";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { pick } from "./pick.js";

interface ShipModeOptionProps {
  readonly id: ShipMode;
  readonly label: string;
  readonly hint: string;
  readonly blockedBy: string | null;
  readonly isChecked: boolean;
  readonly onMode: (mode: ShipMode) => void;
}

const ShipModeOption = ({
  blockedBy,
  hint,
  id,
  isChecked,
  label,
  onMode,
}: ShipModeOptionProps): ReactElement => {
  const selectMode = useCallback((): void => {
    onMode(id);
  }, [id, onMode]);

  return (
    <label
      className={`ship-mode${pick(blockedBy, " off", "")}`}
      data-tip={blockedBy ?? hint}
    >
      <input
        type="radio"
        name="ship-mode"
        checked={isChecked}
        disabled={Boolean(blockedBy)}
        onChange={selectMode}
      />
      <span>{label}</span>
      <small>{blockedBy ?? hint}</small>
    </label>
  );
};

export { ShipModeOption };
