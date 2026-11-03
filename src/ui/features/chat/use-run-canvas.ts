import { useState, useSyncExternalStore } from "react";

import type {
  Project,
  RunCanvasRef,
  SelectionContext,
} from "../../../shared/contracts.js";
import { stateLabel } from "../../../shared/frame-state.js";
import { activeFrame, canvasStore, defaultLayout } from "../../canvasFrames.js";
import type { CanvasFrame } from "../../canvasFrames.js";
import { frameStateOf, useFrameStates } from "../../frameStates.js";
import { uiStore } from "../../storage.js";
import { inViewIds } from "../../useCanvasPresence.js";

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

function frameKey(frame: CanvasFrame): string {
  return `${frame.id}|${frame.path ?? ""}`;
}

function elementName(selection: readonly SelectionContext[]): string | null {
  const first = selection[0];

  if (!first) {
    return null;
  }

  return first.component ?? first.usedBy?.name ?? first.tag;
}

function stage(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.stage[aria-label="Canvas"]');
}

function refOf(frame: CanvasFrame): RunCanvasRef {
  const inView = inViewIds(stage()).filter((id) => id !== frame.id);

  return {
    frameId: frame.id,
    path: frame.path ?? "",
    width: frame.width,
    height: frame.height,
    ...(frame.label ? { label: frame.label } : {}),
    ...(inView.length ? { inView } : {}),
  };
}

export function useRunCanvas(
  projectId: string,
  project: Project | null,
  selection: readonly SelectionContext[]
): RunCanvas {
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
        frameId: frame.id,
        page: `/${frame.path ?? ""}`,
        element: elementName(selection),
        state: stateLabel(
          states ?? null,
          frameStateOf(states ?? null, frame.id)
        ),
        onRemove: () => setRemoved(key),
      };

  return { chip, current: () => (off ? undefined : refOf(frame)) };
}
