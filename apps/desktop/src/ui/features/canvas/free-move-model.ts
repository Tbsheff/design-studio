import type {
  BridgeToParent,
  DirectStyleProperty,
  FreeMoveDrag,
  FreeMoveLine,
  FreeMoveStart,
  SelectionContext,
  StructureEditRequest,
} from "@design-studio/contracts";

import type { ParentMessageBody } from "../../platform/bridge.js";
import { snapRect } from "./snap-model.js";
import type {
  Rect,
  SnapGuide,
  SnapResult,
  SpacingBadge,
} from "./snap-model.js";

interface FreeMoveView {
  readonly box: Rect;
  readonly guides: SnapGuide[];
  readonly spacing: SpacingBadge[];
  readonly line: FreeMoveLine | null;
  readonly copy: boolean;
}

interface FreeMoveOptions {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly selection: SelectionContext[];
  readonly enabled: boolean;
  readonly busy: boolean;
  readonly zoom: number;
  readonly post: (body: ParentMessageBody) => void;
  readonly listen: (handler: (message: BridgeToParent) => void) => () => void;
  readonly holdSwap?: (held: boolean, settle: boolean) => void;
  readonly setSelection: (
    updater: (prev: SelectionContext[]) => SelectionContext[]
  ) => void;
  readonly refreshRects: () => void;
  readonly onError: (message: string) => void;
  readonly applyStructure: (request: StructureEditRequest) => Promise<void>;
}

interface FreeMoveSession {
  readonly start: FreeMoveStart;
  readonly target: SelectionContext;
  readonly candidates: Rect[];
}

interface Placed {
  readonly dx: number;
  readonly dy: number;
  readonly view: FreeMoveView;
}

type AbsoluteStyle = Partial<Record<DirectStyleProperty, string>>;

const isSnapSkipped = (session: FreeMoveSession, drag: FreeMoveDrag): boolean =>
  session.start.mode !== "absolute" ||
  drag.free ||
  session.candidates.length === 0;

const place = (
  session: FreeMoveSession,
  drag: FreeMoveDrag,
  zoom: number
): Placed => {
  const base = session.start.rect;
  const moved = { ...base, x: base.x + drag.dx, y: base.y + drag.dy };
  let snapped: SnapResult = { guides: [], rect: moved, spacing: [] };

  if (!isSnapSkipped(session, drag)) {
    snapped = snapRect({
      candidates: session.candidates,
      rect: moved,
      x: "move",
      y: "move",
      zoom,
    });
  }

  const box = snapped.rect;
  const { guides, spacing } = snapped;
  const copy = drag.alt;
  const line = drag.insert?.line ?? null;

  return {
    dx: Math.round(box.x - base.x),
    dy: Math.round(box.y - base.y),
    view: { box, copy, guides, line, spacing },
  };
};

const transformOf = (
  session: FreeMoveSession,
  dx: number,
  dy: number
): string => {
  let own = "";

  if (session.start.transform && session.start.transform !== "none") {
    own = ` ${session.start.transform}`;
  }

  return `translate(${dx}px, ${dy}px)${own}`;
};

const toSigned = (value: number, isReversed: boolean): number => {
  if (isReversed) {
    return -value;
  }

  return value;
};

const applyHorizontal = (
  style: AbsoluteStyle,
  start: FreeMoveStart,
  dx: number
): void => {
  if (dx === 0 && !start.convert) {
    return;
  }

  const offset = `${Math.round(start.left + toSigned(dx, start.fromRight))}px`;

  if (start.fromRight) {
    style.right = offset;
  } else {
    style.left = offset;
  }
};

const applyVertical = (
  style: AbsoluteStyle,
  start: FreeMoveStart,
  dy: number
): void => {
  if (dy === 0 && !start.convert) {
    return;
  }

  const offset = `${Math.round(start.top + toSigned(dy, start.fromBottom))}px`;

  if (start.fromBottom) {
    style.bottom = offset;
  } else {
    style.top = offset;
  }
};

const absoluteStyle = (
  session: FreeMoveSession,
  dx: number,
  dy: number
): AbsoluteStyle => {
  const style: AbsoluteStyle = {};
  const { start } = session;
  applyHorizontal(style, start, dx);
  applyVertical(style, start, dy);

  if (start.convert) {
    style.position = "absolute";
    style.width = `${Math.round(start.rect.width)}px`;
  }

  return style;
};

export { absoluteStyle, place, transformOf };

export type {
  AbsoluteStyle,
  FreeMoveOptions,
  FreeMoveSession,
  FreeMoveView,
  Placed,
};
