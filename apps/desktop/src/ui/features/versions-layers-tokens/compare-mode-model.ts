import { readStored } from "../../platform/storage.js";

type Mode = "code" | "overlay" | "reference" | "side" | "slider";

interface ModeOption {
  readonly id: Mode;
  readonly label: string;
  readonly tip: string;
}

const MODES: readonly ModeOption[] = [
  {
    id: "side",
    label: "Side by side",
    tip: "Both versions next to each other",
  },
  {
    id: "slider",
    label: "Slider",
    tip: "Drag a line to wipe between versions",
  },
  {
    id: "overlay",
    label: "Overlay",
    tip: "The newer version with changed pixels in red",
  },
  {
    id: "reference",
    label: "Reference",
    tip: "A screenshot or mock over the newer version, with a slider",
  },
  { id: "code", label: "Code", tip: "The line changes in each changed file" },
];

const MODE_KEY = "design-studio.compare-mode";
const STACK_GAIN = 1.25;
const MIN_SCALE = 0.1;
const MAX_SCALE = 1;
const SIDE_PADDING = 32;
const TOP_PADDING = 76;
const PANE_GAP = 48;
const PANE_LABEL = 36;
const HALVES = 2;

const toKeyStep = (key: string): number => {
  if (key === "ArrowRight" || key === "ArrowDown") {
    return 1;
  }

  if (key === "ArrowLeft" || key === "ArrowUp") {
    return -1;
  }

  return 0;
};

const toSavedMode = (): Mode => {
  try {
    const value = readStored(MODE_KEY);
    const found = MODES.find((mode) => mode.id === value);

    if (found) {
      return found.id;
    }

    return "side";
  } catch {
    return "side";
  }
};

const toFit = (
  width: number,
  height: number,
  viewport: { readonly height: number; readonly width: number }
): number =>
  Math.max(
    MIN_SCALE,
    Math.min(MAX_SCALE, width / viewport.width, height / viewport.height)
  );

interface Layout {
  readonly isStacked: boolean;
  readonly scale: number;
}

const toLayout = (
  mode: Mode,
  box: { readonly height: number; readonly width: number },
  viewport: { readonly height: number; readonly width: number }
): Layout => {
  const single = toFit(
    box.width - SIDE_PADDING,
    box.height - TOP_PADDING,
    viewport
  );

  if (mode !== "side") {
    return { isStacked: false, scale: single };
  }

  const across = toFit(
    (box.width - PANE_GAP) / HALVES,
    box.height - TOP_PADDING,
    viewport
  );

  const down = toFit(
    box.width - SIDE_PADDING,
    (box.height - PANE_GAP) / HALVES - PANE_LABEL,
    viewport
  );

  if (down > across * STACK_GAIN) {
    return { isStacked: true, scale: down };
  }

  return { isStacked: false, scale: across };
};

const toCompareClass = (mode: Mode, isStacked: boolean): string => {
  if (mode !== "side") {
    return "compare single";
  }

  if (isStacked) {
    return "compare stacked";
  }

  return "compare ";
};

export { MODE_KEY, MODES, toCompareClass, toKeyStep, toLayout, toSavedMode };

export type { Mode, ModeOption };
