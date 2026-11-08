import type { CommentDrawing } from "@design-studio/contracts";
import type { CSSProperties, ReactElement } from "react";

import { strokePath } from "./drawing-model.js";

const HALO_EXTRA = 3;

const HALO_STYLE: CSSProperties = { stroke: "var(--halo)" };

const toStrokeKey = (stroke: CommentDrawing["strokes"][number]): string => {
  const [first] = stroke.points;

  return `${stroke.color}-${stroke.points.length}-${first}`;
};

const DrawingStrokes = ({
  drawing,
}: {
  drawing: CommentDrawing;
}): ReactElement => {
  const { width, height } = drawing.frame;

  return (
    <svg
      className="drawing-strokes"
      data-testid="comment-drawing"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      {drawing.strokes.map((stroke) => {
        const delta = strokePath(stroke.points);

        return (
          <g key={toStrokeKey(stroke)}>
            <path
              d={delta}
              style={HALO_STYLE}
              strokeWidth={stroke.width + HALO_EXTRA}
            />
            <path d={delta} stroke={stroke.color} strokeWidth={stroke.width} />
          </g>
        );
      })}
    </svg>
  );
};

export { DrawingStrokes };
