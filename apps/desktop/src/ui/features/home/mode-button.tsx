import { useCallback } from "react";
import type { ReactElement } from "react";

import type { RunMode } from "./app-chip-model.js";
import { toClassName } from "./project-card-model.js";
import { RADIO_ROLE } from "./radio-role-model.js";

interface ModeButtonProps {
  readonly mode: RunMode;
  readonly current: RunMode;
  readonly label: string;
  readonly onSelect: (mode: RunMode) => void;
}

const ModeButton = ({
  mode,
  current,
  label,
  onSelect,
}: ModeButtonProps): ReactElement => {
  const select = useCallback((): void => {
    onSelect(mode);
  }, [mode, onSelect]);

  return (
    <button
      type="button"
      role={RADIO_ROLE}
      aria-checked={mode === current}
      className={toClassName(mode === current && "on")}
      onClick={select}
    >
      {label}
    </button>
  );
};

export { ModeButton };
