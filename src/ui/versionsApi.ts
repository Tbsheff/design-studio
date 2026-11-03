import { routes } from "../shared/actions/versions/routes.js";
import { STUDIO_TOKEN_HEADER } from "../shared/contracts";
import type {
  EditHistoryState,
  EditSessionEnd,
  Version,
  VersionChanges,
} from "../shared/contracts";
import type { HunkRevertRequest, HunkRevertResult } from "../shared/hunk";
import { call } from "./platform/http";
import { getSession } from "./session";

const MAX_THUMB_FETCHES = 2;

const base = (pid: string, vid: string) =>
  `/api/projects/${encodeURIComponent(pid)}/versions/${encodeURIComponent(vid)}`;

const COMPARE_MODE_KEY = "design-studio.compare-mode";

export const revertHunk = (
  pid: string,
  did: string,
  request: HunkRevertRequest
) =>
  call(routes.applyHunkVersions, {
    directionId: did,
    file: request.file,
    from: request.from ?? null,
    hunk: request.hunk,
    projectId: pid,
    versionId: request.to,
  }) as Promise<HunkRevertResult>;

export const restoreVersion = (pid: string, did: string, versionId: string) =>
  call(routes.restoreVersions, {
    directionId: did,
    projectId: pid,
    versionId,
  }) as Promise<Version>;

const STEP_ROUTES = {
  redo: routes.applyHistoryVersions,
  undo: routes.restoreHistoryVersions,
} as const;

const END_ROUTES = {
  discard: routes.deleteSessionVersions,
  save: routes.createSessionVersions,
} as const;

export const stepEditHistory = (
  pid: string,
  did: string,
  kind: "redo" | "undo"
) =>
  call(STEP_ROUTES[kind], { directionId: did, projectId: pid }) as Promise<{
    label: string;
    state: EditHistoryState;
    version: Version;
  }>;

export const endEditSession = (
  pid: string,
  did: string,
  action: "discard" | "save",
  baseVersionId: string
) =>
  call(END_ROUTES[action], {
    baseVersionId,
    directionId: did,
    projectId: pid,
  }) as Promise<EditSessionEnd>;

export const versionChanges = (
  pid: string,
  from: string,
  to: string
): Promise<VersionChanges> =>
  call(routes.inspectDiffVersions, {
    projectId: pid,
    thumbnails: false,
    from,
    to,
  }) as Promise<VersionChanges>;

export const getVersion = (pid: string, versionId: string) =>
  call(routes.getVersions, { versionId, projectId: pid });

export const listEditHistory = (pid: string, did: string, limit: number) =>
  call(routes.listHistoryVersions, {
    limit,
    directionId: did,
    projectId: pid,
  });

export const listHunks = (
  pid: string,
  from: string,
  to: string,
  file: string
) => call(routes.listHunksVersions, { file, from, to, projectId: pid });

export function openCompareInCode(): void {
  try {
    localStorage.setItem(COMPARE_MODE_KEY, "code");
  } catch {
    return;
  }
}

export const renameVersion = (pid: string, vid: string, name: string | null) =>
  call(routes.renameVersions, {
    name,
    projectId: pid,
    versionId: vid,
  }) as Promise<{ id: string; name: string | null }>;

async function fetchPng(url: string, signal: AbortSignal): Promise<Response> {
  return fetch(url, {
    headers: { [STUDIO_TOKEN_HEADER]: getSession().token },
    signal,
  });
}

export type ThumbResult = string | null;

interface ThumbRequest {
  key: string;
  url: string;
  listeners: Set<(result: ThumbResult) => void>;
  controller: AbortController;
  started: boolean;
}

const thumbs = new Map<string, ThumbResult>();
const requests = new Map<string, ThumbRequest>();
const waiting: ThumbRequest[] = [];
let inFlight = 0;

function forget(request: ThumbRequest): void {
  if (requests.get(request.key) === request) {
    requests.delete(request.key);
  }
}

function finish(
  request: ThumbRequest,
  result: ThumbResult,
  cache: boolean
): void {
  forget(request);

  if (cache) {
    thumbs.set(request.key, result);
  }

  for (const listener of request.listeners) {
    listener(result);
  }
}

function pump(): void {
  while (inFlight < MAX_THUMB_FETCHES && waiting.length > 0) {
    const request = waiting.shift();

    if (!request) {
      return;
    }

    request.started = true;
    inFlight += 1;
    fetchPng(request.url, request.controller.signal)
      .then(async (res) => {
        if (res.status === 404) {
          return finish(request, null, true);
        }

        if (!res.ok) {
          return finish(request, null, false);
        }

        finish(request, URL.createObjectURL(await res.blob()), true);
      })
      .catch(() => {
        if (request.controller.signal.aborted) {
          forget(request);
        } else {
          finish(request, null, false);
        }
      })
      .finally(() => {
        inFlight -= 1;
        pump();
      });
  }
}

export function cachedThumb(pid: string, vid: string): ThumbResult | undefined {
  return thumbs.get(`${pid}/${vid}`);
}

export function requestThumb(
  pid: string,
  vid: string,
  onResult: (result: ThumbResult) => void
): () => void {
  const key = `${pid}/${vid}`;

  if (thumbs.has(key)) {
    onResult(thumbs.get(key) ?? null);

    return () => undefined;
  }

  let request = requests.get(key);

  if (!request) {
    request = {
      key,
      url: `${base(pid, vid)}/thumb`,
      listeners: new Set(),
      controller: new AbortController(),
      started: false,
    };
    requests.set(key, request);
    waiting.push(request);
  }

  const live = request;
  live.listeners.add(onResult);
  pump();

  return () => {
    live.listeners.delete(onResult);

    if (live.listeners.size > 0 || requests.get(key) !== live) {
      return;
    }

    requests.delete(key);

    if (live.started) {
      live.controller.abort();
    } else {
      waiting.splice(waiting.indexOf(live), 1);
    }
  };
}

export interface DiffMaskResult {
  url: string;
  changedPct: number;
}

export async function versionDiff(
  pid: string,
  beforeId: string,
  afterId: string,
  viewport: { width: number; height: number },
  signal: AbortSignal
): Promise<DiffMaskResult> {
  const res = await fetchPng(
    `${base(pid, beforeId)}/diff/${encodeURIComponent(afterId)}?w=${viewport.width}&h=${viewport.height}`,
    signal
  );

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      body.error ?? `Could not compare these versions (${res.status}).`
    );
  }

  return {
    url: URL.createObjectURL(await res.blob()),
    changedPct: Number(res.headers.get("x-changed-pct") ?? 0),
  };
}
