import { useCallback } from "react";
import type { ReactElement } from "react";

import { toOnClass } from "./rows-model.js";
import type { TextWrap, TextWrapOption } from "./text-wrap-model.js";

interface TextWrapButtonProps {
  readonly isCurrent: boolean;
  readonly isDisabled: boolean;
  readonly onPick: (wrap: TextWrap) => void;
  readonly option: TextWrapOption;
}

const TextWrapButton = ({
  isCurrent,
  isDisabled,
  onPick,
  option,
}: TextWrapButtonProps): ReactElement => {
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

export { TextWrapButton };
