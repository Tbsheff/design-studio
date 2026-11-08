import type {
  BridgeToParent,
  DirectEditRequest,
  NudgeBase,
  SelectionContext,
} from "@design-studio/contracts";

const SAVE_MS = 300;

const FLOW_HINT =
  "Arrow keys move absolute elements and elements with a margin. Drag this one to change its place in the layout.";

const NO_SOURCE_HINT =
  "This element has no source location, so it cannot move here.";

const SOME_HINT =
  "Some selected elements sit in the layout, so the arrow keys move only the others. Drag one to change its place.";

interface Mover {
  readonly target: SelectionContext;
  readonly base: NudgeBase;
}

interface Burst {
  readonly key: string;
  readonly items: Mover[];
  readonly dx: number;
  readonly dy: number;
}

interface Step {
  readonly base: NudgeBase;
  readonly dx: number;
  readonly dy: number;
}

interface Saved {
  readonly edit: DirectEditRequest;
  readonly selector: string;
  readonly style: NudgeStyle;
  readonly back: Record<string, string>;
}

const FLUSH_ON = new Set<BridgeToParent["type"]>([
  "ready",
  "history-key",
  "app-key",
  "structure-key",
  "reorder-key",
  "move-start",
]);

type NudgeProp =
  | "bottom"
  | "left"
  | "margin-left"
  | "margin-top"
  | "right"
  | "top";

type NudgeStyle = Partial<Record<NudgeProp, string>>;

const toAxisStyle = (
  prop: NudgeProp,
  start: number,
  delta: number
): NudgeStyle => {
  if (delta === 0) {
    return {};
  }

  return { [prop]: `${Math.round(start + delta)}px` };
};

const toLockedDelta = (isLocked: boolean, delta: number): number => {
  if (isLocked) {
    return 0;
  }

  return delta;
};

const toSide = <Far extends NudgeProp, Near extends NudgeProp>(
  isFar: boolean,
  far: Far,
  near: Near
): Far | Near => {
  if (isFar) {
    return far;
  }

  return near;
};

const toSignedDelta = (isFar: boolean, delta: number): number => {
  if (isFar) {
    return -delta;
  }

  return delta;
};

const toNudgeStyle = (step: Step): NudgeStyle => {
  const { base, dx, dy } = step;

  if (base.mode === "margin") {
    return {
      ...toAxisStyle("margin-left", base.x, toLockedDelta(base.lockX, dx)),
      ...toAxisStyle("margin-top", base.y, toLockedDelta(base.lockY, dy)),
    };
  }

  if (base.mode !== "position") {
    return {};
  }

  return {
    ...toAxisStyle(
      toSide(base.fromRight, "right", "left"),
      base.x,
      toSignedDelta(base.fromRight, dx)
    ),
    ...toAxisStyle(
      toSide(base.fromBottom, "bottom", "top"),
      base.y,
      toSignedDelta(base.fromBottom, dy)
    ),
  };
};

const isMarginMovable = (base: NudgeBase, dx: number, dy: number): boolean => {
  if (base.mode !== "margin") {
    return false;
  }

  const isXMovable = dx !== 0 && !base.lockX;
  const isYMovable = dy !== 0 && !base.lockY;

  return isXMovable || isYMovable;
};

const isMovable = (base: NudgeBase, dx: number, dy: number): boolean => {
  if (base.mode === "position") {
    return true;
  }

  return isMarginMovable(base, dx, dy);
};

const toBurstKey = (selectors: string[]): string =>
  selectors.toSorted().join("\n");

const toSaved = (
  batch: Burst,
  createRequest: (
    target: SelectionContext,
    style: Record<string, string>
  ) => DirectEditRequest | null
): Saved[] =>
  batch.items.flatMap((item) => {
    const style = toNudgeStyle({ base: item.base, dx: batch.dx, dy: batch.dy });
    const edit = createRequest(item.target, style);

    if (!edit) {
      return [];
    }

    const back = Object.fromEntries(
      Object.keys(style).map((key) => [key, item.target.styles[key] ?? ""])
    );

    const { selector } = item.target;

    return [{ back, edit, selector, style }];
  });

const toPickedSelectors = (message: BridgeToParent): string[] => {
  if (message.type === "select") {
    return [message.selection.selector];
  }

  if (message.type === "select-many") {
    return message.selections.map((entry) => entry.selector);
  }

  return [];
};

const shouldPickNew = (
  message: BridgeToParent,
  current: SelectionContext[]
): boolean => {
  if (message.type !== "select" && message.type !== "select-many") {
    return false;
  }

  if (message.additive) {
    return true;
  }

  return (
    toBurstKey(toPickedSelectors(message)) !==
    toBurstKey(current.map((entry) => entry.selector))
  );
};

const toMoverHint = (
  picked: Mover[],
  multiReason: (targets: SelectionContext[]) => string | null
): string | null => {
  if (picked.length > 1) {
    return multiReason(picked.map((item) => item.target));
  }

  if (picked[0]?.target.source) {
    return null;
  }

  return NO_SOURCE_HINT;
};

const toFlowHint = (movableCount: number): string => {
  if (movableCount === 0) {
    return FLOW_HINT;
  }

  return SOME_HINT;
};

export {
  FLOW_HINT,
  FLUSH_ON,
  SAVE_MS,
  isMovable,
  shouldPickNew,
  toBurstKey,
  toFlowHint,
  toMoverHint,
  toNudgeStyle,
  toSaved,
};

export type { Burst, Mover, NudgeStyle, Saved, Step };
