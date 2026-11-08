import { useCallback } from "react";
import type { ReactElement } from "react";

import { toOnClass } from "./auto-layout-model.js";

interface Props {
  readonly col: number;
  readonly row: number;
  readonly isOn: boolean;
  readonly label: string;
  readonly onPick: (col: number, row: number) => void;
}

const AlignCellButton = ({
  col,
  row,
  isOn,
  label,
  onPick,
}: Props): ReactElement => {
  const handlePick = useCallback((): void => {
    onPick(col, row);
  }, [col, onPick, row]);

  return (
    <button
      type="button"
      className={toOnClass(isOn)}
      aria-label={label}
      aria-pressed={isOn}
      data-tip={label}
      onClick={handlePick}
    >
      <span className="ins-align-dot" aria-hidden="true" />
    </button>
  );
};

export { AlignCellButton };
