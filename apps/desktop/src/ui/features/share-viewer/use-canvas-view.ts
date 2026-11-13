import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { toFitView, toZoomedView } from "./canvas-view-model.js";
import type { CanvasView } from "./canvas-view-model.js";
import type { ViewerFrame } from "./share-viewer-model.js";
import { useCanvasPointers } from "./use-canvas-pointers.js";
import type { CanvasPointers } from "./use-canvas-pointers.js";
import { useCanvasWheel } from "./use-canvas-wheel.js";

interface CanvasViewState extends CanvasPointers {
  readonly onFit: () => void;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly view: CanvasView;
}

const ZOOM_STEP = 1.25;

const START_VIEW: CanvasView = { scale: 1, x: 0, y: 0 };

const toStageFit = (
  element: HTMLElement | null,
  frames: readonly ViewerFrame[]
): CanvasView => {
  if (!element) {
    return START_VIEW;
  }

  return toFitView(frames, element.clientWidth, element.clientHeight);
};

const useFirstFit = (
  stage: RefObject<HTMLDivElement | null>,
  frames: readonly ViewerFrame[],
  setView: (view: CanvasView) => void
): void => {
  const isFitted = useRef(false);

  useLayoutEffect(() => {
    const element = stage.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (!isFitted.current && element.clientWidth > 0) {
        isFitted.current = true;
        setView(toStageFit(element, frames));
      }
    });

    observer.observe(element);

    return (): void => observer.disconnect();
  }, [frames, setView, stage]);
};

const useCanvasView = (
  stage: RefObject<HTMLDivElement | null>,
  frames: readonly ViewerFrame[]
): CanvasViewState => {
  const [view, setView] = useState<CanvasView>(START_VIEW);

  useFirstFit(stage, frames, setView);
  useCanvasWheel(stage, setView);
  const pointers = useCanvasPointers(setView);

  const onFit = useCallback((): void => {
    setView(toStageFit(stage.current, frames));
  }, [frames, stage]);

  const zoomBy = useCallback(
    (factor: number): void => {
      const width = stage.current?.clientWidth ?? 0;
      const height = stage.current?.clientHeight ?? 0;

      setView((current) =>
        toZoomedView(current, factor, width / 2, height / 2)
      );
    },
    [stage]
  );

  const onZoomIn = useCallback((): void => zoomBy(ZOOM_STEP), [zoomBy]);
  const onZoomOut = useCallback((): void => zoomBy(1 / ZOOM_STEP), [zoomBy]);

  return { ...pointers, onFit, onZoomIn, onZoomOut, view };
};

export { useCanvasView };

export type { CanvasViewState };
