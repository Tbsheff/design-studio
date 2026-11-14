import { useEffect } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

import { useLive } from "../../platform/live-store.js";
import { canvasHasKeys, isTypingTarget } from "../../platform/typing-target.js";
import { useLatest } from "../../platform/use-latest.js";
import { quietOnPointer } from "./canvas-helpers.js";
import { toNudgeStep } from "./frame-label-view-model.js";
import {
  toBoxFromPoints,
  toBoxIds,
  toMergedIds,
  toMovedLayout,
  toVisibleIds,
} from "./frame-selection-model.js";
import type { Point } from "./frame-selection-model.js";
import {
  clearFrameSelection,
  frameMarqueeStore,
  frameSelectionStore,
  setSelectedIds,
  toSelectedIds,
} from "./frame-selection-store.js";
import type { CanvasFrames } from "./use-canvas-frames.js";
import type { PanZoom } from "./use-pan-zoom.js";

const MARQUEE_MIN = 3;

interface FrameSelectionKeysInput {
  readonly clearLayers: () => void;
  readonly frames: CanvasFrames;
  readonly isBlocked: boolean;
  readonly removeFramesAt: (ids: readonly string[]) => void;
  readonly selectSiblings: () => void;
  readonly selectionCount: number;
}

interface FrameMarqueeInput {
  readonly artboardRef: RefObject<HTMLDivElement | null>;
  readonly frames: CanvasFrames;
  readonly isBlocked: boolean;
  readonly pz: PanZoom;
}

const useSelectedFrameIds = (): readonly string[] =>
  useLive(frameSelectionStore).ids;

const useIsFrameSelected = (frameId: string): boolean =>
  useLive(frameSelectionStore).ids.includes(frameId);

const isFrameKeyTarget = (target: EventTarget | null): boolean => {
  if (isTypingTarget(target)) {
    return false;
  }

  if (canvasHasKeys()) {
    return true;
  }

  const active = document.activeElement;

  return (
    active instanceof HTMLElement && active.closest(".frame-label") !== null
  );
};

const isPlainCommand = (event: KeyboardEvent): boolean =>
  (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey;

const isSelectAllKey = (event: KeyboardEvent): boolean =>
  isPlainCommand(event) && event.key.toLowerCase() === "a";

const isDeleteKey = (event: KeyboardEvent): boolean =>
  !event.metaKey &&
  !event.ctrlKey &&
  (event.key === "Delete" || event.key === "Backspace");

const runSelectionKey = (
  event: KeyboardEvent,
  input: FrameSelectionKeysInput
): boolean => {
  const { frames } = input;
  const ids = toSelectedIds(frames.projectId);

  if (isSelectAllKey(event) && input.selectionCount > 0) {
    input.selectSiblings();

    return true;
  }

  if (isSelectAllKey(event)) {
    setSelectedIds(frames.projectId, toVisibleIds(frames.layout));

    return true;
  }

  if (ids.length === 0) {
    return false;
  }

  if (event.key === "Escape") {
    return clearFrameSelection();
  }

  if (isDeleteKey(event)) {
    clearFrameSelection();
    input.removeFramesAt(ids);

    return true;
  }

  const step = toNudgeStep(event.key, event.shiftKey);

  if (step === null || event.metaKey || event.ctrlKey || event.altKey) {
    return false;
  }

  frames.update((layout) =>
    toMovedLayout(layout, ids, { x: step[0], y: step[1] })
  );

  return true;
};

const useLayerExclusion = (input: FrameSelectionKeysInput): void => {
  const latest = useLatest(input);
  const ids = useSelectedFrameIds();
  const { selectionCount } = input;

  useEffect(() => {
    if (selectionCount > 0) {
      clearFrameSelection();
    }
  }, [selectionCount]);

  useEffect(() => {
    if (ids.length > 0 && latest.current.selectionCount > 0) {
      latest.current.clearLayers();
    }
  }, [ids, latest]);
};

const useFrameSelectionKeys = (input: FrameSelectionKeysInput): void => {
  const latest = useLatest(input);
  const { projectId } = input.frames;

  useLayerExclusion(input);

  useEffect(() => {
    if (toSelectedIds(projectId).length === 0) {
      clearFrameSelection();
    }
  }, [projectId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (
        event.defaultPrevented ||
        latest.current.isBlocked ||
        !isFrameKeyTarget(event.target)
      ) {
        return;
      }

      if (runSelectionKey(event, latest.current)) {
        event.preventDefault();
      }
    };

    globalThis.addEventListener("keydown", onKey);

    return (): void => globalThis.removeEventListener("keydown", onKey);
  }, [latest]);
};

const toWorldPoint = (
  artboard: HTMLDivElement,
  input: FrameMarqueeInput,
  client: Point
): Point => {
  const rect = artboard.getBoundingClientRect();
  const { active } = input.frames;
  const { zoom } = input.pz;

  return {
    x: active.x + (client.x - rect.left) / zoom,
    y: active.y + (client.y - rect.top) / zoom,
  };
};

const toStageBox = (stage: HTMLElement, start: Point, end: Point): Point[] => {
  const rect = stage.getBoundingClientRect();

  return [
    { x: start.x - rect.left, y: start.y - rect.top },
    { x: end.x - rect.left, y: end.y - rect.top },
  ];
};

const isBareStagePress = (event: ReactPointerEvent<HTMLDivElement>): boolean =>
  event.button === 0 &&
  !event.defaultPrevented &&
  event.target === event.currentTarget;

const isFreeStage = (input: FrameMarqueeInput): boolean =>
  !input.isBlocked && !input.pz.spaceHeld && !input.pz.zoomHeld;

const isMarqueeStart = (
  event: ReactPointerEvent<HTMLDivElement>,
  input: FrameMarqueeInput
): boolean => isBareStagePress(event) && isFreeStage(input);

const toBaseIds = (isAdding: boolean, projectId: string): readonly string[] => {
  if (isAdding) {
    return toSelectedIds(projectId);
  }

  return [];
};

const startMarquee = (
  event: ReactPointerEvent<HTMLDivElement>,
  input: FrameMarqueeInput
): void => {
  const stage = event.currentTarget;
  const artboard = input.artboardRef.current;

  if (!artboard) {
    return;
  }

  const start = { x: event.clientX, y: event.clientY };
  const base = toBaseIds(event.shiftKey, input.frames.projectId);
  const abort = new AbortController();
  const { signal } = abort;
  const progress = { isMoved: false };

  stage.setPointerCapture(event.pointerId);

  const pick = (end: Point): void => {
    const box = toBoxFromPoints(
      toWorldPoint(artboard, input, start),
      toWorldPoint(artboard, input, end)
    );

    const [corner, far] = toStageBox(stage, start, end);

    frameMarqueeStore.set(toBoxFromPoints(corner ?? start, far ?? end));
    setSelectedIds(
      input.frames.projectId,
      toMergedIds(base, toBoxIds(input.frames.layout, box))
    );
  };

  const move = (moveEvent: PointerEvent): void => {
    const end = { x: moveEvent.clientX, y: moveEvent.clientY };

    if (
      !progress.isMoved &&
      Math.hypot(end.x - start.x, end.y - start.y) < MARQUEE_MIN
    ) {
      return;
    }

    progress.isMoved = true;
    pick(end);
  };

  const end = (): void => {
    abort.abort();
    frameMarqueeStore.set(null);

    if (!progress.isMoved && !event.shiftKey) {
      clearFrameSelection();
    }
  };

  stage.addEventListener(
    "pointermove",
    (moveEvent) => {
      if (moveEvent instanceof PointerEvent) {
        move(moveEvent);
      }
    },
    { signal }
  );
  stage.addEventListener("pointerup", end, { signal });
  stage.addEventListener("pointercancel", end, { signal });
};

const useFrameMarquee = (
  input: FrameMarqueeInput
): ((event: ReactPointerEvent<HTMLDivElement>) => void) => {
  const latest = useLatest(input);

  return (event: ReactPointerEvent<HTMLDivElement>): void => {
    const { current } = latest;

    if (isMarqueeStart(event, current)) {
      startMarquee(event, current);
    }
  };
};

const useStagePointerDown = (
  input: FrameMarqueeInput
): ((event: ReactPointerEvent<HTMLDivElement>) => void) => {
  const startBox = useFrameMarquee(input);
  const { onPointerDown: panPointerDown } = input.pz;

  return quietOnPointer((event): void => {
    panPointerDown(event);
    startBox(event);
  });
};

const useFrameMarqueeBox = (): ReturnType<typeof frameMarqueeStore.get> =>
  useLive(frameMarqueeStore);

export {
  useFrameMarquee,
  useFrameMarqueeBox,
  useFrameSelectionKeys,
  useIsFrameSelected,
  useSelectedFrameIds,
  useStagePointerDown,
};

export type { FrameMarqueeInput, FrameSelectionKeysInput };
