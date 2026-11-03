import { routes } from "../shared/actions/version/routes.js";
import type {
  SessionEndSchema,
  VersionChangesSchema,
  VersionSchema,
} from "../shared/actions/version/schema.js";
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

type WireVersion = typeof VersionSchema.Encoded;

const toVersion = (wire: WireVersion): Version => ({
  ...wire,
  changedFiles: [...wire.changedFiles],
  meta: { ...wire.meta },
});

const toSessionEnd = (
  wire: typeof SessionEndSchema.Encoded
): EditSessionEnd => ({
  headVersionId: wire.headVersionId,
  version: wire.version && toVersion(wire.version),
});

const toChanges = (
  wire: typeof VersionChangesSchema.Encoded
): VersionChanges => ({
  ...wire,
  files: wire.files.map((file) => ({ ...file })),
  thumbs: wire.thumbs && { ...wire.thumbs },
});

const base = (pid: string, vid: string) =>
  `/api/projects/${encodeURIComponent(pid)}/versions/${encodeURIComponent(vid)}`;

const COMPARE_MODE_KEY = "design-studio.compare-mode";

export const revertHunk = async (
  pid: string,
  did: string,
  request: HunkRevertRequest
): Promise<HunkRevertResult> => {
  const out = await call(routes.applyHunkVersion, {
    directionId: did,
    file: request.file,
    from: request.from ?? null,
    hunk: request.hunk,
    projectId: pid,
    versionId: request.to,
  });

  return { ...out, version: toVersion(out.version) };
};

export const restoreVersion = async (
  pid: string,
  did: string,
  versionId: string
): Promise<Version> =>
  toVersion(
    await call(routes.restoreVersion, {
      directionId: did,
      projectId: pid,
      versionId,
    })
  );

const STEP_ROUTES = {
  redo: routes.applyHistoryVersion,
  undo: routes.restoreHistoryVersion,
} as const;

const END_ROUTES = {
  discard: routes.deleteSessionVersion,
  save: routes.createSessionVersion,
} as const;

export const stepEditHistory = async (
  pid: string,
  did: string,
  kind: "redo" | "undo"
): Promise<{ label: string; state: EditHistoryState; version: Version }> => {
  const out = await call(STEP_ROUTES[kind], {
    directionId: did,
    projectId: pid,
  });

  return {
    label: out.label,
    state: { ...out.state },
    version: toVersion(out.version),
  };
};

export const endEditSession = async (
  pid: string,
  did: string,
  action: "discard" | "save",
  baseVersionId: string
): Promise<EditSessionEnd> =>
  toSessionEnd(
    await call(END_ROUTES[action], {
      baseVersionId,
      directionId: did,
      projectId: pid,
    })
  );

const versionChanges = async (
  pid: string,
  from: string,
  to: string
): Promise<VersionChanges> =>
  toChanges(
    await call(routes.inspectDiffVersion, {
      projectId: pid,
      thumbnails: false,
      from,
      to,
    })
  );

export const getVersion = (pid: string, versionId: string) =>
  call(routes.getVersion, { versionId, projectId: pid });

export const listEditHistory = (pid: string, did: string, limit: number) =>
  call(routes.listHistoryVersion, {
    limit,
    directionId: did,
    projectId: pid,
  });

export const listHunks = (
  pid: string,
  from: string,
  to: string,
  file: string
) => call(routes.listHunksVersion, { file, from, to, projectId: pid });

export function openCompareInCode(): void {
  try {
    localStorage.setItem(COMPARE_MODE_KEY, "code");
  } catch {
    return;
  }
}

export const renameVersion = (pid: string, vid: string, name: string | null) =>
  call(routes.renameVersion, {
    name,
    projectId: pid,
    versionId: vid,
  });

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

const readThumb = async (request: ThumbRequest): Promise<void> => {
  const res = await fetchPng(request.url, request.controller.signal);

  if (res.status === 404) {
    finish(request, null, true);

    return;
  }

  if (!res.ok) {
    finish(request, null, false);

    return;
  }

  finish(request, URL.createObjectURL(await res.blob()), true);
};

interface VersionChangesResult {
  readonly changes: VersionChanges | null;
  readonly error: string | null;
}

const settleChanges = async (
  pid: string,
  range: { readonly from: string; readonly to: string }
): Promise<VersionChangesResult> => {
  try {
    const changes = await versionChanges(pid, range.from, range.to);

    return { changes, error: null };
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { changes: null, error: error.message };
    }

    return { changes: null, error: String(error) };
  }
};

export const watchVersionChanges = (
  pid: string,
  range: { readonly from: string; readonly to: string },
  onResult: (result: VersionChangesResult) => void
): (() => void) => {
  const state = { live: true };

  const read = async (): Promise<void> => {
    const result = await settleChanges(pid, range);

    if (state.live) {
      onResult(result);
    }
  };

  void read();

  return () => {
    state.live = false;
  };
};

const loadThumb = async (
  request: ThumbRequest,
  onSettled: () => void
): Promise<void> => {
  try {
    await readThumb(request);
  } catch {
    if (request.controller.signal.aborted) {
      forget(request);
    } else {
      finish(request, null, false);
    }
  } finally {
    inFlight -= 1;
    onSettled();
  }
};

function pump(): void {
  while (inFlight < MAX_THUMB_FETCHES && waiting.length > 0) {
    const request = waiting.shift();

    if (!request) {
      return;
    }

    request.started = true;
    inFlight += 1;
    void loadThumb(request, pump);
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
