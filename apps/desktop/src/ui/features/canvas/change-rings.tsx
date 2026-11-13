import type { CSSProperties, ReactElement } from "react";

import type { ChangeRing, ChangeSpot } from "./change-rings-model.js";
import { toRectStyle } from "./overlay-styles.js";

interface ChangeRingsProps {
  readonly spot: ChangeSpot | null;
  readonly zoom: number;
}

const RING_PX = 2;

const toRingKey = (ring: ChangeRing): string =>
  `${ring.item.kind}-${ring.item.layerId}`;

const toRingStyle = (ring: ChangeRing, zoom: number): CSSProperties => {
  if (!ring.rect) {
    return {};
  }

  return { ...toRectStyle(ring.rect, null), borderWidth: RING_PX / zoom };
};

const ChangeRings = ({ spot, zoom }: ChangeRingsProps): ReactElement | null => {
  if (!spot) {
    return null;
  }

  return (
    <div key={spot.key} className="change-rings" aria-hidden="true">
      {spot.rings.map((ring) => {
        if (!ring.rect) {
          return null;
        }

        return (
          <div
            key={toRingKey(ring)}
            className="change-ring"
            data-kind={ring.item.kind}
            data-layer-id={ring.item.layerId}
            data-undone={ring.isUndone}
            style={toRingStyle(ring, zoom)}
          />
        );
      })}
    </div>
  );
};

export { ChangeRings };
