import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { VectorColorRow } from "./vector-color-row.js";
import type { PaintValues } from "./vector-model.js";
import { VectorWidthRow } from "./vector-width-row.js";

const VectorPaintGrid = ({
  paint,
  isDisabled,
  onFill,
  onStroke,
  onWidth,
}: {
  readonly paint: PaintValues;
  readonly isDisabled: boolean;
  readonly onFill: (fill: string | null) => void;
  readonly onStroke: (stroke: string | null) => void;
  readonly onWidth: (width: number | null) => void;
}): ReactElement => (
  <div className="ins-grid">
    <div className="wide">
      <VectorColorRow
        label={copy.fill}
        value={paint.fill}
        isDisabled={isDisabled}
        onSave={onFill}
      />
    </div>
    <VectorColorRow
      label={copy.stroke}
      value={paint.stroke}
      isDisabled={isDisabled}
      onSave={onStroke}
    />
    <VectorWidthRow
      value={paint.width}
      isDisabled={isDisabled}
      onSave={onWidth}
    />
  </div>
);

export { VectorPaintGrid };
