import { useCallback } from "react";
import type { ReactElement } from "react";

import { toCountClass, toCountTip } from "./element-variants-model.js";

interface Props {
  readonly value: number;
  readonly max: number;
  readonly isSelected: boolean;
  readonly onPick: (value: number) => void;
}

const ElementVariantsCountButton = ({
  value,
  max,
  isSelected,
  onPick,
}: Props): ReactElement => {
  const isOver = value > max;

  const handlePick = useCallback((): void => {
    if (!isOver) {
      onPick(value);
    }
  }, [isOver, onPick, value]);

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      aria-disabled={isOver}
      className={toCountClass(isSelected)}
      data-tip={toCountTip({ isOver, max })}
      onClick={handlePick}
    >
      {value}
    </button>
  );
};

export { ElementVariantsCountButton };
