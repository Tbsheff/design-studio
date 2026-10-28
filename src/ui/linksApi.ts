import { useEffect, useSyncExternalStore } from 'react';
import { STUDIO_TOKEN_HEADER, type StudioEvent } from '../shared/contracts';
import { emptyLinksFile, type LinkSource, type LinksFile, type LinkTarget, type LinkTransition, type PrototypeLink } from '../shared/links';
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

const base = (projectId: string) => `/api/projects/${encodeURIComponent(projectId)}/links`;

interface Entry {
  file: LinksFile;
  loaded: boolean;
  loading: boolean;
  requestedAt: number;
}

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();
const EMPTY = emptyLinksFile();

function entryOf(projectId: string): Entry {
  let entry = entries.get(projectId);
  if (!entry) {
    entry = { file: EMPTY, loaded: false, loading: false, requestedAt: 0 };
    entries.set(projectId, entry);
  }
  return entry;
}

function setFile(projectId: string, file: LinksFile): void {
  entryOf(projectId).file = file;
  listeners.forEach((listener) => listener());
}

function load(projectId: string): void {
  const entry = entryOf(projectId);
  if (entry.loaded || entry.loading) return;
  entry.loading = true;
  entry.requestedAt = Date.now();
  call<{ links: LinksFile }>('GET', base(projectId))
    .then(({ links }) => {
      entry.loaded = true;
      setFile(projectId, links);
    })
    .catch((error: unknown) => console.error('[links] load failed', error))
    .finally(() => {
      entry.loading = false;
    });
}

function receive(event: StudioEvent): void {
  if (event.type !== 'links.changed') return;
  const entry = entryOf(event.projectId);
  if (!entry.loaded || event.ts < entry.requestedAt) return;
  setFile(event.projectId, event.links);
}

async function write(projectId: string, method: string, path: string, body?: unknown): Promise<LinksFile> {
  const { links } = await call<{ links: LinksFile }>(method, path, body);
  setFile(projectId, links);
  return links;
}

export const linksApi = {
  add: async (projectId: string, link: { from: LinkSource; to: LinkTarget; transition: LinkTransition }): Promise<PrototypeLink | null> => {
    const { links, link: saved } = await call<{ links: LinksFile; link: PrototypeLink | null }>('POST', base(projectId), link);
    setFile(projectId, links);
    return saved;
  },
  update: (projectId: string, id: string, change: { to?: LinkTarget; transition?: LinkTransition }) => write(projectId, 'PATCH', `${base(projectId)}/${id}`, change),
  remove: (projectId: string, id: string) => write(projectId, 'DELETE', `${base(projectId)}/${id}`),
  setStart: (projectId: string, frame: string) => write(projectId, 'PUT', `${base(projectId)}/start`, { frame }),
};

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLinks(projectId: string): LinksFile {
  useEffect(() => load(projectId), [projectId]);
  useProjectEvents(projectId, receive);
  return useSyncExternalStore(subscribe, () => entries.get(projectId)?.file ?? EMPTY);
}
