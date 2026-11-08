import type {
  Project,
  RunRequest,
  RunSummary,
  StudioEvent,
  Version,
  WorkTreeStatus,
} from "@design-studio/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { api, errorText } from "../../api.js";
import { useProjectEvents } from "../../platform/events.js";
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
import type { RunMap } from "../chat/run-state-model.js";
import { useRunNotice } from "../chat/use-run-notice.js";
import {
  createDeltaBatcher,
  frameOrTimeout,
} from "../inspector/delta-batch.js";
import type { ConnectionState } from "./deps.js";
import {
  createCursor,
  toLoadedCount,
  updateCursorSeen,
} from "./run-cursor-model.js";
import type { RunCursor } from "./run-cursor-model.js";
import {
  FIRST_RUNS,
  MORE_RUNS,
  THROUGH_RUNS,
  startSendNote,
  toBuildErrorsOnly,
  toUpdatedProject,
  toVersionsWith,
  updateFirstToken,
} from "./studio-data-model.js";
import type { SendTimes } from "./studio-data-model.js";

export interface BuildError {
  readonly id: string;
  readonly directionId: string | null;
  readonly source: "build" | "console" | "runtime" | "unhandledrejection";
  readonly message: string;
  readonly file?: string;
  readonly line?: number;
  readonly ts: number;
}

export interface FilesChange {
  readonly directionId: string;
  readonly changedAt: number;
  readonly receivedAt: number;
  readonly paths: string[];
  readonly shouldReload: boolean;
}

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
  readonly setStatus: (s: WorkTreeStatus | null) => void;
  readonly errors: BuildError[];
  readonly addError: (e: Omit<BuildError, "id" | "ts">) => void;
  readonly clearErrors: () => void;
  readonly clearFrameErrors: () => void;
  readonly lastChange: FilesChange | null;
  readonly connection: ConnectionState;
  readonly refreshVersions: () => void;
  readonly seedRun: (
    runId: string,
    directionId: string,
    request: RunRequest,
    stopped?: boolean
  ) => void;
  readonly noteSend: () => () => void;
}

const mergeSummaries = (prev: RunMap, list: RunSummary[]): RunMap => {
  const next: RunMap = { ...prev };

  for (const s of list) {
    const known = next[s.id];

    if (!known?.summary) {
      next[s.id] = runFromSummary(s);
    } else if (s.title && !known.summary.title) {
      next[s.id] = { ...known, summary: { ...known.summary, title: s.title } };
    }
  }

  return next;
};

type SetRuns = Dispatch<SetStateAction<RunMap>>;

const useRunPages = (
  projectId: string,
  directionId: string | null,
  setRuns: SetRuns,
  setRunsLoaded: (loaded: boolean) => void
): void => {
  const cursor = useRef<RunCursor>(createCursor(projectId));
  const direction = useRef(directionId);
  direction.current = directionId;

  const publish = useCallback((c: RunCursor, load: (() => void) | null) => {
    if (cursor.current === c) {
      publishOlderRuns(
        { loading: c.state.current.isLoading, more: !c.state.current.isDone },
        load
      );
    }
  }, []);

  const page = useCallback(
    async (c: RunCursor, want: (c: RunCursor) => boolean, size: number) => {
      let first = c.state.current.before === null;

      while (!c.state.current.isDone && cursor.current === c && want(c)) {
        const next = await listRunPage(
          c.projectId,
          first ? FIRST_RUNS : size,
          c.state.current.before
        );

        if (cursor.current !== c) {
          return;
        }

        first = false;
        updateCursorSeen(c, next.runs);
        c.state.current = {
          ...c.state.current,
          before: next.nextBefore,
          isDone: next.nextBefore === null,
        };
        setRuns((prev) => mergeSummaries(prev, next.runs));
        setRunsLoaded(true);

        for (const s of next.runs.filter((r) => r.status === "running")) {
          api
            .getRun(c.projectId, s.id)
            .then(
              ({ events }) =>
                cursor.current === c &&
                setRuns((prev) => events.reduce(applyRunEvent, prev))
            )
            .catch(() => null);
        }
      }
    },
    [setRuns, setRunsLoaded]
  );

  const wantMore = useCallback(
    (target: number) =>
      (c: RunCursor): boolean =>
        toLoadedCount(c, direction.current) < target,
    []
  );

  const fill = useCallback(
    async (c: RunCursor, want: (c: RunCursor) => boolean, size = MORE_RUNS) => {
      if (c.state.current.isLoading || c.state.current.isDone) {
        return;
      }

      c.state.current = { ...c.state.current, isLoading: true };
      publish(c, null);
      const work = page(c, want, size).catch(() => setRunsLoaded(true));
      c.state.current = { ...c.state.current, pending: work };
      await work;
      c.state.current = {
        ...c.state.current,
        isLoading: false,
        pending: null,
      };
      publish(c, () =>
        fill(c, wantMore(toLoadedCount(c, direction.current) + MORE_RUNS))
      );
    },
    [page, publish, setRunsLoaded, wantMore]
  );

  const through = useCallback(
    async (runId: string) => {
      const c = cursor.current;

      while (
        cursor.current === c &&
        !c.seen.has(runId) &&
        !c.state.current.isDone
      ) {
        const { before, pending } = c.state.current;

        if (pending) {
          await pending;
        } else {
          await fill(c, (x) => !x.seen.has(runId), THROUGH_RUNS);
        }

        const after = c.state.current;

        if (after.before === before && !after.pending) {
          break;
        }
      }

      return c.seen.has(runId);
    },
    [fill]
  );

  useEffect(() => {
    publishRunHistory({ projectId, through });

    return (): void => publishRunHistory(null);
  }, [projectId, through]);

  useEffect(() => {
    const c = createCursor(projectId);
    cursor.current = c;
    setRunsLoaded(false);
    void fill(c, wantMore(FIRST_RUNS));

    return (): void => {
      if (cursor.current === c) {
        cursor.current = createCursor(projectId);
      }

      publishOlderRuns({ loading: false, more: false }, null);
    };
  }, [projectId, fill, wantMore, setRunsLoaded]);

  useEffect(() => {
    const c = cursor.current;

    if (
      directionId !== null &&
      !c.state.current.isLoading &&
      toLoadedCount(c, directionId) < FIRST_RUNS
    ) {
      void fill(c, wantMore(FIRST_RUNS));
    }
  }, [directionId, fill, wantMore]);
};

export const useStudioData = (projectId: string): StudioData => {
  const ui = useUi();
  const [project, setProject] = useState<Project | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [runs, setRuns] = useState<RunMap>({});
  const [runsLoaded, setRunsLoaded] = useState(false);
  const [status, setStatus] = useState<WorkTreeStatus | null>(null);
  const [errors, setErrors] = useState<BuildError[]>([]);
  const [lastChange, setLastChange] = useState<FilesChange | null>(null);
  const mountedAt = useRef(Date.now());

  const [batcher] = useState(() =>
    createDeltaBatcher(setRuns, frameOrTimeout(100))
  );

  const sends = useRef<SendTimes>({
    byRun: new Map(),
    pending: { current: null },
  });

  useEffect(() => (): void => batcher.dispose(), [batcher]);

  const stored = ui.directionByProject[projectId];

  const directionId =
    project?.directions.find((x) => x.id === stored)?.id ??
    project?.directions[0]?.id ??
    null;

  const directionRef = useRef(directionId);
  directionRef.current = directionId;

  const setDirectionId = useCallback(
    (id: string) =>
      uiStore.set((s) => ({
        directionByProject: { ...s.directionByProject, [projectId]: id },
      })),
    [projectId]
  );

  useEffect(() => {
    let alive = true;
    setProject(null);
    setLoadError(null);
    api
      .getProject(projectId)
      .then((p) => alive && setProject(p))
      .catch((error) => alive && setLoadError(errorText(error)));

    return (): void => {
      alive = false;
    };
  }, [projectId]);

  useRunPages(projectId, directionId, setRuns, setRunsLoaded);

  const refreshVersions = useCallback(() => {
    const did = directionRef.current;

    if (!did) {
      return;
    }

    api
      .listVersions(projectId, did)
      .then((v) => directionRef.current === did && setVersions(v))
      .catch(() => null);
  }, [projectId]);

  const addVersion = useCallback(
    (version: Version) => {
      setVersions((prev) => toVersionsWith(prev, version));

      if ((version.changedFilesTotal ?? 0) > version.changedFiles.length) {
        refreshVersions();
      }
    },
    [refreshVersions]
  );

  useEffect(() => {
    setVersions([]);
    setStatus(null);

    if (!directionId) {
      return;
    }

    refreshVersions();
    api
      .status(projectId, directionId)
      .then((s) => directionRef.current === directionId && setStatus(s))
      .catch(() => null);
  }, [projectId, directionId, refreshVersions]);

  const addError = useCallback((e: Omit<BuildError, "id" | "ts">) => {
    setErrors((prev) => {
      const ts = Date.now();

      const dup = prev.find(
        (x) => x.message === e.message && x.file === e.file && x.line === e.line
      );

      if (dup) {
        return prev;
      }

      return [...prev.slice(-49), { ...e, id: `${ts}-${prev.length}`, ts }];
    });
  }, []);

  const onEvent = useCallback(
    (event: StudioEvent) => {
      const live = event.ts >= mountedAt.current - 1000;

      const active =
        event.directionId === undefined ||
        event.directionId === directionRef.current;

      batcher.push(event);
      updateFirstToken(sends.current, projectId, event);

      switch (event.type) {
        case "files.changed": {
          if (live && event.directionId) {
            setLastChange({
              changedAt: event.changedAt,
              directionId: event.directionId,
              paths: event.paths,
              receivedAt: Date.now(),
              shouldReload: event.reload === true,
            });
          }

          break;
        }

        case "version.created": {
          if (event.version.directionId === directionRef.current) {
            addVersion(event.version);
          }

          break;
        }

        case "versions.changed": {
          if (active) {
            refreshVersions();
          }

          break;
        }

        case "direction.updated": {
          setProject((prev) => toUpdatedProject(prev, event.direction));
          break;
        }

        case "status.changed": {
          if (live && active) {
            setStatus(event.status);
          }

          break;
        }

        case "preview.build-error": {
          if (live && active) {
            addError({
              directionId: event.directionId ?? null,
              file: event.file,
              line: event.line,
              message: event.message,
              source: "build",
            });
          }

          break;
        }
      }
    },
    [addError, addVersion, batcher, projectId, refreshVersions]
  );

  const connection = useProjectEvents(projectId, onEvent);
  useRunNotice(project?.name ?? null, runs);

  const seedRun = useCallback(
    (runId: string, did: string, request: RunRequest, stopped = false) => {
      setRuns((prev) => {
        const existing = prev[runId];

        const status =
          stopped && !existing?.summary ? { status: "canceled" as const } : {};

        if (existing) {
          return {
            ...prev,
            [runId]: {
              ...existing,
              directionId: existing.directionId ?? did,
              request: existing.request ?? request,
              ...status,
            },
          };
        }

        return {
          ...prev,
          [runId]: { ...emptyRun(runId, did, Date.now(), request), ...status },
        };
      });
    },
    []
  );

  const noteSend = useCallback(() => startSendNote(sends.current), []);

  return {
    addError,
    clearErrors: () => setErrors([]),
    clearFrameErrors: () => setErrors((prev) => toBuildErrorsOnly(prev)),
    connection,
    directionId,
    errors,
    hasRunsLoaded: runsLoaded,
    lastChange,
    loadError,
    noteSend,
    project,
    refreshVersions,
    runs,
    seedRun,
    setDirectionId,
    setProject,
    setStatus,
    status,
    versions,
  };
};
