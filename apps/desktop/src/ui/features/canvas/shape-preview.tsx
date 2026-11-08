import { useMemo } from "react";
import type { ReactElement } from "react";

import type { Box } from "./canvas-frames-model.js";
import { PREVIEW_STROKE } from "./vector-preview-model.js";
import type { VectorToolId } from "./vector-tool-model.js";

const renderOutline = (
  tool: VectorToolId,
  box: Box,
  stroke: number
): ReactElement => {
  if (tool === "ellipse") {
    return (
      <ellipse
        cx={box.x + box.width / 2}
        cy={box.y + box.height / 2}
        rx={box.width / 2}
        ry={box.height / 2}
        strokeWidth={stroke}
      />
    );
  }

  return (
    <rect
      x={box.x}
      y={box.y}
      width={box.width}
      height={box.height}
      strokeWidth={stroke}
    />
  );
};

const DragBoxPreview = ({
  tool,
  box,
  zoom,
}: {
  tool: VectorToolId;
  box: Box;
  zoom: number;
}): ReactElement => {
  const stroke = PREVIEW_STROKE / zoom;

  const labelStyle = useMemo(
    () => ({ left: box.x + box.width / 2, top: box.y + box.height }),
    [box.height, box.width, box.x, box.y]
  );

  const sizeText = `${Math.round(box.width)} × ${Math.round(box.height)}`;

  return (
    <>
      <svg
        className="vector-preview"
        width="100%"
        height="100%"
        aria-hidden="true"
      >
        {renderOutline(tool, box, stroke)}
      </svg>
      <span className="vector-size" style={labelStyle}>
        {sizeText}
      </span>
    </>
  );
};

export { DragBoxPreview };
