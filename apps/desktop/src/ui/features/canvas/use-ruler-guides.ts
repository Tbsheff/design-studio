import type { CanvasGuide } from "@design-studio/contracts/canvas-file";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

import { observeRulerChanges } from "../../platform/stage-dom.js";
import { shownFrames } from "./canvas-frame-ops.js";
import { canvasStore } from "./canvas-frames-model.js";
import { NO_LINES, frameSnapStore, snapLineStore } from "./frame-snap-store.js";
import { RULER_SIZE, viewOf } from "./ruler-draw.js";
import {
  snapGuideToFrames,
  toMovedGuides,
  toWorld,
} from "./ruler-guide-model.js";
import type { StageView } from "./ruler-guide-model.js";
import { snapOff } from "./snap-model.js";
import type { Axis, Rect } from "./snap-model.js";

const DRAG_THRESHOLD = 3;

interface Origin {
  readonly x: number;
  readonly y: number;
}

interface GuideDrag {
  readonly guide: CanvasGuide;
  readonly index: number | null;
  readonly isRemoving: boolean;
}

interface RulerGuidesInput {
  readonly artboardRef: RefObject<HTMLDivElement | null>;
  readonly hostRef: RefObject<HTMLDivElement | null>;
  readonly origin: Origin;
  readonly projectId: string;
}

interface RulerGuides {
  readonly drag: GuideDrag | null;
  readonly guides: readonly CanvasGuide[];
  readonly onGuideDown: (event: ReactPointerEvent<HTMLElement>) => void;
  readonly onRulerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  readonly view: StageView | null;
}

interface DragStart {
  readonly axis: Axis;
  readonly event: ReactPointerEvent<HTMLElement>;
  readonly index: number | null;
}

interface DragBase {
  readonly axis: Axis;
  readonly box: { readonly left: number; readonly top: number };
  readonly index: number | null;
}

const toAxis = (value: string | undefined): Axis => {
  if (value === "x") {
    return "x";
  }

  return "y";
};

const toIndex = (value: string | undefined): number | null => {
  const index = Number(value);

  if (!value || !Number.isInteger(index)) {
    return null;
  }

  return index;
};

const useStageView = (
  artboardRef: RefObject<HTMLDivElement | null>,
  hostRef: RefObject<HTMLDivElement | null>
): StageView | null => {
  const [view, setView] = useState<StageView | null>(null);

  useEffect(() => {
    let frame = 0;

    const schedule = (): void => {
      if (frame) {
        return;
      }

      frame = requestAnimationFrame(() => {
        frame = 0;
        setView(viewOf(artboardRef.current));
      });
    };

    const stop = observeRulerChanges(
      artboardRef.current,
      hostRef.current,
      schedule
    );

    schedule();

    return (): void => {
      cancelAnimationFrame(frame);
      stop();
    };
  }, [artboardRef, hostRef]);

  return view;
};

const toDragAt = (
  start: DragBase,
  view: StageView,
  origin: Origin,
  pointer: PointerEvent
): GuideDrag => {
  const { box } = start;
  const local = { x: pointer.clientX - box.left, y: pointer.clientY - box.top };
  const at = toWorld(local[start.axis], view, origin[start.axis], start.axis);

  return {
    guide: { at, axis: start.axis },
    index: start.index,
    isRemoving: local[start.axis] < RULER_SIZE,
  };
};

interface GuideSession {
  readonly projectId: string;
  readonly readFrames: () => Rect[];
  readonly readOrigin: () => Origin;
  readonly setDrag: (drag: GuideDrag | null) => void;
  readonly start: DragStart;
  readonly view: StageView;
}

const toSnappedDrag = (
  session: GuideSession,
  drag: GuideDrag,
  pointer: PointerEvent
): GuideDrag => {
  if (drag.isRemoving || snapOff(pointer)) {
    frameSnapStore.set(null);

    return drag;
  }

  const snap = snapGuideToFrames(
    drag.guide,
    session.readFrames(),
    session.view.zoom
  );

  frameSnapStore.set({
    guides: snap.marks,
    shift: { x: 0, y: 0 },
    spacing: [],
  });

  return { ...drag, guide: { at: snap.at, axis: drag.guide.axis } };
};

const toFrameRects = (projectId: string): Rect[] => {
  const layout = canvasStore.get(projectId);

  if (layout === null) {
    return [];
  }

  return shownFrames(layout);
};

const commitGuideDrag = (projectId: string, done: GuideDrag | null): void => {
  if (!done || (done.index === null && done.isRemoving)) {
    return;
  }

  let next: CanvasGuide | null = done.guide;

  if (done.isRemoving) {
    next = null;
  }

  canvasStore.setGuides(
    projectId,
    toMovedGuides(canvasStore.guides(projectId), done.index, next)
  );
};

const toDragBase = (start: DragStart): DragBase => {
  const host = start.event.currentTarget.closest(".ruler-guides");

  return {
    axis: start.axis,
    box: host?.getBoundingClientRect() ?? { left: 0, top: 0 },
    index: start.index,
  };
};

const startGuideDrag = (session: GuideSession): void => {
  const { event } = session.start;
  const target = event.currentTarget;
  const from = { x: event.clientX, y: event.clientY };
  const progress = { drag: null as GuideDrag | null, isMoved: false };
  const base = toDragBase(session.start);
  const abort = new AbortController();
  event.stopPropagation();
  event.preventDefault();
  target.setPointerCapture(event.pointerId);

  const move = (pointer: PointerEvent): void => {
    const distance = Math.hypot(
      pointer.clientX - from.x,
      pointer.clientY - from.y
    );

    if (!progress.isMoved && distance < DRAG_THRESHOLD) {
      return;
    }

    progress.isMoved = true;
    const origin = session.readOrigin();
    const raw = toDragAt(base, session.view, origin, pointer);
    progress.drag = toSnappedDrag(session, raw, pointer);
    session.setDrag(progress.drag);
  };

  const end = (): void => {
    abort.abort();
    frameSnapStore.set(null);
    session.setDrag(null);
    commitGuideDrag(session.projectId, progress.drag);
  };

  const { signal } = abort;
  target.addEventListener("pointermove", move, { signal });
  target.addEventListener("pointerup", end, { signal });
  target.addEventListener("pointercancel", end, { signal });
};

const useRulerGuides = (input: RulerGuidesInput): RulerGuides => {
  const { artboardRef, hostRef, origin, projectId } = input;
  const [drag, setDrag] = useState<GuideDrag | null>(null);
  const view = useStageView(artboardRef, hostRef);
  const latest = useRef({ origin, view });

  const guides = useSyncExternalStore(canvasStore.subscribe, () =>
    canvasStore.guides(projectId)
  );

  useEffect(() => {
    latest.current = { origin, view };
  }, [origin, view]);

  useEffect(() => {
    snapLineStore.set(guides);

    return (): void => {
      snapLineStore.set(NO_LINES);
    };
  }, [guides]);

  const startDrag = useCallback(
    (start: DragStart): void => {
      const { view: stageView } = latest.current;

      const readOrigin = (): Origin => latest.current.origin;

      const readFrames = (): Rect[] => toFrameRects(projectId);

      if (stageView) {
        startGuideDrag({
          projectId,
          readFrames,
          readOrigin,
          setDrag,
          start,
          view: stageView,
        });
      }
    },
    [projectId]
  );

  const onRulerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>): void => {
      const axis = toAxis(event.currentTarget.dataset.axis);
      startDrag({ axis, event, index: null });
    },
    [startDrag]
  );

  const onGuideDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>): void => {
      const axis = toAxis(event.currentTarget.dataset.axis);
      const index = toIndex(event.currentTarget.dataset.index);
      startDrag({ axis, event, index });
    },
    [startDrag]
  );

  return { drag, guides, onGuideDown, onRulerDown, view };
};

export { useRulerGuides };

export type { GuideDrag, RulerGuides };
