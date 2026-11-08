import { routes } from "@design-studio/actions/version/routes";
import type {
  SessionEndSchema,
  VersionChangesSchema,
  VersionSchema,
} from "@design-studio/actions/version/schema";
import type {
  EditHistoryState,
  EditSessionEnd,
  Version,
  VersionChanges,
} from "@design-studio/contracts";

import type {
  HunkRevertRequest,
  HunkRevertResult,
} from "../../../shared/hunk.js";
import { call, getRaw } from "../../platform/http.js";
import { writeStored } from "../../platform/storage.js";

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

const base = (projectId: string, versionId: string) =>
  `/api/projects/${encodeURIComponent(projectId)}/versions/${encodeURIComponent(versionId)}`;

const COMPARE_MODE_KEY = "design-studio.compare-mode";

const revertHunk = async (
  projectId: string,
  directionId: string,
  request: HunkRevertRequest
): Promise<HunkRevertResult> => {
  const out = await call(routes.applyHunkVersion, {
    directionId,
    projectId,
    file: request.file,
    from: request.from ?? null,
    hunk: request.hunk,
    versionId: request.to,
  });

  return { ...out, version: toVersion(out.version) };
};

const restoreVersion = async (
  projectId: string,
  directionId: string,
  versionId: string
): Promise<Version> =>
  toVersion(
    await call(routes.restoreVersion, {
      directionId,
      projectId,
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

const stepEditHistory = async (
  projectId: string,
  directionId: string,
  kind: "redo" | "undo"
): Promise<{ label: string; state: EditHistoryState; version: Version }> => {
  const out = await call(STEP_ROUTES[kind], {
    directionId,
    projectId,
  });

  return {
    label: out.label,
    state: { ...out.state },
    version: toVersion(out.version),
  };
};

const endEditSession = async (
  projectId: string,
  directionId: string,
  action: "discard" | "save",
  baseVersionId: string
): Promise<EditSessionEnd> =>
  toSessionEnd(
    await call(END_ROUTES[action], {
      baseVersionId,
      directionId,
      projectId,
    })
  );

const versionChanges = async (
  projectId: string,
  from: string,
  to: string
): Promise<VersionChanges> =>
  toChanges(
    await call(routes.inspectDiffVersion, {
      from,
      projectId,
      to,
      thumbnails: false,
    })
  );

const getVersion = (projectId: string, versionId: string) =>
  call(routes.getVersion, { projectId, versionId });

const listEditHistory = (
  projectId: string,
  directionId: string,
  limit: number
) =>
  call(routes.listHistoryVersion, {
    directionId,
    limit,
    projectId,
  });

const listHunks = (projectId: string, from: string, to: string, file: string) =>
  call(routes.listHunksVersion, { file, from, projectId, to });

const openCompareInCode = (): void => {
  writeStored(COMPARE_MODE_KEY, "code");
};

const renameVersion = (
  projectId: string,
  versionId: string,
  name: string | null
) =>
  call(routes.renameVersion, {
    name,
    projectId,
    versionId,
  });

const fetchPng = (url: string, signal: AbortSignal): Promise<Response> =>
  getRaw(url, signal);

type ThumbResult = string | null;

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

const forget = (request: ThumbRequest): void => {
  if (requests.get(request.key) === request) {
    requests.delete(request.key);
  }
};

const finish = (
  request: ThumbRequest,
  result: ThumbResult,
  cache: boolean
): void => {
  forget(request);

  if (cache) {
    thumbs.set(request.key, result);
  }

  for (const listener of request.listeners) {
    listener(result);
  }
};

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
  projectId: string,
  range: { readonly from: string; readonly to: string }
): Promise<VersionChangesResult> => {
  try {
    const changes = await versionChanges(projectId, range.from, range.to);

    return { changes, error: null };
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { changes: null, error: error.message };
    }

    return { changes: null, error: String(error) };
  }
};

const watchVersionChanges = (
  projectId: string,
  range: { readonly from: string; readonly to: string },
  onResult: (result: VersionChangesResult) => void
): (() => void) => {
  const state = { live: true };

  const read = async (): Promise<void> => {
    const result = await settleChanges(projectId, range);

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

const pump = (): void => {
  while (inFlight < MAX_THUMB_FETCHES && waiting.length > 0) {
    const request = waiting.shift();

    if (!request) {
      return;
    }

    request.started = true;
    inFlight += 1;
    void loadThumb(request, pump);
  }
};

const cachedThumb = (
  projectId: string,
  versionId: string
): ThumbResult | undefined => thumbs.get(`${projectId}/${versionId}`);

const requestThumb = (
  projectId: string,
  versionId: string,
  onResult: (result: ThumbResult) => void
): (() => void) => {
  const key = `${projectId}/${versionId}`;

  if (thumbs.has(key)) {
    onResult(thumbs.get(key) ?? null);

    return () => 0;
  }

  let request = requests.get(key);

  if (!request) {
    request = {
      key,
      controller: new AbortController(),
      listeners: new Set(),
      started: false,
      url: `${base(projectId, versionId)}/thumb`,
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
};

interface DiffMaskResult {
  url: string;
  changedPct: number;
}

const versionDiff = async (
  projectId: string,
  beforeId: string,
  afterId: string,
  viewport: { width: number; height: number },
  signal: AbortSignal
): Promise<DiffMaskResult> => {
  const res = await fetchPng(
    `${base(projectId, beforeId)}/diff/${encodeURIComponent(afterId)}?w=${viewport.width}&h=${viewport.height}`,
    signal
  );

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      body.error ?? `Could not compare these versions (${res.status}).`
    );
  }

  return {
    changedPct: Number(res.headers.get("x-changed-pct") ?? 0),
    url: URL.createObjectURL(await res.blob()),
  };
};

export {
  revertHunk,
  restoreVersion,
  stepEditHistory,
  endEditSession,
  getVersion,
  listEditHistory,
  listHunks,
  openCompareInCode,
  renameVersion,
  watchVersionChanges,
  cachedThumb,
  requestThumb,
  versionDiff,
};

export type { ThumbResult, DiffMaskResult };
