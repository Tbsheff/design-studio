import type { IconName } from "@design-studio/ui";

import { copy } from "./copy.js";
import type { DirectEdit } from "./deps.js";
import type { AlignCell } from "./sizing-model.js";

type EditPatch = Parameters<DirectEdit["preview"]>[0];

type GapMode = "fixed" | "auto";

interface DirectionOption {
  readonly value: string;
  readonly icon: IconName;
  readonly label: string;
}

interface GapModeOption {
  readonly value: GapMode;
  readonly label: string;
}

const DIRECTIONS: readonly DirectionOption[] = [
  { icon: "arrowRight", label: "Horizontal", value: "row" },
  { icon: "arrowDown", label: "Vertical", value: "column" },
];

const POSITIONS = ["start", "center", "end"];

const GRID_STEPS: readonly number[] = [0, 1, 2];

const DISPLAYS = [
  "block",
  "inline",
  "inline-block",
  "flex",
  "inline-flex",
  "grid",
  "none",
];

const GAP_MODES: readonly GapModeOption[] = [
  { label: "Fixed", value: "fixed" },
  { label: "Auto", value: "auto" },
];

const DEFAULT_GAP = "8px";

const ICON_SIZE = 14;

const REMOVE_ICON_SIZE = 12;

const SPACE_BETWEEN = "space-between";

const LENGTH_PATTERN = /^\s*[+-]?(?:\d+\.?\d*|\.\d+)/u;

const toGridValue = (value: string): string => {
  if (value === "flex-start") {
    return "start";
  }

  if (value === "flex-end") {
    return "end";
  }

  return value;
};

const toAlignPatch = (cell: AlignCell, isGrid: boolean): EditPatch => {
  if (isGrid) {
    return {
      "align-items": toGridValue(cell.align),
      "justify-items": toGridValue(cell.justify),
    };
  }

  return { "align-items": cell.align, "justify-content": cell.justify };
};

const toCellLabel = (row: number, col: number): string =>
  `Align ${POSITIONS[row]} ${POSITIONS[col]}`;

const toOnClass = (isOn: boolean): string => {
  if (isOn) {
    return "on";
  }

  return "";
};

const isPositiveLength = (value: string): boolean => {
  const match = LENGTH_PATTERN.exec(value);

  return match !== null && Number(match[0]) > 0;
};

const toLastGap = (gap: string, previous: string): string => {
  if (isPositiveLength(gap)) {
    return gap;
  }

  return previous;
};

const toGapMode = (justify: string): GapMode => {
  if (justify === SPACE_BETWEEN) {
    return "auto";
  }

  return "fixed";
};

const toGapPatch = (next: GapMode, lastGap: string): EditPatch => {
  if (next === "auto") {
    return { gap: "", "justify-content": SPACE_BETWEEN };
  }

  return { gap: lastGap, "justify-content": "" };
};

const toDirection = (flexDirection: string): string => {
  if (flexDirection.startsWith("column")) {
    return "column";
  }

  return "row";
};

const isWrapping = (flexWrap: string): boolean =>
  flexWrap === "wrap" || flexWrap === "wrap-reverse";

const toWrapTip = (wraps: boolean): string => {
  if (wraps) {
    return "Wrap: on";
  }

  return "Wrap: off";
};

const toWrapPatch = (wraps: boolean): EditPatch => {
  if (wraps) {
    return { "flex-wrap": "nowrap" };
  }

  return { "flex-wrap": "wrap" };
};

const toSkipNote = (count: number): string => {
  if (count === 1) {
    return copy.layerKeptItsPlace;
  }

  return `${count}${copy.layersKeptTheirPlace}`;
};

const toSkipTip = (reasons: readonly string[]): string =>
  [...new Set(reasons)].join(" ");

export {
  DEFAULT_GAP,
  DIRECTIONS,
  DISPLAYS,
  GAP_MODES,
  GRID_STEPS,
  ICON_SIZE,
  REMOVE_ICON_SIZE,
  SPACE_BETWEEN,
  isWrapping,
  toAlignPatch,
  toCellLabel,
  toDirection,
  toGapMode,
  toGapPatch,
  toLastGap,
  toOnClass,
  toSkipNote,
  toSkipTip,
  toWrapPatch,
  toWrapTip,
};

export type { DirectionOption, EditPatch, GapMode };
