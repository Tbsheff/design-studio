import type { ReactElement } from "react";

import { formatMeasure } from "../../../shared/measure.js";
import { gapStyle } from "./overlay-styles.js";
import type { FreeMoveView } from "./use-free-move.js";

const FreeMoveSpacing = ({
  spacing,
}: {
  spacing: FreeMoveView["spacing"];
}): ReactElement | null => {
  if (spacing.length === 0) {
    return null;
  }

  return (
    <div className="snap-guides">
      {spacing.map((spacingBadge) => (
        <div
          key={`s-${spacingBadge.axis}-${spacingBadge.from}-${spacingBadge.to}`}
          className={`snap-gap ${spacingBadge.axis}`}
          style={gapStyle(spacingBadge)}
        >
          <span className="snap-gap-label" data-value={spacingBadge.value}>
            {formatMeasure(spacingBadge.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export { FreeMoveSpacing };
