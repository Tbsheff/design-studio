import type { ReactElement } from "react";

import type { ChangeRing, ChangeSpot } from "./change-rings-model.js";
import { toRectStyle } from "./overlay-styles.js";

interface ChangeRingsProps {
  readonly spot: ChangeSpot | null;
}

const toRingKey = (ring: ChangeRing): string =>
  `${ring.item.kind}-${ring.item.layerId}`;

const ChangeRings = ({ spot }: ChangeRingsProps): ReactElement | null => {
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
            style={toRectStyle(ring.rect, null)}
          />
        );
      })}
    </div>
  );
};

export { ChangeRings };
