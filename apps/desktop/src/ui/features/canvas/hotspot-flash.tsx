import type { ReactElement } from "react";

import { HotspotBox } from "./hotspot-box.js";
import type { Rect } from "./hotspot-model.js";

interface HotspotFlashProps {
  readonly isHeld: boolean;
  readonly rects: readonly Rect[];
}

const toLayerClass = (isHeld: boolean): string => {
  if (isHeld) {
    return "hotspot-layer is-held";
  }

  return "hotspot-layer is-flash";
};

const HotspotFlash = ({ isHeld, rects }: HotspotFlashProps): ReactElement => (
  <div
    className={toLayerClass(isHeld)}
    aria-hidden="true"
    data-testid="hotspot-layer"
  >
    {rects.map((rect) => (
      <HotspotBox
        key={`${rect.x}:${rect.y}:${rect.width}:${rect.height}`}
        rect={rect}
      />
    ))}
  </div>
);

export { HotspotFlash };
