import { routes } from "@design-studio/actions/canvas/routes";
import type { CanvasSection } from "@design-studio/contracts/canvas-file";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";

import { selectionRun, sendSelectionPrompt } from "../../platform/ask-chat.js";
import { useLive } from "../../platform/live-store.js";
import { useAction } from "../../platform/query.js";
import { canvasStore } from "./canvas-frames-model.js";
import {
  isStateBoardSection,
  toBoardFrameId,
  toStateCheckView,
} from "./state-check-model.js";
import type { StateCheckView } from "./state-check-model.js";
import { activateFrameId } from "./use-canvas-frames.js";

interface StateCheckInput {
  readonly headVersionId: string | null;
  readonly projectId: string;
  readonly section: CanvasSection;
}

interface StateCheck extends StateCheckView {
  readonly isRunning: boolean;
  readonly isShown: boolean;
  readonly handleDesign: () => void;
}

const STATE_CHECK_THRESHOLD = 0.98;

const useBoardFrameId = (
  projectId: string,
  section: CanvasSection
): string | null => {
  const layout = useSyncExternalStore(canvasStore.subscribe, () =>
    canvasStore.get(projectId)
  );

  return useMemo(() => {
    if (!isStateBoardSection(section)) {
      return null;
    }

    return toBoardFrameId(layout?.frames ?? [], section);
  }, [layout, section]);
};

const useActiveId = (projectId: string): string | null =>
  useSyncExternalStore(
    canvasStore.subscribe,
    () => canvasStore.get(projectId)?.activeId ?? null
  );

const useVersionRecheck = (
  headVersionId: string | null,
  refetch: () => Promise<void>
): void => {
  const seen = useRef(headVersionId);

  useEffect(() => {
    if (seen.current === headVersionId) {
      return;
    }

    seen.current = headVersionId;
    void refetch();
  }, [headVersionId, refetch]);
};

const useStateCheck = (input: StateCheckInput): StateCheck => {
  const { headVersionId, projectId, section } = input;
  const frameId = useBoardFrameId(projectId, section);
  const activeId = useActiveId(projectId);
  const isRunning = useLive(selectionRun);
  const pending = useRef<string | null>(null);

  const query = useMemo(() => {
    if (frameId === null) {
      return null;
    }

    const threshold = STATE_CHECK_THRESHOLD;

    return { frame: frameId, projectId, threshold };
  }, [frameId, projectId]);

  const { data, refetch } = useAction(routes.inspectStateFramesCanvas, query);

  useVersionRecheck(headVersionId, refetch);

  const view = useMemo(() => toStateCheckView(data), [data]);

  useEffect(() => {
    const prompt = pending.current;

    if (prompt !== null && activeId === view.targetId) {
      pending.current = null;
      sendSelectionPrompt(prompt);
    }
  }, [activeId, view.targetId]);

  const handleDesign = useCallback((): void => {
    const { prompt, targetId } = view;

    if (prompt === null || targetId === null) {
      return;
    }

    if (canvasStore.get(projectId)?.activeId === targetId) {
      sendSelectionPrompt(prompt);

      return;
    }

    pending.current = prompt;
    activateFrameId(projectId, targetId);
  }, [projectId, view]);

  return {
    ...view,
    handleDesign,
    isRunning,
    isShown: query !== null,
  };
};

export { useStateCheck };

export type { StateCheck, StateCheckInput };
