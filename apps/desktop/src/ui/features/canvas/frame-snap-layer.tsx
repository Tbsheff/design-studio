import type { ReactElement } from "react";
import { useSyncExternalStore } from "react";

import { formatMeasure } from "../../../shared/measure.js";
import { gapStyle, guideStyle, toSnapOriginStyle } from "./overlay-styles.js";
import { frameSnapStore } from "./use-frame-resize.js";

const FrameSnapLayer = ({
  origin,
}: {
  origin: { x: number; y: number };
}): ReactElement | null => {
  const view = useSyncExternalStore(
    frameSnapStore.subscribe,
    frameSnapStore.get
  );

  if (view.guides.length === 0 && view.spacing.length === 0) {
    return null;
  }

  return (
    <div
      className="snap-guides frame-snap"
      data-testid="frame-snap"
      style={toSnapOriginStyle(origin, view.shift)}
    >
      {view.guides.map((snapGuide) => (
        <div
          key={`g-${snapGuide.axis}-${snapGuide.at}`}
          className={`snap-guide ${snapGuide.axis}`}
          style={guideStyle(snapGuide)}
        />
      ))}
      {view.spacing.map((spacingBadgeValue) => (
        <div
          key={`s-${spacingBadgeValue.axis}-${spacingBadgeValue.from}-${spacingBadgeValue.to}`}
          className={`snap-gap ${spacingBadgeValue.axis}`}
          style={gapStyle(spacingBadgeValue)}
        >
          <span className="snap-gap-label" data-value={spacingBadgeValue.value}>
            {formatMeasure(spacingBadgeValue.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export { FrameSnapLayer };
