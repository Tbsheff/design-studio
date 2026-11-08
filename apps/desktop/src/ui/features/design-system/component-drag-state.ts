import type { InsertableComponent } from "@design-studio/contracts/insert";
import type {
  MouseEvent as ReactMouseEvent,
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
} from "react";

import type { DropHint } from "./component-insert-api.js";

const DRAG_START_PX = 4;

interface Drag {
  active: boolean;
  component: InsertableComponent;
  pointerId: number;
  startX: number;
  startY: number;
}

interface DragGhostState {
  hint: DropHint | null;
  name: string;
  x: number;
  y: number;
}

interface DragHandlers {
  onClickCapture: (event: ReactMouseEvent) => void;
  onPointerCancel: () => void;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
}

interface ComponentDrag {
  ghost: DragGhostState | null;
  handlers: (component: InsertableComponent) => DragHandlers;
}

interface DragRefs {
  cancel: () => void;
  drag: MutableRefObject<Drag | null>;
  dragged: MutableRefObject<boolean>;
  frame: MutableRefObject<number>;
  setGhost: (
    update: (prev: DragGhostState | null) => DragGhostState | null
  ) => void;
}

const startDrag = (
  target: InsertableComponent,
  event: ReactPointerEvent<HTMLElement>
): Drag => ({
  active: false,
  component: target,
  pointerId: event.pointerId,
  startX: event.clientX,
  startY: event.clientY,
});

const isBelowThreshold = (
  cur: Drag,
  event: ReactPointerEvent<HTMLElement>
): boolean =>
  Math.hypot(event.clientX - cur.startX, event.clientY - cur.startY) <
  DRAG_START_PX;

const swallowClick = (
  dragged: MutableRefObject<boolean>,
  event: ReactMouseEvent
): void => {
  if (!dragged.current) {
    return;
  }

  dragged.current = false;
  event.preventDefault();
  event.stopPropagation();
};

const toHintGhost = (
  prev: DragGhostState | null,
  hint: DropHint | null
): DragGhostState | null => {
  if (prev) {
    return { ...prev, hint };
  }

  return prev;
};

export { isBelowThreshold, startDrag, swallowClick, toHintGhost };

export type { ComponentDrag, Drag, DragGhostState, DragHandlers, DragRefs };
