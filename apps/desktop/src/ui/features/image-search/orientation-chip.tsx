import { useCallback } from "react";
import type { ReactElement } from "react";

import { ORIENTATION_LABEL } from "./copy.js";
import type { ImageOrientation } from "./deps.js";

interface OrientationChipProps {
  readonly isOn: boolean;
  readonly onPick: (next: ImageOrientation) => void;
  readonly value: ImageOrientation;
}

const chipClass = (isOn: boolean): string => {
  if (isOn) {
    return "btn small on";
  }

  return "btn small ghost";
};

const OrientationChip = ({
  isOn,
  onPick,
  value,
}: OrientationChipProps): ReactElement => {
  const handlePick = useCallback((): void => {
    onPick(value);
  }, [onPick, value]);

  return (
    <button
      aria-pressed={isOn}
      className={chipClass(isOn)}
      type="button"
      onClick={handlePick}
    >
      {ORIENTATION_LABEL[value]}
    </button>
  );
};

export { OrientationChip };
