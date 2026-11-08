import { penPath } from "./drawing-model.js";
import type { PenAnchor } from "./drawing-model.js";
import type { Placed, Point } from "./vector-layer-types.js";

const CLOSE_HIT_SCREEN = 8;

const PATH_KEY = "d";

const DRAG_SCREEN = 3;

const MIN_PEN_POINTS = 2;

type PenKeyAction = "close" | "cancel" | "undo";

const isNearFirst = (
  anchors: PenAnchor[],
  point: Point | null,
  zoom: number
): boolean => {
  const [first] = anchors;

  if (!point || !first || anchors.length < MIN_PEN_POINTS) {
    return false;
  }

  return (
    Math.hypot(point.x - first.x, point.y - first.y) * zoom <= CLOSE_HIT_SCREEN
  );
};

const toBentAnchors = (
  prev: PenAnchor[],
  point: Point,
  zoom: number
): PenAnchor[] => {
  const last = prev.at(-1);

  if (
    !last ||
    Math.hypot(point.x - last.x, point.y - last.y) * zoom < DRAG_SCREEN
  ) {
    return prev;
  }

  return [
    ...prev.slice(0, -1),
    {
      hin: { x: 2 * last.x - point.x, y: 2 * last.y - point.y },
      hout: point,
      x: last.x,
      y: last.y,
    },
  ];
};

const toPathRequest = (
  list: PenAnchor[],
  isClosed: boolean,
  origin: Point
): Placed => {
  const path: Placed = {
    [PATH_KEY]: penPath(list, isClosed, -origin.x, -origin.y),
    op: "path",
  };

  if (isClosed) {
    return { ...path, fill: "#D9D9D9" };
  }

  return path;
};

const toPenKeyAction = (key: string, count: number): PenKeyAction | null => {
  if (count === 0) {
    return null;
  }

  if (key === "Enter") {
    return "close";
  }

  if (key === "Escape") {
    return "cancel";
  }

  if (key === "Backspace") {
    return "undo";
  }

  return null;
};

export {
  MIN_PEN_POINTS,
  isNearFirst,
  toBentAnchors,
  toPathRequest,
  toPenKeyAction,
};

export type { PenKeyAction };
