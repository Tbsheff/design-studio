import { chordMatches } from "../../../shared/keymap.js";
import type { KeyInput } from "../../../shared/keymap.js";
import type { TidyFramesLayout } from "../../domain/tidy-frames-events.js";
import { copy } from "./copy.js";

type FrameAlignLayout = Exclude<TidyFramesLayout, "tidy" | "row" | "grid">;

interface FrameAlignTool {
  readonly chord: string;
  readonly glyph: string;
  readonly label: string;
  readonly layout: FrameAlignLayout;
}

const ALIGN_MIN_FRAMES = 2;

const SPREAD_MIN_FRAMES = 3;

const FRAME_ALIGN_TOOLS: readonly FrameAlignTool[] = [
  {
    chord: "Alt+A",
    glyph: "M2.5 2v12M5 4.5h7V7H5zM5 9h4.5v2.5H5z",
    label: copy.frameAlignLeft,
    layout: "left",
  },
  {
    chord: "Alt+H",
    glyph: "M8 2v12M4 4.5h8V7H4zM5.5 9h5v2.5h-5z",
    label: copy.frameAlignCenter,
    layout: "center",
  },
  {
    chord: "Alt+D",
    glyph: "M13.5 2v12M4 4.5h7V7H4zM6.5 9H11v2.5H6.5z",
    label: copy.frameAlignRight,
    layout: "right",
  },
  {
    chord: "Alt+W",
    glyph: "M2 2.5h12M4.5 5H7v7H4.5zM9 5h2.5v4.5H9z",
    label: copy.frameAlignTop,
    layout: "top",
  },
  {
    chord: "Alt+V",
    glyph: "M2 8h12M4.5 4H7v8H4.5zM9 5.5h2.5v5H9z",
    label: copy.frameAlignMiddle,
    layout: "middle",
  },
  {
    chord: "Alt+S",
    glyph: "M2 13.5h12M4.5 4H7v7H4.5zM9 6.5h2.5V11H9z",
    label: copy.frameAlignBottom,
    layout: "bottom",
  },
];

const FRAME_SPREAD_TOOLS: readonly FrameAlignTool[] = [
  {
    chord: "Ctrl+Alt+H",
    glyph: "M2.5 2v12M13.5 2v12M6.5 5h3v6h-3z",
    label: copy.frameAlignSpreadX,
    layout: "spread-x",
  },
  {
    chord: "Ctrl+Alt+V",
    glyph: "M2 2.5h12M2 13.5h12M5 6.5h6v3H5z",
    label: copy.frameAlignSpreadY,
    layout: "spread-y",
  },
];

const FRAME_ALIGN_ALL = [...FRAME_ALIGN_TOOLS, ...FRAME_SPREAD_TOOLS];

const isFrameAlignLayout = (
  layout: TidyFramesLayout
): layout is FrameAlignLayout =>
  FRAME_ALIGN_ALL.some((tool) => tool.layout === layout);

const toFrameAlignMin = (layout: FrameAlignLayout): number => {
  if (layout === "spread-x" || layout === "spread-y") {
    return SPREAD_MIN_FRAMES;
  }

  return ALIGN_MIN_FRAMES;
};

const isFrameAlignReady = (layout: FrameAlignLayout, count: number): boolean =>
  count >= toFrameAlignMin(layout);

const toFrameAlignKeyLayout = (
  event: KeyInput,
  mac: boolean
): FrameAlignLayout | null =>
  FRAME_ALIGN_ALL.find((tool) => chordMatches(tool.chord, event, mac))
    ?.layout ?? null;

export {
  FRAME_ALIGN_TOOLS,
  FRAME_SPREAD_TOOLS,
  isFrameAlignLayout,
  isFrameAlignReady,
  toFrameAlignKeyLayout,
};

export type { FrameAlignLayout, FrameAlignTool };
