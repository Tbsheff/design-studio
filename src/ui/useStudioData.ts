import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { Project, RunRequest, RunSummary, StudioEvent, Version, WorkTreeStatus } from '../shared/contracts';
import { api, errorText } from './api';
import { createDeltaBatcher, frameOrTimeout } from './deltaBatch';
import { useProjectEvents, type ConnectionState } from './events';
import { reportFirstToken } from './perfTelemetry';
import { applyRunEvent, emptyRun, runFromSummary, type RunMap } from './runState';
import { listRunPage, publishOlderRuns } from './runHistoryApi';
import { useRunNotice } from './useRunNotice';
import { uiStore, useUi } from './storage';

export interface BuildError {
  id: string;
  directionId: string | null;
  source: 'build' | 'console' | 'runtime' | 'unhandledrejection';
  message: string;
  file?: string;
  line?: number;
  ts: number;
}

export interface FilesChange {
  directionId: string;
  changedAt: number;
  receivedAt: number;
  paths: string[];
  reload?: boolean;
}

interface StudioData {
  project: Project | null;
  setProject: (project: Project) => void;
  loadError: string | null;
  directionId: string | null;
  setDirectionId: (id: string) => void;
  versions: Version[];
  runs: RunMap;
  runsLoaded: boolean;
  status: WorkTreeStatus | null;
  setStatus: (s: WorkTreeStatus | null) => void;
  errors: BuildError[];
  addError: (e: Omit<BuildError, 'id' | 'ts'>) => void;
  clearErrors: () => void;
  clearFrameErrors: () => void;
  lastChange: FilesChange | null;
  connection: ConnectionState;
  refreshVersions: () => void;
  seedRun: (runId: string, directionId: string, request: RunRequest, stopped?: boolean) => void;
  noteSend: () => () => void;
}

interface SendTimes {
  pending: number | null;
  byRun: Map<string, number>;
}

function trackFirstToken(sends: SendTimes, projectId: string, event: StudioEvent): void {
  if (event.type === 'run.started') {
    if (sends.pending === null || event.ts < sends.pending - 1000) return;
    sends.byRun.set(event.runId, sends.pending);
    sends.pending = null;
    return;
  }
  if (event.type !== 'run.text.delta' && event.type !== 'run.thinking.delta') return;
  const sentAt = sends.byRun.get(event.runId);
  if (sentAt === undefined) return;
  sends.byRun.delete(event.runId);
  reportFirstToken(projectId, event.directionId, event.runId, sentAt);
}

const FIRST_RUNS = 12;
const MORE_RUNS = 16;

interface RunCursor {
  projectId: string;
  before: number | null;
  done: boolean;
  loading: boolean;
  byDirection: Map<string, number>;
  seen: Set<string>;
}

function newCursor(projectId: string): RunCursor {
  return { projectId, before: null, done: false, loading: false, byDirection: new Map(), seen: new Set() };
}

function mergeSummaries(prev: RunMap, list: RunSummary[]): RunMap {
  const next: RunMap = { ...prev };
  for (const s of list) {
    const known = next[s.id];
    if (!known?.summary) next[s.id] = runFromSummary(s);
    else if (s.title && !known.summary.title) next[s.id] = { ...known, summary: { ...known.summary, title: s.title } };
  }
  return next;
}

function countRuns(cursor: RunCursor, list: RunSummary[]): void {
  for (const s of list) {
    if (cursor.seen.has(s.id)) continue;
    cursor.seen.add(s.id);
    cursor.byDirection.set(s.directionId, (cursor.byDirection.get(s.directionId) ?? 0) + 1);
  }
}

function loadedFor(cursor: RunCursor, directionId: string | null): number {
  if (directionId === null) return cursor.seen.size;
  return cursor.byDirection.get(directionId) ?? 0;
}

type SetRuns = Dispatch<SetStateAction<RunMap>>;

function useRunPages(projectId: string, directionId: string | null, setRuns: SetRuns, setRunsLoaded: (loaded: boolean) => void): void {
  const cursor = useRef<RunCursor>(newCursor(projectId));
  const direction = useRef(directionId);
  direction.current = directionId;

  const publish = useCallback((c: RunCursor, load: (() => void) | null) => {
    if (cursor.current === c) publishOlderRuns({ more: !c.done, loading: c.loading }, load);
  }, []);

  const fill = useCallback(
    async (c: RunCursor, target: number) => {
      if (c.loading || c.done) return;
      c.loading = true;
      publish(c, null);
      try {
        let first = c.before === null;
        while (!c.done && cursor.current === c && loadedFor(c, direction.current) < target) {
          const page = await listRunPage(c.projectId, first ? FIRST_RUNS : MORE_RUNS, c.before);
          if (cursor.current !== c) return;
          first = false;
          countRuns(c, page.runs);
          c.before = page.nextBefore;
          c.done = page.nextBefore === null;
          setRuns((prev) => mergeSummaries(prev, page.runs));
          setRunsLoaded(true);
          for (const s of page.runs.filter((r) => r.status === 'running')) {
            api
              .getRun(s.id)
              .then(({ events }) => cursor.current === c && setRuns((prev) => events.reduce(applyRunEvent, prev)))
              .catch(() => undefined);
          }
        }
      } catch {
        setRunsLoaded(true);
      } finally {
        c.loading = false;
        publish(c, () => void fill(c, loadedFor(c, direction.current) + MORE_RUNS));
      }
    },
    [publish, setRuns, setRunsLoaded],
  );

  useEffect(() => {
    const c = newCursor(projectId);
    cursor.current = c;
    setRunsLoaded(false);
    void fill(c, FIRST_RUNS);
    return () => {
      if (cursor.current === c) cursor.current = newCursor(projectId);
      publishOlderRuns({ more: false, loading: false }, null);
    };
  }, [projectId, fill, setRunsLoaded]);

  useEffect(() => {
    const c = cursor.current;
    if (directionId !== null && !c.loading && loadedFor(c, directionId) < FIRST_RUNS) void fill(c, FIRST_RUNS);
  }, [directionId, fill]);
}

export function useStudioData(projectId: string): StudioData {
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
  const [batcher] = useState(() => createDeltaBatcher(setRuns, frameOrTimeout(100)));
  const sends = useRef<SendTimes>({ pending: null, byRun: new Map() });
  useEffect(() => () => batcher.dispose(), [batcher]);

  const stored = ui.directionByProject[projectId];
  const directionId =
    project?.directions.find((x) => x.id === stored)?.id ?? project?.directions[0]?.id ?? null;
  const directionRef = useRef(directionId);
  directionRef.current = directionId;

  const setDirectionId = useCallback(
    (id: string) => uiStore.set((s) => ({ directionByProject: { ...s.directionByProject, [projectId]: id } })),
    [projectId],
  );

  useEffect(() => {
    let alive = true;
    setProject(null);
    setLoadError(null);
    api
      .getProject(projectId)
      .then((p) => alive && setProject(p))
      .catch((err) => alive && setLoadError(errorText(err)));
    return () => {
      alive = false;
    };
  }, [projectId]);

  useRunPages(projectId, directionId, setRuns, setRunsLoaded);

  const refreshVersions = useCallback(() => {
    const did = directionRef.current;
    if (!did) return;
    api
      .listVersions(projectId, did)
      .then((v) => directionRef.current === did && setVersions(v))
      .catch(() => undefined);
  }, [projectId]);

  useEffect(() => {
    setVersions([]);
    setStatus(null);
    if (!directionId) return;
    refreshVersions();
    api
      .status(projectId, directionId)
      .then((s) => directionRef.current === directionId && setStatus(s))
      .catch(() => undefined);
  }, [projectId, directionId, refreshVersions]);

  const addError = useCallback((e: Omit<BuildError, 'id' | 'ts'>) => {
    setErrors((prev) => {
      const ts = Date.now();
      const dup = prev.find((x) => x.message === e.message && x.file === e.file && x.line === e.line);
      if (dup) return prev;
      return [...prev.slice(-49), { ...e, id: `${ts}-${prev.length}`, ts }];
    });
  }, []);

  const onEvent = useCallback(
    (event: StudioEvent) => {
      const live = event.ts >= mountedAt.current - 1000;
      const active = event.directionId === undefined || event.directionId === directionRef.current;
      batcher.push(event);
      trackFirstToken(sends.current, projectId, event);
      switch (event.type) {
        case 'files.changed':
          if (live && event.directionId)
            setLastChange({ directionId: event.directionId, changedAt: event.changedAt, receivedAt: Date.now(), paths: event.paths, ...(event.reload ? { reload: true } : {}) });
          break;
        case 'version.created':
          if (event.version.directionId === directionRef.current)
            setVersions((prev) =>
              prev.some((v) => v.id === event.version.id) ? prev : [event.version, ...prev],
            );
          break;
        case 'versions.changed':
          if (active) refreshVersions();
          break;
        case 'direction.updated':
          setProject((prev) => {
            if (!prev) return prev;
            const exists = prev.directions.some((x) => x.id === event.direction.id);
            const directions = exists
              ? prev.directions.map((x) => (x.id === event.direction.id ? event.direction : x))
              : [...prev.directions, event.direction];
            return { ...prev, directions };
          });
          break;
        case 'status.changed':
          if (live && active) setStatus(event.status);
          break;
        case 'preview.build-error':
          if (live && active)
            addError({
              directionId: event.directionId ?? null,
              source: 'build',
              message: event.message,
              file: event.file,
              line: event.line,
            });
          break;
      }
    },
    [addError, batcher, projectId, refreshVersions],
  );

  const connection = useProjectEvents(projectId, onEvent);
  useRunNotice(project?.name ?? null, runs);

  const seedRun = useCallback((runId: string, did: string, request: RunRequest, stopped = false) => {
    setRuns((prev) => {
      const existing = prev[runId];
      const status = stopped && !existing?.summary ? { status: 'canceled' as const } : {};
      if (existing) return { ...prev, [runId]: { ...existing, directionId: existing.directionId ?? did, request: existing.request ?? request, ...status } };
      return { ...prev, [runId]: { ...emptyRun(runId, did, Date.now(), request), ...status } };
    });
  }, []);

  const noteSend = useCallback(() => {
    const at = Date.now();
    sends.current.pending = at;
    return () => {
      if (sends.current.pending === at) sends.current.pending = null;
    };
  }, []);

  return {
    project,
    setProject,
    loadError,
    directionId,
    setDirectionId,
    versions,
    runs,
    runsLoaded,
    status,
    setStatus,
    errors,
    addError,
    clearErrors: () => setErrors([]),
    clearFrameErrors: () => setErrors((prev) => (prev.some((e) => e.source !== 'build') ? prev.filter((e) => e.source === 'build') : prev)),
    lastChange,
    connection,
    refreshVersions,
    seedRun,
    noteSend,
  };
}
