import { useMemo } from "react";
import type { ReactNode } from "react";

import type { MaskState } from "./use-diff-mask.js";

const PERCENT = 100;

interface OverlayMaskProps {
  readonly isShown: boolean;
  readonly opacity: number;
  readonly state: MaskState;
}

const OverlayMask = ({
  isShown,
  opacity,
  state,
}: OverlayMaskProps): ReactNode => {
  let shownOpacity = 0;

  if (isShown) {
    shownOpacity = opacity / PERCENT;
  }

  const style = useMemo(() => ({ opacity: shownOpacity }), [shownOpacity]);

  if (state.status !== "ready") {
    return null;
  }

  let className = "compare-mask off";

  if (isShown) {
    className = "compare-mask ";
  }

  return (
    <img
      className={className}
      data-testid="compare-mask"
      src={state.mask.url}
      alt=""
      draggable={false}
      style={style}
    />
  );
};

export { OverlayMask };
