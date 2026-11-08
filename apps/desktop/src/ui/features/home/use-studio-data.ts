import type {
  Project,
  RunRequest,
  RunSummary,
  StudioEvent,
  Version,
  WorkTreeStatus,
} from "@design-studio/contracts";
import { useCallback, useEffect, useRef } from "react";

import { api } from "../../api.js";
import { uiStore, useUi } from "../../platform/storage.js";
import {
  listRunPage,
  publishOlderRuns,
  publishRunHistory,
} from "../chat/run-history-model.js";
import {
  applyRunEvent,
  emptyRun,
  runFromSummary,
} from "../chat/run-state-model.js";
import type { RunMap, RunView } from "../chat/run-state-model.js";
import { useRunNotice } from "../chat/use-run-notice.js";
import {
  createDeltaBatcher,
  frameOrTimeout,
} from "../inspector/delta-batch.js";
import type {
  BuildError,
  FilesChange,
  NewBuildError,
} from "./build-error-model.js";
import type { ConnectionState } from "./deps.js";
import type { RunPorts, RunSeed } from "./run-ports-model.js";
import { useBuildErrors } from "./use-build-errors.js";
import { useDirectionData } from "./use-direction-data.js";
import { useProjectState } from "./use-project-state.js";
import { useRunData } from "./use-run-data.js";
import { useStudioEvents } from "./use-studio-events.js";

type SeedRun = (
  runId: string,
  directionId: string,
  request: RunRequest
) => void;

interface StudioData {
  readonly project: Project | null;
  readonly setProject: (project: Project) => void;
  readonly loadError: string | null;
  readonly directionId: string | null;
  readonly setDirectionId: (id: string) => void;
  readonly versions: Version[];
  readonly runs: RunMap;
  readonly hasRunsLoaded: boolean;
  readonly status: WorkTreeStatus | null;
  readonly setStatus: (status: WorkTreeStatus | null) => void;
  readonly errors: BuildError[];
  readonly addError: (entry: NewBuildError) => void;
  readonly clearErrors: () => void;
  readonly clearFrameErrors: () => void;
  readonly lastChange: FilesChange | null;
  readonly connection: ConnectionState;
  readonly refreshVersions: () => void;
  readonly seedRun: SeedRun;
  readonly seedStoppedRun: SeedRun;
  readonly noteSend: () => () => void;
}

const BATCH_FRAME_MS = 100;

const EMPTY_RUNS: RunMap = {};

const toSummaryRun = (known: RunView | null, summary: RunSummary): RunView => {
  if (!known?.summary) {
    return runFromSummary(summary);
  }

  if (summary.title && !known.summary.title) {
    return { ...known, summary: { ...known.summary, title: summary.title } };
  }

  return known;
};

const toMergedSummaries = (previous: RunMap, list: RunSummary[]): RunMap => {
  const next: RunMap = { ...previous };

  for (const summary of list) {
    next[summary.id] = toSummaryRun(next[summary.id] ?? null, summary);
  }

  return next;
};

const toRunsWithEvents = (previous: RunMap, events: StudioEvent[]): RunMap => {
  let runs = previous;

  for (const event of events) {
    runs = applyRunEvent(runs, event);
  }

  return runs;
};

const toSeededRun = (existing: RunView | null, seed: RunSeed): RunView => {
  if (existing) {
    return {
      ...existing,
      directionId: existing.directionId ?? seed.directionId,
      request: existing.request ?? seed.request,
    };
  }

  return emptyRun(seed.runId, seed.directionId, seed.now, seed.request);
};

const toSeededRuns = (previous: RunMap, seed: RunSeed): RunMap => {
  const existing = previous[seed.runId] ?? null;
  const seeded = toSeededRun(existing, seed);

  if (seed.isStopped && !existing?.summary) {
    return { ...previous, [seed.runId]: { ...seeded, status: "canceled" } };
  }

  return { ...previous, [seed.runId]: seeded };
};

const getRunEventList = async (
  projectId: string,
  runId: string
): Promise<StudioEvent[]> => {
  const { events } = await api.getRun(projectId, runId);

  return events;
};

const RUN_PORTS: RunPorts<RunMap> = {
  createBatcher: (update) =>
    createDeltaBatcher(update, frameOrTimeout(BATCH_FRAME_MS)),
  getRunEvents: getRunEventList,
  initialRuns: EMPTY_RUNS,
  listPage: listRunPage,
  publishHistory: publishRunHistory,
  publishOlder: (isLoading, hasMore, load) =>
    publishOlderRuns({ loading: isLoading, more: hasMore }, load),
  toMerged: toMergedSummaries,
  toSeeded: toSeededRuns,
  toWithEvents: toRunsWithEvents,
};

const toActiveDirectionId = (
  project: Project | null,
  stored: string | null
): string | null => {
  const match = project?.directions.find((item) => item.id === stored);

  return match?.id ?? project?.directions[0]?.id ?? null;
};

const useStudioData = (projectId: string): StudioData => {
  const ui = useUi();

  const { project, loadError, setProject, updateProject } =
    useProjectState(projectId);

  const stored = ui.directionByProject[projectId] ?? null;
  const directionId = toActiveDirectionId(project, stored);

  const directionRef = useRef(directionId);

  useEffect(() => {
    directionRef.current = directionId;
  }, [directionId]);

  const setDirectionId = useCallback(
    (id: string): void =>
      uiStore.set((state) => ({
        directionByProject: { ...state.directionByProject, [projectId]: id },
      })),
    [projectId]
  );

  const runData = useRunData(projectId, directionId, RUN_PORTS);
  const { runs, hasRunsLoaded, noteSend, seedRun, seedStoppedRun } = runData;
  const { sends } = runData;
  const { push: pushEvent } = runData.batcher;
  const direction = useDirectionData(projectId, directionId, directionRef);
  const { versions, status, setStatus, refreshVersions } = direction;
  const { addVersion } = direction;
  const buildErrors = useBuildErrors();
  const { errors, addError, clearErrors, clearFrameErrors } = buildErrors;

  const { connection, lastChange } = useStudioEvents({
    addError,
    addVersion,
    directionRef,
    projectId,
    pushEvent,
    refreshVersions,
    sends,
    setStatus,
    updateProject,
  });

  useRunNotice(project?.name ?? null, runs);

  return {
    addError,
    clearErrors,
    clearFrameErrors,
    connection,
    directionId,
    errors,
    hasRunsLoaded,
    lastChange,
    loadError,
    noteSend,
    project,
    refreshVersions,
    runs,
    seedRun,
    seedStoppedRun,
    setDirectionId,
    setProject,
    setStatus,
    status,
    versions,
  };
};

export { useStudioData };

export type { BuildError, FilesChange };
