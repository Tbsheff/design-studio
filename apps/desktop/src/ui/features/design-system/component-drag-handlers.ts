import type { InsertableComponent } from "@design-studio/contracts/insert";
import type { PointerEvent as ReactPointerEvent } from "react";

import {
  isBelowThreshold,
  startDrag,
  swallowClick,
  toHintGhost,
} from "./component-drag-state.js";
import type { DragHandlers, DragRefs } from "./component-drag-state.js";
import { insertBus } from "./component-insert-api.js";

const handlePointerDown = (
  refs: DragRefs,
  component: InsertableComponent,
  event: ReactPointerEvent<HTMLElement>
): void => {
  if (event.button !== 0) {
    return;
  }

  refs.dragged.current = false;
  refs.drag.current = startDrag(component, event);
  event.currentTarget.setPointerCapture(event.pointerId);
};

const handlePointerMove = (
  refs: DragRefs,
  component: InsertableComponent,
  event: ReactPointerEvent<HTMLElement>
): void => {
  const cur = refs.drag.current;

  if (!cur || cur.pointerId !== event.pointerId) {
    return;
  }

  if (!cur.active && isBelowThreshold(cur, event)) {
    return;
  }

  cur.active = true;
  const { clientX: posX, clientY: posY } = event;

  refs.setGhost((prev) => ({
    hint: prev?.hint ?? null,
    name: component.name,
    x: posX,
    y: posY,
  }));

  if (refs.frame.current) {
    return;
  }

  refs.frame.current = globalThis.requestAnimationFrame(() => {
    refs.frame.current = 0;
    insertBus
      .get()
      ?.dragMove(posX, posY, (hint) =>
        refs.setGhost((prev) => toHintGhost(prev, hint))
      );
  });
};

const handlePointerUp = (
  refs: DragRefs,
  event: ReactPointerEvent<HTMLElement>
): void => {
  const cur = refs.drag.current;

  refs.drag.current = null;
  refs.setGhost(() => null);

  if (!cur?.active) {
    return;
  }

  refs.dragged.current = true;
  insertBus.get()?.dragEnd(cur.component, event.clientX, event.clientY);
};

const toDragHandlers = (
  refs: DragRefs,
  component: InsertableComponent
): DragHandlers => ({
  onClickCapture: (event) => swallowClick(refs.dragged, event),
  onPointerCancel: refs.cancel,
  onPointerDown: (event) => handlePointerDown(refs, component, event),
  onPointerMove: (event) => handlePointerMove(refs, component, event),
  onPointerUp: (event) => handlePointerUp(refs, event),
});

export { toDragHandlers };
