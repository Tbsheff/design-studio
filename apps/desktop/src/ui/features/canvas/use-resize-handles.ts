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
  onHandleDown: (edge: ResizeEdge, e: ReactPointerEvent<HTMLElement>) => void;
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
  let w = edge === "s" ? base.w : base.w + dx;
  let h = edge === "e" ? base.h : base.h + dy;

  if (keepRatio && base.w > 0 && base.h > 0) {
    const ratio = base.w / base.h;

    if (edge === "e") {
      h = w / ratio;
    } else if (edge === "s") {
      w = h * ratio;
    } else if (Math.abs(dx / base.w) >= Math.abs(dy / base.h)) {
      h = w / ratio;
    } else {
      w = h * ratio;
    }
  }

  return { h: Math.max(1, Math.round(h)), w: Math.max(1, Math.round(w)) };
};

let neighborSeq = 0;

const requestNeighbors = (d: Drag, o: Options): void => {
  if (!o.listen) {
    return;
  }

  neighborSeq += 1;
  const requestId = `nb-${neighborSeq}`;

  const stop = o.listen((message) => {
    if (message.type !== "neighbors" || message.requestId !== requestId) {
      return;
    }

    d.candidates = message.parent
      ? [message.parent, ...message.siblings]
      : message.siblings;
    stop();
  });

  d.stopListen = stop;
  o.post({ requestId, selector: d.target.selector, type: "request-neighbors" });
};

const snapSize = (
  d: Pick<Drag, "edge" | "base" | "target" | "candidates" | "zoom">,
  next: Size,
  off: boolean
): { size: Size; guides: SnapGuide[] } => {
  if (off || d.candidates.length === 0) {
    return { guides: [], size: next };
  }

  const r = d.target.rect;

  const box = {
    height: r.height + next.h - d.base.h,
    width: r.width + next.w - d.base.w,
    x: r.x,
    y: r.y,
  };

  const res = snapRect({
    candidates: d.candidates,
    rect: box,
    x: d.edge === "s" ? null : "end",
    y: d.edge === "e" ? null : "end",
    zoom: d.zoom,
  });

  const size = {
    h: Math.max(1, Math.round(next.h + res.rect.height - box.height)),
    w: Math.max(1, Math.round(next.w + res.rect.width - box.width)),
  };

  return { guides: res.guides, size };
};

const axisStyle = (d: Drag, size: Size): Record<string, string> => {
  const style: Record<string, string> = {};

  if (d.axes.has("width")) {
    style.width = `${size.w}px`;
  }

  if (d.axes.has("height")) {
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

const useResizeHandles = (o: Options): ResizeHandles => {
  const live = useRef(o);
  live.current = o;
  const drag = useRef<Drag | null>(null);
  const [sizes] = useState(() => createLiveStore<LiveSize | null>(null));
  const setSize = sizes.set;

  const target =
    o.enabled && o.selection.length === 1 && o.selection[0]?.source
      ? (o.selection[0] ?? null)
      : null;

  const preview = useCallback((d: Drag, next: Size, keepRatio: boolean) => {
    d.size = next;

    if (d.edge !== "s" || keepRatio) {
      d.axes.add("width");
    }

    if (d.edge !== "e" || keepRatio) {
      d.axes.add("height");
    }

    setSize({
      base: d.base,
      guides: d.guides,
      rect: d.target.rect,
      size: next,
    });
    resizeReadout.set({
      height: next.h,
      selector: d.target.selector,
      width: next.w,
    });
    live.current.post({
      selector: d.target.selector,
      style: axisStyle(d, next),
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
    const d = drag.current;

    if (!d) {
      return;
    }

    live.current.post({
      selector: d.target.selector,
      style: axisStyle(d, d.base),
      type: "preview-style",
    });
    end();
  }, [end]);

  const commit = useCallback(async (d: Drag) => {
    const cur = live.current;
    const style = styleFor(d.size, d.base);
    const req = buildEditRequest(d.target, style);

    if (!req || !cur.directionId) {
      return;
    }

    const { selector } = d.target;
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
        height: d.target.styles.height ?? "",
        width: d.target.styles.width ?? "",
      };

      optimistic.failed(errorText(error));
      live.current.setSelection((prev) =>
        mergeCommit(prev, { selector, style: back })
      );
      live.current.onError(errorText(error));
    }
  }, []);

  const onHandleDown = useCallback(
    (edge: ResizeEdge, e: ReactPointerEvent<HTMLElement>) => {
      const sel = target;

      if (e.button !== 0 || !sel) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      const handle = e.currentTarget;
      handle.setPointerCapture(e.pointerId);

      const base = {
        h: pxOf(sel.styles.height, sel.rect.height),
        w: pxOf(sel.styles.width, sel.rect.width),
      };

      const d: Drag = {
        axes: new Set(),
        base,
        candidates: [],
        edge,
        guides: [],
        pointerId: e.pointerId,
        size: base,
        startX: e.clientX,
        startY: e.clientY,
        stopListen: () => undefined,
        target: sel,
        zoom: scaleOf(handle) || 1,
      };

      drag.current = d;
      document.body.classList.add("element-resizing");
      live.current.holdSwap?.(true, false);
      setSize({ base, guides: [], rect: sel.rect, size: base });
      requestNeighbors(d, live.current);

      const onMove = (ev: PointerEvent): void => {
        if (ev.pointerId !== d.pointerId || drag.current !== d) {
          return;
        }

        const raw = resizedSize(
          d.edge,
          d.base,
          (ev.clientX - d.startX) / d.zoom,
          (ev.clientY - d.startY) / d.zoom,
          ev.shiftKey
        );

        const snapped = snapSize(d, raw, ev.shiftKey || snapOff(ev));
        d.guides = snapped.guides;
        preview(d, snapped.size, ev.shiftKey);
      };

      const detach = (): void => {
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        handle.removeEventListener("pointercancel", onCancel);
        globalThis.removeEventListener("keydown", onKey, true);
      };

      const onUp = (ev: PointerEvent): void => {
        if (ev.pointerId !== d.pointerId) {
          return;
        }

        detach();

        if (drag.current !== d) {
          return;
        }

        const changed = d.size.w !== d.base.w || d.size.h !== d.base.h;
        end(changed);

        if (changed) {
          void commit(d);
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
