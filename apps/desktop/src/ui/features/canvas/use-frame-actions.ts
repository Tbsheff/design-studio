import { useCallback, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

import { addFrame, moveFrame } from "./canvas-frame-ops.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import type { CanvasFrames } from "./use-canvas-frames.js";
import type { ClickThrough } from "./use-click-through.js";
import { useFramePointer } from "./use-frame-pointer.js";
import { useFrameRemoval } from "./use-frame-removal.js";
import { useFrameResize } from "./use-frame-resize.js";
import type { ResizeStart } from "./use-frame-resize.js";
import type { PanZoom } from "./use-pan-zoom.js";

interface FrameLabelBase {
  active: boolean;
  directionId: string | null;
  frame: CanvasFrame;
  onActivate: (frame: CanvasFrame) => void;
  onBodyPointerDown: (
    event: ReactPointerEvent,
    frame: CanvasFrame,
    isBody: boolean
  ) => void;
  onNudge: (frame: CanvasFrame, dx: number, dy: number) => void;
  onPointerDown: (event: ReactPointerEvent, frame: CanvasFrame) => void;
  onRemove: (frame: CanvasFrame) => void;
  onResizeStart: ResizeStart;
  removable: boolean;
}

interface FrameActions {
  addFrameAt: (size: { width: number; height: number }) => void;
  dismissUndo: () => void;
  labelProps: (frame: CanvasFrame) => FrameLabelBase;
  onResizeStart: ResizeStart;
  registerPassive: (id: string, element: HTMLDivElement | null) => void;
  undoRemove: (() => void) | null;
}

const useFrameActions = (
  frames: CanvasFrames,
  pz: PanZoom,
  artboardRef: RefObject<HTMLDivElement | null>,
  clickThrough: ClickThrough | null
): FrameActions => {
  const { layout } = frames;
  const passiveRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const registerPassive = useCallback(
    (id: string, element: HTMLDivElement | null): void => {
      passiveRefs.current[id] = element;
    },
    []
  );

  const addFrameAt = (size: { width: number; height: number }): void => {
    pz.freeze();
    frames.update((current) => addFrame(current, size));
  };

  const removal = useFrameRemoval(frames, pz);

  const onNudge = (frame: CanvasFrame, dx: number, dy: number): void => {
    pz.freeze();
    frames.update((current) => moveFrame(current, frame.id, dx, dy));
  };

  const pointer = useFramePointer({
    artboardRef,
    clickThrough,
    frames,
    passiveRefs,
    pz,
  });

  const onResizeStart = useFrameResize(frames, pz, artboardRef, passiveRefs);

  const { activate: onActivate } = frames;
  const { onFramePointerDown: onBodyPointerDown } = pointer;
  const { onTitlePointerDown: onPointerDown } = pointer;
  const { dismissUndo, removeFrameAt: onRemove, undoRemove } = removal;
  const removable = layout.frames.length > 1;

  const labelProps = (frame: CanvasFrame): FrameLabelBase => ({
    active: frame.id === layout.activeId,
    directionId: null,
    frame,
    onActivate,
    onBodyPointerDown,
    onNudge,
    onPointerDown,
    onRemove,
    onResizeStart,
    removable,
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

export { useFrameActions };

export type { FrameActions, FrameLabelBase };
