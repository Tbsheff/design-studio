import { useCallback } from "react";
import type { ReactElement } from "react";

import styles from "./screen.module.css";

interface ScreenGroupChipProps {
  readonly isPicked: boolean;
  readonly name: string;
  readonly onPick: (name: string) => void;
}

const ScreenGroupChip = ({
  isPicked,
  name,
  onPick,
}: ScreenGroupChipProps): ReactElement => {
  const pick = useCallback((): void => onPick(name), [name, onPick]);

  return (
    <button
      aria-pressed={isPicked}
      className={styles.chip}
      onClick={pick}
      type="button"
    >
      {name}
    </button>
  );
};

export { ScreenGroupChip };
