import { useState, useSyncExternalStore } from "react";

import type {
  Project,
  RunCanvasRef,
  SelectionContext,
} from "../../../shared/actions/_core/contracts.js";
import { stateLabel } from "../../../shared/actions/_core/frame-state.js";
import { uiStore } from "../../platform/storage.js";
import {
  activeFrame,
  canvasStore,
  defaultLayout,
} from "../canvas/canvas-frames-model.js";
import type { CanvasFrame } from "../canvas/canvas-frames-model.js";
import { frameStateOf, useFrameStates } from "../canvas/frame-states-model.js";
import { inViewIds } from "../canvas/use-canvas-presence.js";

export interface RunCanvasChip {
  frameId: string;
  page: string;
  element: string | null;
  state: string | null;
  onRemove: () => void;
}

export interface RunCanvas {
  chip: RunCanvasChip | null;
  current: () => RunCanvasRef | undefined;
}

const frameKey = (frame: CanvasFrame): string =>
  `${frame.id}|${frame.path ?? ""}`;

const elementName = (selection: readonly SelectionContext[]): string | null => {
  const first = selection[0];

  if (!first) {
    return null;
  }

  return first.component ?? first.usedBy?.name ?? first.tag;
};

const stage = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('.stage[aria-label="Canvas"]');

const refOf = (frame: CanvasFrame): RunCanvasRef => {
  const inView = inViewIds(stage()).filter((id) => id !== frame.id);

  return {
    frameId: frame.id,
    height: frame.height,
    path: frame.path ?? "",
    width: frame.width,
    ...(frame.label ? { label: frame.label } : {}),
    ...(inView.length > 0 ? { inView } : {}),
  };
};

export const useRunCanvas = (
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

  const chip = off
    ? null
    : {
        element: elementName(selection),
        frameId: frame.id,
        onRemove: () => setRemoved(key),
        page: `/${frame.path ?? ""}`,
        state: stateLabel(
          states ?? null,
          frameStateOf(states ?? null, frame.id)
        ),
      };

  return { chip, current: () => (off ? undefined : refOf(frame)) };
};
