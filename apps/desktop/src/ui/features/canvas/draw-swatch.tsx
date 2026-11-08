import { useCallback, useMemo } from "react";
import type { CSSProperties, ReactElement } from "react";

import type { DRAW_COLORS } from "./drawing-model.js";

const DrawSwatch = ({
  color,
  isChosen,
  pick,
}: {
  color: (typeof DRAW_COLORS)[number];
  isChosen: boolean;
  pick: (value: string) => void;
}): ReactElement => {
  const choose = useCallback(() => pick(color.value), [pick, color.value]);

  const style = useMemo<CSSProperties>(
    () => ({ color: color.value }),
    [color.value]
  );

  return (
    <input
      type="radio"
      name="draw-color"
      className="draw-swatch"
      aria-label={color.label}
      checked={isChosen}
      style={style}
      onChange={choose}
    />
  );
};

export { DrawSwatch };
