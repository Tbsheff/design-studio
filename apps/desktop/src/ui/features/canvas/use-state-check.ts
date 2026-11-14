import { routes } from "@design-studio/actions/canvas/routes";
import { routes as runRoutes } from "@design-studio/actions/run/routes";
import type { CanvasSection } from "@design-studio/contracts/canvas-file";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";

import { selectionRun } from "../../platform/ask-chat.js";
import { useLive } from "../../platform/live-store.js";
import { subscribeDone, useAction } from "../../platform/query.js";
import { canvasStore } from "./canvas-frames-model.js";
import {
  isStateBoardSection,
  toBoardFrameId,
  toStateCheckView,
} from "./state-check-model.js";
import type { StateCheckView } from "./state-check-model.js";
import {
  toSequenceId,
  toStateRunPhase,
  toStopRunId,
} from "./state-run-model.js";
import type { StateRunPhase } from "./state-run-model.js";

interface StateSequence {
  readonly handleDesign: () => void;
  readonly handleStop: () => void;
  readonly isPending: boolean;
  readonly phase: StateRunPhase;
  readonly startError: string | null;
}

interface StateCheckInput {
  readonly headVersionId: string | null;
  readonly projectId: string;
  readonly section: CanvasSection;
}

interface StateCheck extends StateCheckView {
  readonly isRunning: boolean;
  readonly startError: string | null;
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

const START_STATES_ID = runRoutes.startStatesRun.id;

const useSeenSequence = (
  projectId: string,
  sectionId: string
): [boolean, (seenId: string) => void] => {
  const [seenId, setSeenId] = useState<string | null>(null);

  useEffect(
    () =>
      subscribeDone((done) => {
        if (done.actionId === START_STATES_ID && done.projectId === projectId) {
          setSeenId(sectionId);
        }
      }),
    [projectId, sectionId]
  );

  return [seenId === sectionId, setSeenId];
};

const useStateSequence = (
  projectId: string,
  section: CanvasSection
): StateSequence => {
  const [isPending, startTransition] = useTransition();
  const start = useAction(runRoutes.startStatesRun);
  const stop = useAction(runRoutes.stopRun);
  const { run: runStart } = start;
  const { run: runStop } = stop;
  const sectionId = section.id;
  const [hasSequence, setSeenId] = useSeenSequence(projectId, sectionId);

  const sequenceQuery = useMemo(() => {
    if (!hasSequence) {
      return null;
    }

    return { projectId, sequenceId: toSequenceId(sectionId) };
  }, [hasSequence, projectId, sectionId]);

  const { data } = useAction(runRoutes.getStatesRun, sequenceQuery);
  const phase = useMemo(() => toStateRunPhase(data), [data]);

  const handleDesign = useCallback((): void => {
    startTransition(async (): Promise<void> => {
      const started = await runStart({ projectId, section: sectionId });

      if (started !== null) {
        setSeenId(sectionId);
      }
    });
  }, [projectId, runStart, sectionId, setSeenId]);

  const runId = toStopRunId(phase);

  const handleStop = useCallback((): void => {
    if (runId === null) {
      return;
    }

    startTransition(async (): Promise<void> => {
      await runStop({ projectId, runId });
    });
  }, [projectId, runId, runStop]);

  return {
    handleDesign,
    handleStop,
    isPending,
    phase,
    startError: start.error?.message ?? null,
  };
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
  const sequence = useStateSequence(projectId, section);

  return {
    ...view,
    handleDesign: sequence.handleDesign,
    handleStop: sequence.handleStop,
    isRunning: isRunning || sequence.isPending,
    isShown: query !== null && error === null,
    phase: sequence.phase,
    startError: sequence.startError,
  };
};

export { useStateCheck };

export type { StateCheck, StateCheckInput };
