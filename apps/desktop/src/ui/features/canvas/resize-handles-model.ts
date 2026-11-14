import type {
  BridgeToParent,
  SelectionContext,
} from "@design-studio/contracts";
import type { CanvasGuide } from "@design-studio/contracts/canvas-file";
import type { PointerEvent as ReactPointerEvent } from "react";

import type { ParentMessageBody } from "../../platform/bridge.js";
import { createLiveStore } from "../../platform/live-store.js";
import type { LiveStore } from "../../platform/live-store.js";
import type { GroupBox, GroupEdge } from "./group-resize-model.js";
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

interface Place {
  readonly left: number;
  readonly top: number;
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
  hasCentered: boolean;
  isCentered: boolean;
  place: Place | null;
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
  boxX: number;
  boxY: number;
  guides: SnapGuide[];
}

type RotateDown = (event: ReactPointerEvent<HTMLElement>) => void;

type ScaleDown = (
  corner: ScaleCorner,
  event: ReactPointerEvent<HTMLElement>
) => void;

type GroupDown = (
  edge: GroupEdge,
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
  readonly groupBox: GroupBox | null;
  readonly isScaling: boolean;
  readonly onGroupDown: GroupDown;
  readonly onScaleDown: ScaleDown;
  readonly onRotateDown: RotateDown;
  readonly rotateLabel: RotateLabel | null;
  readonly rotateTargets: readonly SelectionContext[];
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
  readonly groupBox: LiveStore<GroupBox | null>;
  readonly onGroupDown: GroupDown;
  readonly onScaleDown: ScaleDown;
  readonly onRotateDown: RotateDown;
  readonly rotateLabel: LiveStore<RotateLabel | null>;
  readonly rotateTargets: readonly SelectionContext[];
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
    boxX: size.rect.x,
    boxY: size.rect.y,
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

const toRotateTargets = (
  isEnabled: boolean,
  selection: readonly SelectionContext[]
): readonly SelectionContext[] => {
  const isSourced = selection.every((item) => item.source !== null);

  if (!isEnabled || selection.length === 0 || !isSourced) {
    return [];
  }

  return selection;
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

const MOVED_POSITIONS: ReadonlySet<string> = new Set(["absolute", "fixed"]);

const toPlace = (target: SelectionContext): Place | null => {
  const { left, position, top } = target.styles;
  const isPx = left?.endsWith("px") === true && top?.endsWith("px") === true;

  if (!MOVED_POSITIONS.has(position ?? "") || !isPx) {
    return null;
  }

  return {
    left: toPixels(left, Number.NaN),
    top: toPixels(top, Number.NaN),
  };
};

const toCenteredPlace = (drag: Drag, size: Size): Place | null => {
  if (!drag.isCentered || drag.place === null) {
    return null;
  }

  return {
    left: Math.round(drag.place.left - (size.width - drag.base.width) / 2),
    top: Math.round(drag.place.top - (size.height - drag.base.height) / 2),
  };
};

const toPlaceEntries = (
  place: Place | null,
  start: Place | null
): [string, string][] => {
  if (place === null || start === null) {
    return [];
  }

  const entries: [string, string][] = [];

  if (place.left !== start.left) {
    entries.push(["left", `${place.left}px`]);
  }

  if (place.top !== start.top) {
    entries.push(["top", `${place.top}px`]);
  }

  return entries;
};

const toPreviewPlace = (drag: Drag, size: Size): [string, string][] => {
  if (drag.place === null || !drag.hasCentered) {
    return [];
  }

  const place = toCenteredPlace(drag, size) ?? drag.place;

  return [
    ["left", `${place.left}px`],
    ["top", `${place.top}px`],
  ];
};

const axisStyle = (drag: Drag, size: Size): AxisStyle =>
  Object.fromEntries([
    ...toAxisEntries((axis) => drag.axes.has(axis), size),
    ...toPreviewPlace(drag, size),
  ]);

const toDragStyle = (drag: Drag): AxisStyle =>
  Object.fromEntries([
    ...toAxisEntries((axis) => drag.size[axis] !== drag.base[axis], drag.size),
    ...toPlaceEntries(toCenteredPlace(drag, drag.size), drag.place),
  ]);

const toBackPlace = (drag: Drag): [string, string][] => {
  if (toCenteredPlace(drag, drag.size) === null) {
    return [];
  }

  return [
    ["left", drag.target.styles.left ?? ""],
    ["top", drag.target.styles.top ?? ""],
  ];
};

const toBackStyle = (drag: Drag): AxisStyle =>
  Object.fromEntries([
    ["height", drag.target.styles.height ?? ""],
    ["width", drag.target.styles.width ?? ""],
    ...toBackPlace(drag),
  ]);

const toLiveRect = (drag: Drag, size: Size): Rect => {
  const { rect } = drag.target;

  if (toCenteredPlace(drag, size) === null) {
    return rect;
  }

  return {
    ...rect,
    x: rect.x - (size.width - drag.base.width) / 2,
    y: rect.y - (size.height - drag.base.height) / 2,
  };
};

export {
  axisStyle,
  resizeReadout,
  resizedSize,
  snapSize,
  toBackStyle,
  toDragStyle,
  toLiveRect,
  toPixels,
  toPlace,
  toResizeLive,
  toResizeTarget,
  toRotateTargets,
  toScale,
};

export type {
  AxisStyle,
  Drag,
  GroupDown,
  LiveSize,
  Options,
  Place,
  ResizeControl,
  ResizeEdge,
  ResizeHandles,
  ResizeLive,
  ResizeReadout,
  Size,
};
