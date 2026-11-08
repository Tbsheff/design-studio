import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { VisionKind } from "./vision-model.js";

import styles from "./accessibility.module.css";

interface VisionChipProps {
  readonly isOn: boolean;
  readonly kind: VisionKind;
  readonly onToggle: (kind: VisionKind) => void;
}

const VisionChip = ({
  isOn,
  kind,
  onToggle,
}: VisionChipProps): ReactElement => {
  const handleToggleKind = useCallback((): void => {
    onToggle(kind);
  }, [kind, onToggle]);

  return (
    <button
      aria-pressed={isOn}
      className={styles.chip}
      type="button"
      onClick={handleToggleKind}
    >
      {copy.visionKind[kind]}
    </button>
  );
};

export { VisionChip };

export type { VisionChipProps };
