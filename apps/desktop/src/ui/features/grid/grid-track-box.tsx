import { useMemo } from "react";
import type { ReactElement } from "react";

import styles from "./grid.module.css";

interface GridTrackBoxProps {
  readonly height: number;
  readonly label: string;
  readonly labelLeft: number;
  readonly labelTop: number;
  readonly isColumn: boolean;
  readonly width: number;
  readonly left: number;
  readonly top: number;
}

const GridTrackBox = ({
  height,
  isColumn,
  label,
  labelLeft,
  labelTop,
  left,
  top,
  width,
}: GridTrackBoxProps): ReactElement => {
  const box = useMemo(
    () => ({ height, left, top, width }),
    [height, left, top, width]
  );

  const chip = useMemo(() => {
    if (isColumn) {
      return { left: labelLeft, top: labelTop, translate: "-50% -140%" };
    }

    return { left: labelLeft, top: labelTop, translate: "-130% -50%" };
  }, [isColumn, labelLeft, labelTop]);

  return (
    <>
      <div className={styles.track} style={box} />
      <span className={styles.chip} data-testid="grid-track-chip" style={chip}>
        {label}
      </span>
    </>
  );
};

export { GridTrackBox };

export type { GridTrackBoxProps };
