import { useCallback } from "react";
import type { ReactElement } from "react";

import { toChipClass } from "./variant-bar-model.js";

interface Props {
  readonly id: string;
  readonly label: string;
  readonly isPressed: boolean;
  readonly tip: string;
  readonly onToggle: (id: string) => void;
}

const VariantChip = ({
  id,
  label,
  isPressed,
  tip,
  onToggle,
}: Props): ReactElement => {
  const handleToggle = useCallback((): void => {
    onToggle(id);
  }, [id, onToggle]);

  return (
    <button
      type="button"
      className={toChipClass(isPressed)}
      aria-pressed={isPressed}
      data-tip={tip}
      onClick={handleToggle}
    >
      {label}
    </button>
  );
};

export { VariantChip };
