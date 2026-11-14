import type {
  BridgeToParent,
  SelectionContext,
} from "@design-studio/contracts";
import type { CanvasGuide } from "@design-studio/contracts/canvas-file";
import type { PointerEvent as ReactPointerEvent } from "react";

import type { ParentMessageBody } from "../../platform/bridge.js";
import { createLiveStore } from "../../platform/live-store.js";
import type { LiveStore } from "../../platform/live-store.js";
import { snapLayerRect } from "./layer-snap-lines-model.js";
import type { RotateLabel } from "./rotate-drag-model.js";
import type { ScaleCorner, ScaleGhost } from "./scale-drag-model.js";
import type { Rect, SnapGuide, SnapKind } from "./snap-model.js";

type ResizeEdge = "e" | "s" | "se";

interface Size {
  height: number;
  width: number;
}

interface Options {
  projectId: string;
  directionId: string | null;
  selection: SelectionContext[];
  enabled: boolean;
  post: (body: ParentMessageBody) => void;
  listen?: (handler: (message: BridgeToParent) => void) => () => void;
  holdSwap?: (held: boolean, settle: boolean) => void;
  setSelection: (
    updater: (prev: SelectionContext[]) => SelectionContext[]
  ) => void;
  refreshRects: () => void;
  onError: (message: string) => void;
  readLines: (zoom: number) => readonly CanvasGuide[];
}

interface Drag {
  edge: ResizeEdge;
  pointerId: number;
  startX: number;
  startY: number;
  zoom: number;
  base: Size;
  size: Size;
  target: SelectionContext;
  axes: Set<"width" | "height">;
  candidates: Rect[];
  lines: readonly CanvasGuide[];
  guides: SnapGuide[];
  stopListen: () => void;
  detach: () => void;
}

interface ResizeLive {
  width: number;
  height: number;
  boxWidth: number;
  boxHeight: number;
  guides: SnapGuide[];
}

type RotateDown = (event: ReactPointerEvent<HTMLElement>) => void;

type ScaleDown = (
  corner: ScaleCorner,
  event: ReactPointerEvent<HTMLElement>
) => void;

interface ResizeControl {
  target: SelectionContext | null;
  live: ResizeLive | null;
  onHandleDown: (
    edge: ResizeEdge,
    event: ReactPointerEvent<HTMLElement>
  ) => void;
  readonly ghost: ScaleGhost | null;
  readonly isScaling: boolean;
  readonly onScaleDown: ScaleDown;
  readonly onRotateDown: RotateDown;
  readonly rotateLabel: RotateLabel | null;
}

interface LiveSize {
  size: Size;
  base: Size;
  rect: Rect;
  guides: SnapGuide[];
}

interface ResizeHandles {
  target: SelectionContext | null;
  sizes: LiveStore<LiveSize | null>;
  onHandleDown: ResizeControl["onHandleDown"];
  readonly ghost: LiveStore<ScaleGhost | null>;
  readonly onScaleDown: ScaleDown;
  readonly onRotateDown: RotateDown;
  readonly rotateLabel: LiveStore<RotateLabel | null>;
}

interface ResizeReadout {
  selector: string;
  width: number;
  height: number;
}

interface SnappedSize {
  size: Size;
  guides: SnapGuide[];
}

type AxisStyle = Record<string, string>;

const resizeReadout = createLiveStore<ResizeReadout | null>(null);

const toResizeLive = (
  size: LiveSize | null,
  target: SelectionContext | null
): ResizeLive | null => {
  if (!size || !target) {
    return null;
  }

  return {
    boxHeight: size.rect.height + size.size.height - size.base.height,
    boxWidth: size.rect.width + size.size.width - size.base.width,
    guides: size.guides,
    height: size.size.height,
    width: size.size.width,
  };
};

const toResizeTarget = (options: Options): SelectionContext | null => {
  const [first] = options.selection;

  if (options.enabled && options.selection.length === 1 && first?.source) {
    return first;
  }

  return null;
};

const toPixels = (value: string | undefined, fallback: number): number => {
  let parsed = Number.NaN;

  if (value?.endsWith("px")) {
    parsed = Number(value.replace(/px$/u, ""));
  }

  if (Number.isFinite(parsed)) {
    return Math.round(parsed);
  }

  return Math.round(fallback);
};

const toScale = (element: Element): number => {
  const overlay = element.closest<HTMLElement>(".overlay");

  if (!overlay || overlay.offsetWidth === 0) {
    return 1;
  }

  return overlay.getBoundingClientRect().width / overlay.offsetWidth;
};

interface DeltaXY {
  dx: number;
  dy: number;
}

const toGrown = (isKept: boolean, kept: number, grown: number): number => {
  if (isKept) {
    return kept;
  }

  return grown;
};

const toRawSize = (edge: ResizeEdge, base: Size, delta: DeltaXY): Size => ({
  height: toGrown(edge === "e", base.height, base.height + delta.dy),
  width: toGrown(edge === "s", base.width, base.width + delta.dx),
});

const isWidthLed = (edge: ResizeEdge, base: Size, delta: DeltaXY): boolean => {
  if (edge === "e") {
    return true;
  }

  if (edge === "s") {
    return false;
  }

  return Math.abs(delta.dx / base.width) >= Math.abs(delta.dy / base.height);
};

const keepRatioSize = (
  edge: ResizeEdge,
  base: Size,
  delta: DeltaXY,
  raw: Size
): Size => {
  const ratio = base.width / base.height;

  if (isWidthLed(edge, base, delta)) {
    return { height: raw.width / ratio, width: raw.width };
  }

  return { height: raw.height, width: raw.height * ratio };
};

const resizedSize = (
  edge: ResizeEdge,
  base: Size,
  delta: DeltaXY,
  keepRatio: boolean
): Size => {
  const raw = toRawSize(edge, base, delta);
  let next = raw;

  if (keepRatio && base.width > 0 && base.height > 0) {
    next = keepRatioSize(edge, base, delta, raw);
  }

  return {
    height: Math.max(1, Math.round(next.height)),
    width: Math.max(1, Math.round(next.width)),
  };
};

const toSnapKind = (isFree: boolean): SnapKind => {
  if (isFree) {
    return null;
  }

  return "end";
};

const snapSize = (
  delta: Pick<
    Drag,
    "edge" | "base" | "target" | "candidates" | "lines" | "zoom"
  >,
  next: Size,
  isOff: boolean
): SnappedSize => {
  if (isOff || (delta.candidates.length === 0 && delta.lines.length === 0)) {
    return { guides: [], size: next };
  }

  const source = delta.target.rect;

  const box = {
    height: source.height + next.height - delta.base.height,
    width: source.width + next.width - delta.base.width,
    x: source.x,
    y: source.y,
  };

  const snapped = snapLayerRect({
    candidates: delta.candidates,
    lines: delta.lines,
    rect: box,
    x: toSnapKind(delta.edge === "s"),
    y: toSnapKind(delta.edge === "e"),
    zoom: delta.zoom,
  });

  return {
    guides: snapped.guides,
    size: {
      height: Math.max(
        1,
        Math.round(next.height + snapped.rect.height - box.height)
      ),
      width: Math.max(
        1,
        Math.round(next.width + snapped.rect.width - box.width)
      ),
    },
  };
};

const AXES = ["width", "height"] as const;

const toAxisEntry = (
  axis: "width" | "height",
  size: Size
): [string, string] => [axis, `${size[axis]}px`];

const toAxisEntries = (
  isIncluded: (axis: "width" | "height") => boolean,
  size: Size
): [string, string][] =>
  AXES.flatMap((axis) => {
    if (!isIncluded(axis)) {
      return [];
    }

    return [toAxisEntry(axis, size)];
  });

const axisStyle = (drag: Drag, size: Size): AxisStyle =>
  Object.fromEntries(toAxisEntries((axis) => drag.axes.has(axis), size));

const styleFor = (size: Size, base: Size): AxisStyle =>
  Object.fromEntries(toAxisEntries((axis) => size[axis] !== base[axis], size));

export {
  axisStyle,
  resizeReadout,
  resizedSize,
  snapSize,
  styleFor,
  toPixels,
  toResizeLive,
  toResizeTarget,
  toScale,
};

export type {
  AxisStyle,
  Drag,
  LiveSize,
  Options,
  ResizeControl,
  ResizeEdge,
  ResizeHandles,
  ResizeLive,
  ResizeReadout,
  Size,
};
