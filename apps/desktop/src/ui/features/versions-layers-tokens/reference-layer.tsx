import { useMemo } from "react";
import type { ReactNode } from "react";

import type { Picture } from "./use-picture.js";

const PERCENT = 100;

interface ReferenceLayerProps {
  readonly opacity: number;
  readonly picture: Picture;
  readonly pos: number;
}

const ReferenceLayer = ({
  opacity,
  picture,
  pos,
}: ReferenceLayerProps): ReactNode => {
  const style = useMemo(
    () => ({ clipPath: `inset(0 0 0 ${pos}%)`, opacity: opacity / PERCENT }),
    [opacity, pos]
  );

  return (
    <div className="compare-layer" style={style}>
      <img
        className="compare-ref-picture"
        data-testid="compare-ref-picture"
        src={picture.url}
        alt={`Reference ${picture.name}`}
        draggable={false}
      />
    </div>
  );
};

export { ReferenceLayer };
