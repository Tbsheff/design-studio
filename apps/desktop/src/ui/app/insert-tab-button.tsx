import { useCallback } from "react";
import type { ReactElement } from "react";

import type { InsertPick } from "./use-insert-panel.js";

interface InsertTabButtonProps {
  readonly active: InsertPick;
  readonly id: InsertPick;
  readonly label: string;
  readonly onPick: (pick: InsertPick) => void;
}

const InsertTabButton = ({
  active,
  id,
  label,
  onPick,
}: InsertTabButtonProps): ReactElement => {
  const pick = useCallback((): void => onPick(id), [id, onPick]);

  return (
    <button
      aria-selected={active === id}
      className="pane-insert-tab"
      onClick={pick}
      role="tab"
      type="button"
    >
      {label}
    </button>
  );
};

export { InsertTabButton };
