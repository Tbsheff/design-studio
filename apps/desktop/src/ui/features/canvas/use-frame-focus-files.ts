import { useMemo, useSyncExternalStore } from "react";

import { useLive } from "../../platform/live-store.js";
import { canvasStore } from "./canvas-frames-model.js";
import { toFramePageFiles } from "./frame-focus-model.js";
import type { FrameFocusFiles } from "./frame-focus-model.js";
import { frameSelectionStore } from "./frame-selection-store.js";

const useFrameFocusFiles = (
  projectId: string,
  isApp: boolean
): FrameFocusFiles => {
  const selection = useLive(frameSelectionStore);

  const layout = useSyncExternalStore(canvasStore.subscribe, () =>
    canvasStore.get(projectId)
  );

  return useMemo(() => {
    let ids: readonly string[] = [];

    if (selection.projectId === projectId) {
      ({ ids } = selection);
    }

    return toFramePageFiles(layout?.frames ?? [], ids, isApp);
  }, [isApp, layout, projectId, selection]);
};

export { useFrameFocusFiles };
