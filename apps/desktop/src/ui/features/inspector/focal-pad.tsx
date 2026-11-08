import { useMemo } from "react";
import type { ReactElement } from "react";

import { focalText } from "../../../shared/image.js";
import { copy } from "./copy.js";
import { toPadClass, toPadTabIndex } from "./focal-pad-model.js";
import { useFocalPad } from "./use-focal-pad.js";

interface FocalPadProps {
  readonly value: string;
  readonly isDisabled: boolean;
  readonly onPick: (focal: string) => void;
}

const FocalPad = ({
  value,
  isDisabled,
  onPick,
}: FocalPadProps): ReactElement => {
  const pad = useFocalPad(value, isDisabled, onPick);
  const { point } = pad;

  const dotStyle = useMemo(
    () => ({ left: `${point.x}%`, top: `${point.y}%` }),
    [point.x, point.y]
  );

  return (
    <button
      type="button"
      className={toPadClass(isDisabled)}
      tabIndex={toPadTabIndex(isDisabled)}
      aria-label={`${copy.focalPoint} ${focalText(point.x, point.y)}`}
      data-tip={copy.clickOrDragToSet}
      onPointerDown={pad.handlePointerDown}
      onPointerMove={pad.handlePointerMove}
      onPointerUp={pad.handlePointerUp}
      onPointerCancel={pad.handlePointerCancel}
      onKeyDown={pad.handleKeyDown}
    >
      <span className="img-focal-dot" style={dotStyle} />
    </button>
  );
};

export { FocalPad };
