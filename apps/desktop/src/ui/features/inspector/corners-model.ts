import { copy } from "./copy.js";
import { expandBox, SIDES } from "./css-values.js";
import type { ShiftPart, Side } from "./css-values.js";

const NO_CORNER = "0";

const CORNERS: readonly {
  readonly side: Side;
  readonly short: string;
  readonly label: string;
}[] = [
  { label: copy.topLeftRadius, short: "TL", side: "top" },
  { label: copy.topRightRadius, short: "TR", side: "right" },
  { label: copy.bottomLeftRadius, short: "BL", side: "left" },
  { label: copy.bottomRightRadius, short: "BR", side: "bottom" },
];

const toJoinedCorners = (corners: Record<Side, string>): string => {
  const values = SIDES.map((side) => corners[side] || NO_CORNER);
  const [first] = values;

  if (values.every((value) => value === first)) {
    return first ?? NO_CORNER;
  }

  return values.join(" ");
};

const toCorners = (radius: string): Record<Side, string> =>
  expandBox(radius.split("/")[0]);

const toCornerPart = (side: Side): ShiftPart => ({
  key: side,
  map: (raw, change) =>
    toJoinedCorners({
      ...toCorners(raw),
      [side]: change(toCorners(raw)[side] || NO_CORNER),
    }),
});

const ALL_CORNERS: ShiftPart = {
  key: "all",
  map: (raw, change) => {
    const corners = toCorners(raw);

    return toJoinedCorners({
      bottom: change(corners.bottom || NO_CORNER),
      left: change(corners.left || NO_CORNER),
      right: change(corners.right || NO_CORNER),
      top: change(corners.top || NO_CORNER),
    });
  },
};

const hasSplitCorners = (radius: string): boolean => {
  const corners = toCorners(radius);

  return SIDES.some((side) => corners[side] !== corners.top);
};

const toToggleTip = (isSplit: boolean): string => {
  if (isSplit) {
    return copy.setAllCornersTogether;
  }

  return copy.setEachCorner;
};

export {
  ALL_CORNERS,
  CORNERS,
  hasSplitCorners,
  toCornerPart,
  toCorners,
  toJoinedCorners,
  toToggleTip,
};
