import { useCallback } from "react";
import type { ReactElement } from "react";

import type { LayoutOption, ScreenLayoutId } from "./screen-model.js";

import styles from "./screen.module.css";

interface ScreenLayoutTileProps {
  readonly isPicked: boolean;
  readonly onPick: (layout: ScreenLayoutId) => void;
  readonly option: LayoutOption;
}

const ScreenLayoutTile = ({
  isPicked,
  onPick,
  option,
}: ScreenLayoutTileProps): ReactElement => {
  const { id } = option;
  const pick = useCallback((): void => onPick(id), [id, onPick]);

  return (
    <button
      aria-pressed={isPicked}
      className={styles.tile}
      onClick={pick}
      type="button"
    >
      <span className={styles.tileName}>{option.label}</span>
      <span className={styles.tileNote}>{option.note}</span>
    </button>
  );
};

export { ScreenLayoutTile };
