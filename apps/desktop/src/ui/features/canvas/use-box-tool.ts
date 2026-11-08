import { useState } from "react";
import type { PointerEvent } from "react";

import type {
  Commit,
  Point,
  PointOf,
  VectorLayerProps,
} from "./vector-layer-types.js";
import { boxOf } from "./vector-place-model.js";
import type { Box } from "./vector-place-model.js";
import type { VectorToolId } from "./vector-tool-model.js";

const FIGURE_KEY = "shape";

const DRAG_SCREEN = 3;

const DEFAULT_SIZE = 100;

interface BoxDrag {
  from: Point;
  to: Point;
  isSquare: boolean;
}

interface BoxTool {
  drag: BoxDrag | null;
  onDown: (event: PointerEvent<HTMLDivElement>) => void;
  onMove: (event: PointerEvent<HTMLDivElement>) => void;
  onUp: (event: PointerEvent<HTMLDivElement>) => void;
}

const toDroppedBox = (
  drag: BoxDrag,
  to: Point,
  zoom: number,
  isSquare: boolean
): Box => {
  const moved = Math.hypot(to.x - drag.from.x, to.y - drag.from.y) * zoom;

  if (moved > DRAG_SCREEN) {
    return boxOf(drag.from, to, isSquare);
  }

  return {
    height: DEFAULT_SIZE,
    width: DEFAULT_SIZE,
    x: drag.from.x,
    y: drag.from.y,
  };
};

const toFigure = (tool: VectorToolId): "ellipse" | "rect" => {
  if (tool === "ellipse") {
    return "ellipse";
  }

  return "rect";
};

const useBoxTool = (
  props: VectorLayerProps,
  tool: VectorToolId,
  commit: Commit,
  pointOf: PointOf
): BoxTool => {
  const [drag, setDrag] = useState<BoxDrag | null>(null);

  const onDown = (event: PointerEvent<HTMLDivElement>): void => {
    const point = pointOf(event);

    if (event.button !== 0 || !point) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ from: point, isSquare: event.shiftKey, to: point });
  };

  const onMove = (event: PointerEvent<HTMLDivElement>): void => {
    const point = pointOf(event);

    if (drag && point) {
      setDrag({ ...drag, isSquare: event.shiftKey, to: point });
    }
  };

  const onUp = (event: PointerEvent<HTMLDivElement>): void => {
    if (!drag) {
      return;
    }

    setDrag(null);
    const to = pointOf(event) ?? drag.to;
    const box = toDroppedBox(drag, to, props.zoom, event.shiftKey);
    const figure = toFigure(tool);

    void commit(drag.from, (origin) => ({
      [FIGURE_KEY]: figure,
      box: {
        height: box.height,
        width: box.width,
        x: box.x - origin.x,
        y: box.y - origin.y,
      },
      op: "shape",
    }));
  };

  return { drag, onDown, onMove, onUp };
};

export { useBoxTool };

export type { BoxDrag, BoxTool };
