import { useCallback, useMemo, useRef } from 'react';
import type { Direction, RunRequest, Version, WorkTreeStatus } from '../shared/contracts';
import { api } from './api';
import type { RunView } from './runState';

export interface RewindControl {
  versions: readonly Version[];
  headVersionId: string | null;
  headRestoredFrom: string | null;
  dirtyCount: number;
  locked: boolean;
  onRestore: (versionId: string) => void;
  onEditResend: (run: RunView, prompt: string, fromVersionId: string) => Promise<void>;
}

interface Options {
  projectId: string;
  direction: Direction | null;
  versions: readonly Version[];
  status: WorkTreeStatus | null;
  busy: boolean;
  running: RunView | null;
  act: (fn: () => Promise<unknown>) => Promise<void>;
  guard: <A extends unknown[]>(fn: (...args: A) => unknown) => (...args: A) => Promise<void>;
  seedRun: (runId: string, directionId: string, request: RunRequest) => void;
  setDirectionId: (id: string) => void;
  refreshVersions: () => void;
}

export function editedRequest(request: RunRequest, prompt: string): RunRequest {
  const { retryOf: _retry, variation: _variation, task: _task, ...rest } = request;
  return { ...rest, prompt };
}

export function useRewind(options: Options): RewindControl {
  const ref = useRef(options);
  ref.current = options;
  const onRestore = useCallback((versionId: string) => {
    const { act, direction, projectId, refreshVersions } = ref.current;
    if (!direction) return;
    void act(async () => {
      await api.restore(projectId, direction.id, versionId);
      refreshVersions();
    });
  }, []);
  const onEditResend = useCallback(async (run: RunView, prompt: string, fromVersionId: string) => {
    const { act, guard, direction, projectId, seedRun, setDirectionId } = ref.current;
    const request = run.request;
    if (!request) return;
    await guard(() =>
      act(async () => {
        const created = await api.createDirection(projectId, fromVersionId, `${direction?.name ?? 'Direction'} edit`);
        const next = editedRequest(request, prompt);
        const { runId } = await api.startRun(projectId, created.id, next);
        seedRun(runId, created.id, next);
        setDirectionId(created.id);
      }),
    )();
  }, []);
  const { versions, status, busy, running } = options;
  const dirtyCount = status?.dirty ? status.changed.length : 0;
  const locked = busy || running !== null;
  const headVersionId = options.direction?.headVersionId ?? null;
  const headRestoredFrom = versions.find((version) => version.id === headVersionId)?.meta.restoredFrom ?? null;
  return useMemo(
    () => ({ versions, headVersionId, headRestoredFrom, dirtyCount, locked, onRestore, onEditResend }),
    [versions, headVersionId, headRestoredFrom, dirtyCount, locked, onRestore, onEditResend],
  );
}
