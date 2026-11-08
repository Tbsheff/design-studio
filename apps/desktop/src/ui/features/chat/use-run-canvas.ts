import type {
  Project,
  RunCanvasRef,
  SelectionContext,
} from "@design-studio/contracts";
import { stateLabel } from "@design-studio/contracts/frame-state";
import { useState, useSyncExternalStore } from "react";

import { findElement } from "../../platform/find-element.js";
import { uiStore } from "../../platform/storage.js";
import { canvasStore } from "../canvas/canvas-frames-model.js";
import type { CanvasFrame } from "../canvas/canvas-frames-model.js";
import {
  frameStateOf,
  toLoadedStates,
  useFrameStates,
} from "../canvas/frame-states-model.js";
import { activeFrame, defaultLayout } from "../canvas/index.js";
import { inViewIds } from "../canvas/use-canvas-presence.js";

interface RunCanvasChip {
  frameId: string;
  page: string;
  element: string | null;
  state: string | null;
  onRemove: () => void;
}

interface RunCanvas {
  chip: RunCanvasChip | null;
  current: () => RunCanvasRef | undefined;
}

const frameKey = (frame: CanvasFrame): string =>
  `${frame.id}|${frame.path ?? ""}`;

const elementName = (selection: readonly SelectionContext[]): string | null => {
  const [first] = selection;

  if (!first) {
    return null;
  }

  return first.component ?? first.usedBy?.name ?? first.tag;
};

const stage = (): HTMLElement | null =>
  findElement(document.body, '.stage[aria-label="Canvas"]');

const refOf = (frame: CanvasFrame): RunCanvasRef => {
  const inView = inViewIds(stage()).filter((id) => id !== frame.id);

  const ref: RunCanvasRef = {
    frameId: frame.id,
    height: frame.height,
    path: frame.path ?? "",
    width: frame.width,
  };

  if (frame.label) {
    ref.label = frame.label;
  }

  if (inView.length > 0) {
    ref.inView = inView;
  }

  return ref;
};

const useRunCanvas = (
  projectId: string,
  project: Project | null,
  selection: readonly SelectionContext[]
): RunCanvas => {
  const stored = useSyncExternalStore(canvasStore.subscribe, () =>
    canvasStore.get(projectId)
  );

  const frame = activeFrame(stored ?? defaultLayout(uiStore.get().viewport));
  const states = useFrameStates(projectId, Boolean(project?.app));
  const [removed, setRemoved] = useState<string | null>(null);
  const key = frameKey(frame);
  const off = removed === key;

  let chip: RunCanvasChip | null = null;

  if (!off) {
    chip = {
      element: elementName(selection),
      frameId: frame.id,
      onRemove: (): void => setRemoved(key),
      page: `/${frame.path ?? ""}`,
      state: stateLabel(
        toLoadedStates(states),
        frameStateOf(toLoadedStates(states), frame.id)
      ),
    };
  }

  return {
    chip,
    current: () => {
      if (off) {
        return;
      }

      return refOf(frame);
    },
  };
};

export { useRunCanvas };

export type { RunCanvas, RunCanvasChip };
