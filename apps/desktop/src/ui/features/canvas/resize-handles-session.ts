import type { SelectionContext } from "@design-studio/contracts";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

import {
  axisStyle,
  resizeReadout,
  resizedSize,
  snapSize,
  toPixels,
  toScale,
} from "./resize-handles-model.js";
import type {
  Drag,
  LiveSize,
  Options,
  ResizeEdge,
  Size,
} from "./resize-handles-model.js";
import { snapOff } from "./snap-model.js";
import type { Rect } from "./snap-model.js";

interface ResizeContext {
  readonly commit: (drag: Drag) => Promise<void>;
  readonly drag: { current: Drag | null };
  readonly live: RefObject<Options>;
  readonly setSize: (size: LiveSize | null) => void;
}

const NEIGHBOR_IDS = (function* toNeighborIds(): Generator<string> {
  for (let count = 1; ; count += 1) {
    yield `nb-${count}`;
  }
})();

const toParents = (parent: Rect | null): Rect[] => {
  if (parent) {
    return [parent];
  }

  return [];
};

const requestNeighbors = (drag: Drag, options: Options): void => {
  if (!options.listen) {
    return;
  }

  const requestId = NEIGHBOR_IDS.next().value;

  const stop = options.listen((message) => {
    if (message.type !== "neighbors" || message.requestId !== requestId) {
      return;
    }

    drag.candidates = [...toParents(message.parent), ...message.siblings];
    stop();
  });

  drag.stopListen = stop;
  options.post({
    requestId,
    selector: drag.target.selector,
    type: "request-neighbors",
  });
};

const previewDrag = (
  context: ResizeContext,
  drag: Drag,
  next: Size,
  keepRatio: boolean
): void => {
  drag.size = next;

  if (drag.edge !== "s" || keepRatio) {
    drag.axes.add("width");
  }

  if (drag.edge !== "e" || keepRatio) {
    drag.axes.add("height");
  }

  context.setSize({
    base: drag.base,
    guides: drag.guides,
    rect: drag.target.rect,
    size: next,
  });
  resizeReadout.set({
    height: next.height,
    selector: drag.target.selector,
    width: next.width,
  });
  context.live.current.post({
    selector: drag.target.selector,
    style: axisStyle(drag, next),
    type: "preview-style",
  });
};

const endDrag = (context: ResizeContext, isCommitting: boolean): void => {
  context.drag.current?.stopListen();
  context.drag.current = null;
  context.setSize(null);
  resizeReadout.set(null);
  document.body.classList.remove("element-resizing");
  context.live.current.holdSwap?.(false, !isCommitting);
};

const cancelDrag = (context: ResizeContext): void => {
  const drag = context.drag.current;

  if (!drag) {
    return;
  }

  drag.detach();
  context.live.current.post({
    selector: drag.target.selector,
    style: axisStyle(drag, drag.base),
    type: "preview-style",
  });
  endDrag(context, false);
};

const moveDrag = (
  context: ResizeContext,
  drag: Drag,
  event: PointerEvent
): void => {
  if (event.pointerId !== drag.pointerId || context.drag.current !== drag) {
    return;
  }

  const raw = resizedSize(
    drag.edge,
    drag.base,
    {
      dx: (event.clientX - drag.startX) / drag.zoom,
      dy: (event.clientY - drag.startY) / drag.zoom,
    },
    event.shiftKey
  );

  const snapped = snapSize(drag, raw, event.shiftKey || snapOff(event));
  drag.guides = snapped.guides;
  previewDrag(context, drag, snapped.size, event.shiftKey);
};

const releaseDrag = (context: ResizeContext, drag: Drag): void => {
  drag.detach();

  if (context.drag.current !== drag) {
    return;
  }

  const isChanged =
    drag.size.width !== drag.base.width ||
    drag.size.height !== drag.base.height;

  endDrag(context, isChanged);

  if (isChanged) {
    void context.commit(drag);
  }
};

const listenDrag = (
  context: ResizeContext,
  drag: Drag,
  handle: HTMLElement
): void => {
  const abort = new AbortController();
  const { signal } = abort;
  drag.detach = (): void => abort.abort();

  handle.addEventListener(
    "pointermove",
    (event) => moveDrag(context, drag, event),
    { signal }
  );
  handle.addEventListener(
    "pointerup",
    (event) => {
      if (event.pointerId === drag.pointerId) {
        releaseDrag(context, drag);
      }
    },
    { signal }
  );
  handle.addEventListener("pointercancel", () => cancelDrag(context), {
    signal,
  });
  globalThis.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        cancelDrag(context);
      }
    },
    { capture: true, signal }
  );
};

const createDrag = (
  source: SelectionContext,
  resizeEdge: ResizeEdge,
  event: ReactPointerEvent<HTMLElement>
): Drag => {
  const startSize = {
    height: toPixels(source.styles.height, source.rect.height),
    width: toPixels(source.styles.width, source.rect.width),
  };

  return {
    axes: new Set(),
    base: startSize,
    candidates: [],
    detach: () => null,
    edge: resizeEdge,
    guides: [],
    pointerId: event.pointerId,
    size: startSize,
    startX: event.clientX,
    startY: event.clientY,
    stopListen: () => null,
    target: source,
    zoom: toScale(event.currentTarget) || 1,
  };
};

const beginResize = (
  context: ResizeContext,
  target: SelectionContext | null,
  edge: ResizeEdge,
  event: ReactPointerEvent<HTMLElement>
): void => {
  if (event.button !== 0 || !target) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  const handle = event.currentTarget;
  handle.setPointerCapture(event.pointerId);
  const drag = createDrag(target, edge, event);
  context.drag.current = drag;
  document.body.classList.add("element-resizing");
  context.live.current.holdSwap?.(true, false);
  context.setSize({
    base: drag.base,
    guides: [],
    rect: target.rect,
    size: drag.base,
  });
  requestNeighbors(drag, context.live.current);
  listenDrag(context, drag, handle);
};

export { beginResize, cancelDrag };

export type { ResizeContext };
