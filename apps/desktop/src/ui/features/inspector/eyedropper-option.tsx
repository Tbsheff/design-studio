import { useCallback } from "react";
import type { MouseEvent, ReactElement } from "react";

import { toDeltaLabel } from "./eyedropper-model.js";
import type { NearToken } from "./eyedropper-model.js";
import { EyedropperSwatch } from "./eyedropper-swatch.js";

interface OptionProps {
  readonly isActive: boolean;
  readonly index: number;
  readonly token: NearToken;
  readonly onChoose: (cssVar: string) => void;
  readonly onHover: (index: number) => void;
}

const toOptionClass = (isActive: boolean): string => {
  if (isActive) {
    return "eyedrop-option active";
  }

  return "eyedrop-option";
};

const handleMouseDown = (event: MouseEvent): void => {
  event.preventDefault();
};

const EyedropperOption = ({
  isActive,
  index,
  token,
  onChoose,
  onHover,
}: OptionProps): ReactElement => {
  const handleChoose = useCallback(
    (): void => onChoose(token.cssVar),
    [onChoose, token]
  );

  const handleHover = useCallback((): void => onHover(index), [onHover, index]);

  return (
    <li>
      <button
        type="button"
        className={toOptionClass(isActive)}
        aria-current={isActive}
        data-token={token.cssVar}
        onMouseDown={handleMouseDown}
        onMouseEnter={handleHover}
        onClick={handleChoose}
      >
        <EyedropperSwatch color={token.value} />
        <span className="eyedrop-name">{token.name}</span>
        <span className="eyedrop-delta">{toDeltaLabel(token.deltaE)}</span>
      </button>
    </li>
  );
};

export { EyedropperOption };
