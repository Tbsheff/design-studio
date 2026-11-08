import type { InsertTarget } from "@design-studio/contracts/insert";

import type { Drop, Point } from "./vector-layer-types.js";

const PX_3 = 3;

interface Box {
  height: number;
  width: number;
  x: number;
  y: number;
}

interface Place {
  target: InsertTarget;
  origin: Point;
  relativeParent: boolean;
}

const px = (value: string | undefined, index: number): number => {
  const parts = (value ?? "").trim().split(/\s+/u);
  const raw = parts[index] ?? parts[index % 2] ?? parts[0] ?? "0";

  return Number(raw.replace(/px$/u, "")) || 0;
};

const toTarget = (selection: NonNullable<Drop["selection"]>): InsertTarget => {
  const target: InsertTarget = {
    selector: selection.selector,
    source: selection.source,
    tag: selection.tag.toLowerCase(),
  };

  if (selection.owners?.length) {
    return { ...target, owners: selection.owners };
  }

  return target;
};

type PlaceResult =
  | { message: string; place: null }
  | { message: null; place: Place };

const placeOf = (drop: Drop): PlaceResult => {
  const { selection } = drop;

  if (!selection) {
    return {
      message: "Start the drawing on an element in the frame.",
      place: null,
    };
  }

  const isBody = selection.tag.toLowerCase() === "body";

  if (!selection.source && !selection.owners?.length && !isBody) {
    return {
      message:
        "This element has no source location, so the studio cannot draw into it.",
      place: null,
    };
  }

  const border = selection.styles["border-width"];

  return {
    message: null,
    place: {
      origin: {
        x: selection.rect.x + px(border, PX_3),
        y: selection.rect.y + px(border, 0),
      },
      relativeParent: (selection.styles.position ?? "static") === "static",
      target: toTarget(selection),
    },
  };
};

const toSide = (isSquare: boolean, own: number, side: number): number => {
  if (isSquare) {
    return side;
  }

  return own;
};

const toStart = (from: number, to: number, size: number): number => {
  if (to < from) {
    return from - size;
  }

  return from;
};

const boxOf = (from: Point, to: Point, isSquare: boolean): Box => {
  const width = Math.abs(to.x - from.x);
  const height = Math.abs(to.y - from.y);
  const side = Math.max(width, height);
  const boxWidth = toSide(isSquare, width, side);
  const boxHeight = toSide(isSquare, height, side);

  return {
    height: boxHeight,
    width: boxWidth,
    x: toStart(from.x, to.x, boxWidth),
    y: toStart(from.y, to.y, boxHeight),
  };
};

export { boxOf, placeOf };

export type { Box, Place, PlaceResult };
