import { useMemo } from "react";
import type { CSSProperties, ReactElement } from "react";

import { strokePositionCopy } from "./copy.js";
import { toRingWidthText } from "./stroke-position-model.js";
import type { RingStroke } from "./stroke-position-model.js";
import { useStrokePositionRing } from "./use-stroke-position-ring.js";

interface StrokePositionRingProps {
  readonly ring: RingStroke;
  readonly onRingColor: (color: string) => void;
  readonly onRingWidth: (width: number) => void;
}

const WIDTH_ID = "ins-ring-width";

const COLOR_ID = "ins-ring-color";

const StrokePositionRing = ({
  ring,
  onRingColor,
  onRingWidth,
}: StrokePositionRingProps): ReactElement => {
  const swatch = useMemo<CSSProperties>(
    () => ({ background: ring.color }),
    [ring.color]
  );

  const { blurColor, blurWidth, keyColor, keyWidth } = useStrokePositionRing(
    ring,
    onRingColor,
    onRingWidth
  );

  return (
    <>
      <div className="ins-field">
        <label htmlFor={WIDTH_ID} className="ins-scrub static">
          {strokePositionCopy.width}
        </label>
        <input
          key={ring.width}
          id={WIDTH_ID}
          className="ins-input"
          aria-label={strokePositionCopy.widthLabel}
          defaultValue={toRingWidthText(ring.width)}
          spellCheck={false}
          autoComplete="off"
          onKeyDown={keyWidth}
          onBlur={blurWidth}
        />
      </div>
      <div className="ins-field wide">
        <label htmlFor={COLOR_ID} className="ins-scrub static">
          {strokePositionCopy.color}
        </label>
        <input
          key={ring.color}
          id={COLOR_ID}
          className="ins-input"
          aria-label={strokePositionCopy.colorLabel}
          defaultValue={ring.color}
          spellCheck={false}
          autoComplete="off"
          onKeyDown={keyColor}
          onBlur={blurColor}
        />
        <span className="ins-swatch" style={swatch} />
      </div>
    </>
  );
};

export { StrokePositionRing };
