import type { PointerEvent as ReactPointerEvent } from "react";

import { toDragPatch, toDragStart, toDragSteps } from "./size-row-model.js";
import type { FixedDrag } from "./size-row-model.js";

const stopClick = (click: MouseEvent): void => {
  click.preventDefault();
  click.stopPropagation();
};

const restoreClick = (): void => {
  globalThis.removeEventListener("click", stopClick, { capture: true });
};

const startClickGuard = (): void => {
  globalThis.addEventListener("click", stopClick, {
    capture: true,
    once: true,
  });
  globalThis.setTimeout(restoreClick, 0);
};

const startFixedDrag = (
  event: ReactPointerEvent<HTMLLabelElement>,
  fixed: FixedDrag
): void => {
  if (event.button !== 0) {
    return;
  }

  event.preventDefault();

  const start = toDragStart(event, fixed);
  const drag = { isMoved: false };

  const move = (ev: PointerEvent): void => {
    if (toDragSteps(start, ev) === 0 && !drag.isMoved) {
      return;
    }

    drag.isMoved = true;
    document.body.classList.add("ins-scrubbing");
    fixed.edit.preview(toDragPatch(fixed, start, ev));
  };

  const stop = (): void => {
    globalThis.removeEventListener("pointermove", move);
    globalThis.removeEventListener("pointerup", stop);
    globalThis.removeEventListener("pointercancel", stop);
    document.body.classList.remove("ins-scrubbing");

    if (drag.isMoved) {
      fixed.edit.commit();
      startClickGuard();
    }
  };

  globalThis.addEventListener("pointermove", move);
  globalThis.addEventListener("pointerup", stop);
  globalThis.addEventListener("pointercancel", stop);
};

export { startFixedDrag };
