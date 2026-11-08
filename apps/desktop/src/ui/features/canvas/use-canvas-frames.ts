import { zoomKeyOf } from "@design-studio/contracts";
import type {
  ProjectKind,
  SelectionContext,
  ZoomKey,
} from "@design-studio/contracts";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

import { useDesktopCommand } from "../../platform/desktop.js";
import { uiStore, useUi } from "../../platform/storage.js";
import type { FilesChange } from "../home/use-studio-data.js";
import {
  activeFrame,
  addFrame,
  canvasStore,
  defaultLayout,
  followDirection,
  moveFrame,
  removeFrame,
  resizeActive,
  useCanvasLayout,
  viewportOf,
} from "./canvas-frames-model.js";
import type { Box, CanvasFrame, CanvasLayout } from "./canvas-frames-model.js";
import { snapOff, snapRect } from "./snap-model.js";
import type { ClickThrough } from "./use-click-through.js";
import {
  frameSnapStore,
  otherFrames,
  useFrameResize,
} from "./use-frame-resize.js";
import { blocksZoomKey } from "./use-pan-zoom.js";
import type { PanZoom } from "./use-pan-zoom.js";

const ZOOM_ECHO_MS = 150;
const DRAG_THRESHOLD = 3;
const TITLE_DOUBLE_MS = 400;

type ZoomSource = "key" | "frame" | "menu";

const unionRect = (selection: SelectionContext[]): Box | null => {
  if (selection.length === 0) {
    return null;
  }
  const left = Math.min(...selection.map((s) => s.rect.x));
  const top = Math.min(...selection.map((s) => s.rect.y));
  const right = Math.max(...selection.map((s) => s.rect.x + s.rect.width));
  const bottom = Math.max(...selection.map((s) => s.rect.y + s.rect.height));

  return { height: bottom - top, width: right - left, x: left, y: top };
};

const passiveSrc = (
  baseUrl: string | null,
  kind: ProjectKind,
  change: FilesChange | null
): string | null => {
  if (!baseUrl) {
    return null;
  }
  if (kind !== "html" || !change) {
    return baseUrl;
  }
  const url = new URL(baseUrl, window.location.href);
  url.searchParams.set("v", String(change.changedAt));

  return url.toString();
};

interface CanvasFrames {
  layout: CanvasLayout;
  active: CanvasFrame;
  update: (fn: (layout: CanvasLayout) => CanvasLayout) => void;
  activate: (frame: CanvasFrame) => void;
}

const useCanvasFrames = (
  projectId: string,
  directionId: string | null = null,
  onDirection?: (id: string) => void,
  knownIds?: string[]
): CanvasFrames => {
  const { viewport } = useUi();
  const [layout, update] = useCanvasLayout(projectId, viewport);
  const active = activeFrame(layout);
  const synced = useRef<{ pid: string; w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const prev = synced.current;
    synced.current = { h: viewport.height, pid: projectId, w: viewport.width };

    if (!prev || prev.pid !== projectId) {
      if (
        active.width !== viewport.width ||
        active.height !== viewport.height
      ) {
        uiStore.set({ viewport: viewportOf(active) });
      }
      return;
    }

    if (prev.w !== viewport.width || prev.h !== viewport.height) {
      update((l) => resizeActive(l, viewport.width, viewport.height));
    }
  });
  useLayoutEffect(() => {
    if (!directionId) {
      return;
    }
    const current = canvasStore.get(projectId) ?? defaultLayout(viewport);
    const bound = activeFrame(current).directionId;

    if (bound && knownIds && !knownIds.includes(bound)) {
      return;
    }
    const next = followDirection(current, directionId);

    if (next === current) {
      return;
    }
    canvasStore.set(projectId, next);
    const a = activeFrame(next);

    if (a.width !== viewport.width || a.height !== viewport.height) {
      uiStore.set({ viewport: viewportOf(a) });
    }
  }, [projectId, directionId, layout]);

  const activate = (frame: CanvasFrame): void => {
    if (frame.id === layout.activeId) {
      return;
    }
    update((l) => ({ ...l, activeId: frame.id }));
    uiStore.set({ viewport: viewportOf(frame) });

    if (frame.directionId && frame.directionId !== directionId) {
      onDirection?.(frame.directionId);
    }
  };

  return { activate, active, layout, update };
};

const useZoomInput = (
  apply: (key: ZoomKey) => void
): ((key: ZoomKey, from: ZoomSource) => void) => {
  const lastZoom = useRef<{
    key: ZoomKey;
    source: ZoomSource;
    at: number;
  } | null>(null);

  const zoomBy = useCallback(
    (key: ZoomKey, from: ZoomSource) => {
      const now = performance.now();
      const last = lastZoom.current;

      if (
        last &&
        last.key === key &&
        last.source !== from &&
        now - last.at < ZOOM_ECHO_MS
      ) {
        return;
      }
      lastZoom.current = { at: now, key, source: from };
      apply(key);
    },
    [apply]
  );

  useDesktopCommand((command) => {
    if (command.type !== "zoom") {
      return false;
    }
    zoomBy(command.key, "menu");

    return true;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const key = zoomKeyOf(e);

      if (!key || blocksZoomKey(e)) {
        return;
      }
      e.preventDefault();
      zoomBy(key, "key");
    };

    window.addEventListener("keydown", onKey);

    return (): void => window.removeEventListener("keydown", onKey);
  }, [zoomBy]);

  return zoomBy;
};

const snapMove = (
  state: DragState,
  candidates: Box[],
  wx: number,
  wy: number,
  off: boolean
): { x: number; y: number } => {
  if (off || candidates.length === 0) {
    frameSnapStore.set(null);

    return { x: wx, y: wy };
  }

  const f = state.frame;

  const res = snapRect({
    candidates,
    rect: { height: f.height, width: f.width, x: f.x + wx, y: f.y + wy },
    x: "move",
    y: "move",
    zoom: state.zoom,
  });

  const sx = res.rect.x - f.x;
  const sy = res.rect.y - f.y;
  frameSnapStore.set({
    guides: res.guides,
    shift: state.isActive ? { x: -sx, y: -sy } : { x: 0, y: 0 },
    spacing: res.spacing,
  });

  return { x: sx, y: sy };
};

interface DragState {
  frame: CanvasFrame;
  isActive: boolean;
  zoom: number;
  passive: HTMLDivElement[];
  own: HTMLDivElement | null;
}

const placeDrag = (
  state: DragState,
  artboard: HTMLDivElement | null,
  dx: number,
  dy: number
): void => {
  const wx = dx / state.zoom;
  const wy = dy / state.zoom;
  const clear = dx === 0 && dy === 0;

  if (state.isActive) {
    if (artboard) {
      artboard.style.translate = clear ? "" : `${dx}px ${dy}px`;
    }
    for (const el of state.passive) {
      el.style.translate = clear ? "" : `${-wx}px ${-wy}px`;
    }
  } else if (state.own) {
    state.own.style.translate = clear ? "" : `${wx}px ${wy}px`;
  }
};

const pointIn = (
  target: HTMLElement,
  clientX: number,
  clientY: number,
  zoom: number
): { x: number; y: number } => {
  const rect = target.getBoundingClientRect();

  return { x: (clientX - rect.left) / zoom, y: (clientY - rect.top) / zoom };
};

const useFrameActions = (
  frames: CanvasFrames,
  pz: PanZoom,
  artboardRef: RefObject<HTMLDivElement | null>,
  clickThrough?: ClickThrough
) => {
  const { layout } = frames;
  const passiveRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const registerPassive = useCallback(
    (id: string, el: HTMLDivElement | null) => {
      passiveRefs.current[id] = el;
    },
    []
  );

  const addFrameAt = (size: { width: number; height: number }): void => {
    pz.freeze();
    frames.update((l) => addFrame(l, size));
  };

  const [removed, setRemoved] = useState<CanvasLayout | null>(null);

  const removeFrameAt = (frame: CanvasFrame): void => {
    pz.freeze();
    const next = removeFrame(layout, frame.id);
    setRemoved(layout);
    frames.update(() => next);

    if (frame.id === layout.activeId) {
      uiStore.set({ viewport: viewportOf(activeFrame(next)) });
    }
  };

  const undoRemove = removed
    ? (): void => {
        frames.update(() => removed);
        uiStore.set({ viewport: viewportOf(activeFrame(removed)) });
        setRemoved(null);
      }
    : null;

  const dismissUndo = useCallback(() => setRemoved(null), []);

  const nudge = (frame: CanvasFrame, dx: number, dy: number): void => {
    pz.freeze();
    frames.update((l) => moveFrame(l, frame.id, dx, dy));
  };

  const onFramePointerDown = (
    e: ReactPointerEvent,
    frame: CanvasFrame,
    body?: boolean
  ): void => {
    if (e.button !== 0 || pz.spaceHeld || pz.zoomHeld) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    const point = body ? pointIn(target, e.clientX, e.clientY, pz.zoom) : null;
    target.setPointerCapture(e.pointerId);

    const state: DragState = {
      frame,
      isActive: frame.id === layout.activeId,
      own: passiveRefs.current[frame.id] ?? null,
      passive: Object.values(passiveRefs.current).filter(
        (el): el is HTMLDivElement => el !== null
      ),
      zoom: pz.zoom,
    };

    const startX = e.clientX;
    const startY = e.clientY;
    const candidates = otherFrames(layout, frame.id);
    let moved = false;
    let world = { x: 0, y: 0 };

    const move = (ev: PointerEvent): void => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      if (!moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) {
        return;
      }
      if (!moved) {
        document.body.classList.add("frame-dragging");
      }
      moved = true;
      world = snapMove(
        state,
        candidates,
        dx / state.zoom,
        dy / state.zoom,
        snapOff(ev)
      );
      placeDrag(
        state,
        artboardRef.current,
        world.x * state.zoom,
        world.y * state.zoom
      );
    };

    const end = (): void => {
      target.removeEventListener("pointermove", move as EventListener);
      target.removeEventListener("pointerup", end);
      target.removeEventListener("pointercancel", end);
      document.body.classList.remove("frame-dragging");
      frameSnapStore.set(null);
      placeDrag(state, artboardRef.current, 0, 0);

      if (!moved) {
        frames.activate(frame);

        if (point) {
          clickThrough?.(point);
        }
        return;
      }

      pz.freeze();
      frames.update((l) => moveFrame(l, frame.id, world.x, world.y));
    };

    target.addEventListener("pointermove", move as EventListener);
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
  };

  const lastTitle = useRef<{ id: string; at: number } | null>(null);

  const onTitlePointerDown = (
    e: ReactPointerEvent,
    frame: CanvasFrame
  ): void => {
    const last = lastTitle.current;
    const now = performance.now();
    lastTitle.current = { at: now, id: frame.id };

    if (
      e.button !== 0 ||
      !last ||
      last.id !== frame.id ||
      now - last.at > TITLE_DOUBLE_MS
    ) {
      return onFramePointerDown(e, frame);
    }
    e.preventDefault();
    e.stopPropagation();
    lastTitle.current = null;
    frames.activate(frame);
    pz.zoomToActive();
  };

  const onResizeStart = useFrameResize(frames, pz, artboardRef, passiveRefs);

  const labelProps = (frame: CanvasFrame) => ({
    active: frame.id === layout.activeId,
    directionId: null as string | null,
    frame,
    onActivate: frames.activate,
    onBodyPointerDown: onFramePointerDown,
    onNudge: nudge,
    onPointerDown: onTitlePointerDown,
    onRemove: removeFrameAt,
    onResizeStart,
    removable: layout.frames.length > 1,
  });

  return {
    addFrameAt,
    dismissUndo,
    labelProps,
    onResizeStart,
    registerPassive,
    undoRemove,
  };
};

export {
  passiveSrc,
  unionRect,
  useCanvasFrames,
  useFrameActions,
  useZoomInput,
};

export type { CanvasFrames };
