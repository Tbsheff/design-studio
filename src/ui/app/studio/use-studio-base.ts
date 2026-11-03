import { useCallback, useMemo, useState } from "react";

import { useVariations } from "../../features/canvas/use-variations";
import { lastImproveRun } from "../../features/chat/draft-improve";
import type { RunView } from "../../features/chat/run-state-model";
import { useRunCanvas } from "../../features/chat/use-run-canvas";
import { useComments } from "../../features/comments";
import {
  useDesignSystemState,
  usePackActions,
} from "../../features/design-system";
import { useStudioData } from "../../features/home/use-studio-data";
import { useDesktopContext } from "../../platform/desktop";
import type { StudioBase, StudioData, StudioRuns } from "./studio-core-types";
import type { StudioUi } from "./studio-ui-types";

const useStudioRuns = (
  data: StudioData,
  directionId: string | null
): StudioRuns => {
  const { runs } = data;

  const directionRuns = useMemo(
    (): RunView[] =>
      Object.values(runs)
        .filter((run): boolean => run.directionId === directionId)
        .toSorted(
          (first, second): number => first.startedAt - second.startedAt
        ),
    [runs, directionId]
  );

  const activeRun =
    directionRuns.find((run): boolean => run.status === "running") ?? null;

  const [pendingRun, setPendingRun] = useState<RunView | null>(null);
  const improveRun = lastImproveRun(directionRuns);

  return { activeRun, directionRuns, improveRun, pendingRun, setPendingRun };
};

const useStudioBase = (projectId: string, ui: StudioUi): StudioBase => {
  const data = useStudioData(projectId);
  const { project, directionId, runs, status, versions } = data;
  const scope = { directionId, projectId };
  const runCanvas = useRunCanvas(projectId, project, ui.selection);

  const direction =
    project?.directions.find((entry): boolean => entry.id === directionId) ??
    null;

  const designSystem = useDesignSystemState(
    projectId,
    project,
    directionId,
    data.lastChange
  );

  const { tokens } = designSystem;

  const packActions = usePackActions({
    ...scope,
    onCommitted: data.refreshVersions,
    setProject: data.setProject,
  });

  const { activeRun, directionRuns, improveRun, pendingRun, setPendingRun } =
    useStudioRuns(data, directionId);

  const variations = useVariations({
    direction,
    project,
    projectId,
    seedRun: data.seedRun,
    setDirectionId: data.setDirectionId,
  });

  useDesktopContext({ ...scope, running: activeRun !== null });

  const { prefillChat } = ui;

  const onPrefill = useCallback(
    (next: Parameters<typeof prefillChat.current>[0]): void =>
      prefillChat.current(next),
    [prefillChat]
  );

  const comments = useComments(
    projectId,
    directionId,
    ui.composerActive,
    activeRun !== null,
    onPrefill
  );

  return {
    activeRun,
    comments,
    data,
    designSystem,
    direction,
    directionId,
    directionRuns,
    improveRun,
    packActions,
    pendingRun,
    project,
    runCanvas,
    runs,
    setPendingRun,
    status,
    tokens,
    variations,
    versions,
  };
};

export { useStudioBase };
