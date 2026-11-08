import type { ReactElement } from "react";

import { PenPreview } from "./pen-preview.js";
import { DragBoxPreview } from "./shape-preview.js";
import type { BoxTool } from "./use-box-tool.js";
import type { PenTool } from "./use-pen-tool.js";
import { boxOf } from "./vector-place-model.js";
import type { VectorToolId } from "./vector-tool-model.js";

interface VectorPreviewProps {
  readonly box: BoxTool;
  readonly pen: PenTool;
  readonly tool: VectorToolId;
  readonly zoom: number;
}

const toHover = (pen: PenTool): PenTool["hover"] => {
  if (pen.isDragging) {
    return null;
  }

  return pen.hover;
};

const VectorPreview = ({
  box,
  pen,
  tool,
  zoom,
}: VectorPreviewProps): ReactElement | null => {
  if (tool === "pen") {
    return (
      <PenPreview
        anchors={pen.anchors}
        hover={toHover(pen)}
        zoom={zoom}
        closing={pen.isClosing}
      />
    );
  }

  if (!box.drag) {
    return null;
  }

  return (
    <DragBoxPreview
      tool={tool}
      box={boxOf(box.drag.from, box.drag.to, box.drag.isSquare)}
      zoom={zoom}
    />
  );
};

export { VectorPreview };
