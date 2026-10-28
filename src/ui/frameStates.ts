import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { STUDIO_TOKEN_HEADER, type StudioEvent } from '../shared/contracts';
import { DEFAULT_FRAME_STATE, withFrameStateHost, type FrameStateDef, type FrameStatesView, type MockUser } from '../shared/frame-state';
import { ApiError } from './api';
import { useProjectEvents } from './events';
import { getSession } from './session';

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { [STUDIO_TOKEN_HEADER]: getSession().token, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
    throw new ApiError(res.status, data?.message ?? data?.error ?? `${method} ${path} failed: ${res.status}`, data?.error);
  }
  return (await res.json()) as T;
}

const base = (projectId: string) => `/api/projects/${encodeURIComponent(projectId)}/frame-states`;

const views = new Map<string, FrameStatesView>();
const loading = new Set<string>();
const listeners = new Set<() => void>();
let current: string | null = null;

function notify(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function store(projectId: string, view: FrameStatesView): void {
  views.set(projectId, view);
  notify();
}

function load(projectId: string): void {
  if (loading.has(projectId)) return;
  loading.add(projectId);
  call<FrameStatesView>('GET', base(projectId))
    .then((view) => store(projectId, view))
    .catch(() => undefined)
    .finally(() => loading.delete(projectId));
}

export function useFrameStates(projectId: string, isApp: boolean): FrameStatesView | null {
  useEffect(() => {
    if (!isApp) return;
    current = projectId;
    notify();
    load(projectId);
    return () => {
      if (current === projectId) current = null;
      notify();
    };
  }, [projectId, isApp]);
  useProjectEvents(isApp ? projectId : null, (event: StudioEvent) => {
    if (event.type === 'frame-states.changed') store(projectId, event.states);
  });
  const read = useCallback(() => (isApp ? (views.get(projectId) ?? null) : null), [projectId, isApp]);
  return useSyncExternalStore(subscribe, read, read);
}

export function useCurrentFrameStates(): { projectId: string; view: FrameStatesView } | null {
  const read = useCallback(() => (current ? (views.get(current) ?? null) : null), []);
  const view = useSyncExternalStore(subscribe, read, read);
  return current && view ? { projectId: current, view } : null;
}

export function frameStateOf(view: FrameStatesView | null, frameId: string): string {
  return view?.frames[frameId] ?? DEFAULT_FRAME_STATE;
}

export function frameStateUrl(url: string, view: FrameStatesView | null, frameId: string): string;
export function frameStateUrl(url: string | null, view: FrameStatesView | null, frameId: string): string | null;
export function frameStateUrl(url: string | null, view: FrameStatesView | null, frameId: string): string | null {
  if (!url || !view) return url;
  return withFrameStateHost(url, frameStateOf(view, frameId));
}

export async function setFrameState(projectId: string, frameId: string, state: string, mock?: { name?: string; rules?: unknown[] }): Promise<FrameStateDef> {
  const done = await call<{ view: FrameStatesView; state: FrameStateDef }>('PUT', `${base(projectId)}/frames/${encodeURIComponent(frameId)}`, { state, ...(mock ? { mock } : {}) });
  store(projectId, done.view);
  return done.state;
}

export async function setFrameSession(projectId: string, change: { user?: MockUser; forget?: boolean }): Promise<void> {
  store(projectId, await call<FrameStatesView>('PATCH', `${base(projectId)}/session`, change));
}
