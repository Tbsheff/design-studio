import type { ProjectKind } from "@design-studio/contracts";

import { uiStore, useUi } from "../../platform/storage.js";
import type { FilesChange } from "../home/use-studio-data.js";
import { activeFrame, viewportOf } from "./canvas-frame-ops.js";
import { unionRect } from "./canvas-frames-helpers.js";
import { useCanvasLayout } from "./canvas-frames-model.js";
import type { CanvasFrame, CanvasLayout } from "./canvas-frames-model.js";
import { useDirectionFollow, useViewportMirror } from "./use-viewport-sync.js";

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

  const url = new URL(baseUrl, globalThis.location.href);
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
  directionId: string | null,
  onDirection: ((id: string) => void) | null,
  knownIds: string[] | null
): CanvasFrames => {
  const { viewport } = useUi();
  const [layout, update] = useCanvasLayout(projectId, viewport);
  const active = activeFrame(layout);
  useViewportMirror({ active, projectId, update, viewport });
  useDirectionFollow({ directionId, knownIds, layout, projectId, viewport });

  const activate = (frame: CanvasFrame): void => {
    if (frame.id === layout.activeId) {
      return;
    }

    update((current) => ({ ...current, activeId: frame.id }));
    uiStore.set({ viewport: viewportOf(frame) });

    if (frame.directionId && frame.directionId !== directionId) {
      onDirection?.(frame.directionId);
    }
  };

  return { activate, active, layout, update };
};

export { passiveSrc, unionRect, useCanvasFrames };

export type { CanvasFrames };
