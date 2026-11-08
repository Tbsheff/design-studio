import type {
  SelectionContext,
  BridgeToParent,
} from "@design-studio/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { api, errorText } from "../../api.js";
import type { ParentMessageBody } from "../../platform/bridge.js";
import { createLiveStore, useLive } from "../../platform/live-store.js";
import type { LiveStore } from "../../platform/live-store.js";
import { startOptimistic } from "../inspector/optimistic-edit.js";
import { buildEditRequest, mergeCommit } from "../inspector/use-direct-edit.js";
import { snapOff, snapRect } from "./snap-model.js";
import type { Rect, SnapGuide } from "./snap-model.js";

type ResizeEdge = "e" | "s" | "se";

interface Size {
  w: number;
  h: number;
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
  guides: SnapGuide[];
  stopListen: () => void;
}

interface ResizeLive {
  width: number;
  height: number;
  boxWidth: number;
  boxHeight: number;
  guides: SnapGuide[];
}

interface ResizeControl {
  target: SelectionContext | null;
  live: ResizeLive | null;
  onHandleDown: (
    edge: ResizeEdge,
    event: ReactPointerEvent<HTMLElement>
  ) => void;
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
}

const useResizeLive = ({
  target,
  sizes,
  onHandleDown,
}: ResizeHandles): ResizeControl => {
  const size = useLive(sizes);

  const live =
    size && target
      ? {
          boxHeight: size.rect.height + size.size.h - size.base.h,
          boxWidth: size.rect.width + size.size.w - size.base.w,
          guides: size.guides,
          height: size.size.h,
          width: size.size.w,
        }
      : null;

  return { live, onHandleDown, target };
};

const pxOf = (value: string | undefined, fallback: number): number => {
  const parsed = value?.endsWith("px") ? Number.parseFloat(value) : Number.NaN;

  return Math.round(Number.isFinite(parsed) ? parsed : fallback);
};

const scaleOf = (element: Element): number => {
  const overlay = element.closest<HTMLElement>(".overlay");

  if (!overlay || overlay.offsetWidth === 0) {
    return 1;
  }

  return overlay.getBoundingClientRect().width / overlay.offsetWidth;
};

const resizedSize = (
  edge: ResizeEdge,
  base: Size,
  dx: number,
  dy: number,
  keepRatio: boolean
): Size => {
  let widthValue = edge === "s" ? base.w : base.w + dx;
  let heightValue = edge === "e" ? base.h : base.h + dy;

  if (keepRatio && base.w > 0 && base.h > 0) {
    const ratio = base.w / base.h;

    if (edge === "e") {
      heightValue = widthValue / ratio;
    } else if (edge === "s") {
      widthValue = heightValue * ratio;
    } else if (Math.abs(dx / base.w) >= Math.abs(dy / base.h)) {
      heightValue = widthValue / ratio;
    } else {
      widthValue = heightValue * ratio;
    }
  }

  return {
    h: Math.max(1, Math.round(heightValue)),
    w: Math.max(1, Math.round(widthValue)),
  };
};

let neighborSeq = 0;

const requestNeighbors = (dragValue: Drag, options: Options): void => {
  if (!options.listen) {
    return;
  }

  neighborSeq += 1;
  const requestId = `nb-${neighborSeq}`;

  const stop = options.listen((message) => {
    if (message.type !== "neighbors" || message.requestId !== requestId) {
      return;
    }

    dragValue.candidates = message.parent
      ? [message.parent, ...message.siblings]
      : message.siblings;
    stop();
  });

  dragValue.stopListen = stop;
  options.post({
    requestId,
    selector: dragValue.target.selector,
    type: "request-neighbors",
  });
};

const snapSize = (
  delta: Pick<Drag, "edge" | "base" | "target" | "candidates" | "zoom">,
  next: Size,
  off: boolean
): { size: Size; guides: SnapGuide[] } => {
  if (off || delta.candidates.length === 0) {
    return { guides: [], size: next };
  }

  const resultValue = delta.target.rect;

  const box = {
    height: resultValue.height + next.h - delta.base.h,
    width: resultValue.width + next.w - delta.base.w,
    x: resultValue.x,
    y: resultValue.y,
  };

  const res = snapRect({
    candidates: delta.candidates,
    rect: box,
    x: delta.edge === "s" ? null : "end",
    y: delta.edge === "e" ? null : "end",
    zoom: delta.zoom,
  });

  const size = {
    h: Math.max(1, Math.round(next.h + res.rect.height - box.height)),
    w: Math.max(1, Math.round(next.w + res.rect.width - box.width)),
  };

  return { guides: res.guides, size };
};

const axisStyle = (drag3: Drag, size: Size): Record<string, string> => {
  const style: Record<string, string> = {};

  if (drag3.axes.has("width")) {
    style.width = `${size.w}px`;
  }

  if (drag3.axes.has("height")) {
    style.height = `${size.h}px`;
  }

  return style;
};

const styleFor = (size: Size, base: Size): Record<string, string> => {
  const style: Record<string, string> = {};

  if (size.w !== base.w) {
    style.width = `${size.w}px`;
  }

  if (size.h !== base.h) {
    style.height = `${size.h}px`;
  }

  return style;
};

interface ResizeReadout {
  selector: string;
  width: number;
  height: number;
}

const resizeReadout = createLiveStore<ResizeReadout | null>(null);

const useResizeHandles = (optionsValue: Options): ResizeHandles => {
  const live = useRef(optionsValue);
  live.current = optionsValue;
  const drag = useRef<Drag | null>(null);
  const [sizes] = useState(() => createLiveStore<LiveSize | null>(null));
  const setSize = sizes.set;

  const target =
    optionsValue.enabled &&
    optionsValue.selection.length === 1 &&
    optionsValue.selection[0]?.source
      ? (optionsValue.selection[0] ?? null)
      : null;

  const preview = useCallback((drag4: Drag, next: Size, keepRatio: boolean) => {
    drag4.size = next;

    if (drag4.edge !== "s" || keepRatio) {
      drag4.axes.add("width");
    }

    if (drag4.edge !== "e" || keepRatio) {
      drag4.axes.add("height");
    }

    setSize({
      base: drag4.base,
      guides: drag4.guides,
      rect: drag4.target.rect,
      size: next,
    });
    resizeReadout.set({
      height: next.h,
      selector: drag4.target.selector,
      width: next.w,
    });
    live.current.post({
      selector: drag4.target.selector,
      style: axisStyle(drag4, next),
      type: "preview-style",
    });
  }, []);

  const end = useCallback((committing = false) => {
    drag.current?.stopListen();
    drag.current = null;
    setSize(null);
    resizeReadout.set(null);
    document.body.classList.remove("element-resizing");
    live.current.holdSwap?.(false, !committing);
  }, []);

  const cancel = useCallback(() => {
    const deltaValue = drag.current;

    if (!deltaValue) {
      return;
    }

    live.current.post({
      selector: deltaValue.target.selector,
      style: axisStyle(deltaValue, deltaValue.base),
      type: "preview-style",
    });
    end();
  }, [end]);

  const commit = useCallback(async (drag5: Drag) => {
    const cur = live.current;
    const style = styleFor(drag5.size, drag5.base);
    const req = buildEditRequest(drag5.target, style);

    if (!req || !cur.directionId) {
      return;
    }

    const { selector } = drag5.target;
    cur.setSelection((prev) => mergeCommit(prev, { selector, style }));

    const optimistic = startOptimistic(
      { post: cur.post, refreshRects: cur.refreshRects },
      req,
      (message) => live.current.onError(message)
    );

    try {
      const result = await api.directEdit(cur.projectId, cur.directionId, req);
      optimistic.saved(result.tailwind);
      live.current.refreshRects();
    } catch (error) {
      const back = {
        height: drag5.target.styles.height ?? "",
        width: drag5.target.styles.width ?? "",
      };

      optimistic.failed(errorText(error));
      live.current.setSelection((prev) =>
        mergeCommit(prev, { selector, style: back })
      );
      live.current.onError(errorText(error));
    }
  }, []);

  const onHandleDown = useCallback(
    (edge: ResizeEdge, eventValue: ReactPointerEvent<HTMLElement>) => {
      const sel = target;

      if (eventValue.button !== 0 || !sel) {
        return;
      }

      eventValue.preventDefault();
      eventValue.stopPropagation();
      const handle = eventValue.currentTarget;
      handle.setPointerCapture(eventValue.pointerId);

      const base = {
        h: pxOf(sel.styles.height, sel.rect.height),
        w: pxOf(sel.styles.width, sel.rect.width),
      };

      const drag6: Drag = {
        axes: new Set(),
        base,
        candidates: [],
        edge,
        guides: [],
        pointerId: eventValue.pointerId,
        size: base,
        startX: eventValue.clientX,
        startY: eventValue.clientY,
        stopListen: () => undefined,
        target: sel,
        zoom: scaleOf(handle) || 1,
      };

      drag.current = drag6;
      document.body.classList.add("element-resizing");
      live.current.holdSwap?.(true, false);
      setSize({ base, guides: [], rect: sel.rect, size: base });
      requestNeighbors(drag6, live.current);

      const onMove = (ev: PointerEvent): void => {
        if (ev.pointerId !== drag6.pointerId || drag.current !== drag6) {
          return;
        }

        const raw = resizedSize(
          drag6.edge,
          drag6.base,
          (ev.clientX - drag6.startX) / drag6.zoom,
          (ev.clientY - drag6.startY) / drag6.zoom,
          ev.shiftKey
        );

        const snapped = snapSize(drag6, raw, ev.shiftKey || snapOff(ev));
        drag6.guides = snapped.guides;
        preview(drag6, snapped.size, ev.shiftKey);
      };

      const detach = (): void => {
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        handle.removeEventListener("pointercancel", onCancel);
        globalThis.removeEventListener("keydown", onKey, true);
      };

      const onUp = (ev: PointerEvent): void => {
        if (ev.pointerId !== drag6.pointerId) {
          return;
        }

        detach();

        if (drag.current !== drag6) {
          return;
        }

        const changed =
          drag6.size.w !== drag6.base.w || drag6.size.h !== drag6.base.h;

        end(changed);

        if (changed) {
          void commit(drag6);
        }
      };

      const onCancel = (): void => {
        detach();
        cancel();
      };

      const onKey = (ev: KeyboardEvent): void => {
        if (ev.key !== "Escape") {
          return;
        }

        ev.preventDefault();
        ev.stopPropagation();
        onCancel();
      };

      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp);
      handle.addEventListener("pointercancel", onCancel);
      globalThis.addEventListener("keydown", onKey, true);
    },
    [target, preview, end, cancel, commit]
  );

  useEffect(() => (): void => cancel(), [cancel]);

  return { onHandleDown, sizes, target };
};

export {
  resizeReadout,
  resizedSize,
  snapSize,
  useResizeHandles,
  useResizeLive,
};

export type {
  ResizeControl,
  ResizeEdge,
  ResizeHandles,
  ResizeLive,
  ResizeReadout,
};
