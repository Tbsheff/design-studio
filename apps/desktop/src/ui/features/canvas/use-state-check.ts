import { routes } from "@design-studio/actions/canvas/routes";
import type { CanvasSection } from "@design-studio/contracts/canvas-file";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";

import { selectionRun } from "../../platform/ask-chat.js";
import { useLive } from "../../platform/live-store.js";
import { useAction } from "../../platform/query.js";
import { canvasStore } from "./canvas-frames-model.js";
import {
  isStateBoardSection,
  toBoardFrameId,
  toStateCheckView,
} from "./state-check-model.js";
import type { StateCheckView } from "./state-check-model.js";
import type { StateRunPhase } from "./state-run-model.js";
import { useStateRuns } from "./use-state-runs.js";

interface StateCheckInput {
  readonly headVersionId: string | null;
  readonly projectId: string;
  readonly section: CanvasSection;
}

interface StateCheck extends StateCheckView {
  readonly isRunning: boolean;
  readonly isShown: boolean;
  readonly phase: StateRunPhase;
  readonly handleDesign: () => void;
  readonly handleStop: () => void;
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
  const isRunning = useLive(selectionRun);

  const query = useMemo(() => {
    if (frameId === null) {
      return null;
    }

    const threshold = STATE_CHECK_THRESHOLD;

    return { frame: frameId, projectId, threshold };
  }, [frameId, projectId]);

  const { data, error, refetch } = useAction(
    routes.inspectStateFramesCanvas,
    query
  );

  useVersionRecheck(headVersionId, refetch);

  const view = useMemo(() => toStateCheckView(data), [data]);

  const runs = useStateRuns({ projectId, query, refetch });
  const { handleStart } = runs;

  const handleDesign = useCallback((): void => {
    if (view.plan !== null) {
      handleStart(view.plan);
    }
  }, [handleStart, view.plan]);

  return {
    ...view,
    handleDesign,
    handleStop: runs.handleStop,
    isRunning,
    isShown: query !== null && error === null,
    phase: runs.phase,
  };
};

export { useStateCheck };

export type { StateCheck, StateCheckInput };
