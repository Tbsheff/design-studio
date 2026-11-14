import { useCallback } from "react";
import type { ReactElement } from "react";

import type { ListType, ListTypeOption } from "./list-style-model.js";
import { toOnClass } from "./rows-model.js";

interface ListStyleButtonProps {
  readonly isCurrent: boolean;
  readonly isDisabled: boolean;
  readonly onPick: (type: ListType) => void;
  readonly option: ListTypeOption;
}

const ListStyleButton = ({
  isCurrent,
  isDisabled,
  onPick,
  option,
}: ListStyleButtonProps): ReactElement => {
  const handlePick = useCallback(() => {
    onPick(option.value);
  }, [onPick, option.value]);

  return (
    <button
      type="button"
      className={toOnClass(isCurrent)}
      aria-pressed={isCurrent}
      data-tip={option.tip}
      disabled={isDisabled}
      onClick={handlePick}
    >
      {option.label}
    </button>
  );
};

export { ListStyleButton };
