import type { ReactElement } from "react";

import {
  MARKUP_COLOR,
  NOTE_FONT,
  STROKE_WIDTH,
  toHeadPoints,
  toPenPoints,
} from "./markup-model.js";
import type { MarkupStroke } from "./markup-model.js";

const NOTE_PAD = 8;

const NOTE_CHAR = 0.6;

const NOTE_FILL = "#fff7d6";

const NOTE_INK = "#1c1c1e";

const MarkupStrokeView = ({
  stroke,
}: {
  readonly stroke: MarkupStroke;
}): ReactElement => {
  if (stroke.kind === "pen") {
    return (
      <polyline
        fill="none"
        points={toPenPoints(stroke.points)}
        stroke={MARKUP_COLOR}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={STROKE_WIDTH}
      />
    );
  }

  if (stroke.kind === "arrow") {
    return (
      <g
        fill="none"
        stroke={MARKUP_COLOR}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={STROKE_WIDTH}
      >
        <line
          x1={stroke.from.x}
          x2={stroke.to.x}
          y1={stroke.from.y}
          y2={stroke.to.y}
        />
        <polyline points={toHeadPoints(stroke.from, stroke.to)} />
      </g>
    );
  }

  if (stroke.kind === "box") {
    return (
      <rect
        fill="none"
        height={Math.abs(stroke.to.y - stroke.from.y)}
        stroke={MARKUP_COLOR}
        strokeWidth={STROKE_WIDTH}
        width={Math.abs(stroke.to.x - stroke.from.x)}
        x={Math.min(stroke.from.x, stroke.to.x)}
        y={Math.min(stroke.from.y, stroke.to.y)}
      />
    );
  }

  return (
    <g>
      <rect
        fill={NOTE_FILL}
        height={NOTE_FONT + NOTE_PAD * 2}
        stroke={MARKUP_COLOR}
        strokeWidth={STROKE_WIDTH / 2}
        width={stroke.text.length * NOTE_FONT * NOTE_CHAR + NOTE_PAD * 2}
        x={stroke.at.x}
        y={stroke.at.y}
      />
      <text
        dominantBaseline="hanging"
        fill={NOTE_INK}
        fontSize={NOTE_FONT}
        fontWeight={600}
        x={stroke.at.x + NOTE_PAD}
        y={stroke.at.y + NOTE_PAD}
      >
        {stroke.text}
      </text>
    </g>
  );
};

export { MarkupStrokeView };
