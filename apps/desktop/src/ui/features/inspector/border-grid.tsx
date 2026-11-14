import type { ReactElement } from "react";

import { BorderInsideFields } from "./border-inside-fields.js";
import { BorderSideRow } from "./border-side-row.js";
import type { DirectEdit } from "./deps.js";
import { toShownSide } from "./stroke-position-model.js";
import { StrokePositionOutline } from "./stroke-position-outline.js";
import { StrokePositionRing } from "./stroke-position-ring.js";
import { StrokePositionRow } from "./stroke-position-row.js";
import { useBorderSides } from "./use-border-sides.js";
import type { StrokePositionControls } from "./use-stroke-position.js";

interface BorderGridProps {
  readonly edit: DirectEdit;
  readonly stroke: StrokePositionControls;
}

const BorderGrid = ({ edit, stroke }: BorderGridProps): ReactElement => {
  const { side, handleSidePick } = useBorderSides(edit);
  const isInside = stroke.position === "inside" && stroke.ring === null;
  const isOutline = !isInside && stroke.ring === null;

  return (
    <div className="ins-grid">
      <StrokePositionRow
        isAllSides={!isInside || side === "all"}
        position={stroke.position}
        onPositionPick={stroke.handlePositionPick}
      />
      <BorderSideRow
        isDisabled={!isInside}
        side={toShownSide(side, isInside)}
        onSidePick={handleSidePick}
      />
      {isInside && <BorderInsideFields edit={edit} side={side} />}
      {isOutline && <StrokePositionOutline edit={stroke.outlineEdit} />}
      {stroke.ring && (
        <StrokePositionRing
          ring={stroke.ring}
          onRingColor={stroke.handleRingColor}
          onRingWidth={stroke.handleRingWidth}
        />
      )}
      {stroke.error && (
        <p className="ins-note wide" role="alert">
          {stroke.error}
        </p>
      )}
    </div>
  );
};

export { BorderGrid };
