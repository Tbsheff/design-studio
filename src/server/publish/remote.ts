import { createReadStream } from "node:fs";
import { Readable } from "node:stream";

import type {
  CreatePublicationBody,
  CreateVersionBody,
  CreateVersionReply,
  HealthReply,
  PublicationSettings,
  RemoteComment,
  RemotePublication,
} from "../../shared/actions/publish-remote.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../store/errors.js";

export interface Endpoint {
  url: string;
  key: string;
}

export class RemoteError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

const TIMEOUT_MS = 60_000;
const UPLOAD_TIMEOUT_MS = 170_000;

function toStudioError(error: RemoteError): Error {
  if (error.status === 404) {
    return new NotFoundError(error.message);
  }

  if (error.status === 409) {
    return new ConflictError(error.message);
  }

  return new BadRequestError(error.message);
}

async function send<T>(
  endpoint: Endpoint,
  method: string,
  path: string,
  body?: BodyInit,
  extra: Record<string, string> = {},
  timeoutMs = TIMEOUT_MS
): Promise<T> {
  let res: Response;

  try {
    res = await fetch(new URL(path, endpoint.url), {
      method,
      body,
      headers: { authorization: `Bearer ${endpoint.key}`, ...extra },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "error",
      ...(body instanceof ReadableStream ? { duplex: "half" } : {}),
    } as RequestInit);
  } catch (error) {
    throw new RemoteError(
      0,
      "unreachable",
      `The publish Worker at ${new URL(endpoint.url).host} did not answer${error instanceof Error && error.name === "TimeoutError" ? " in time" : ""}.`
    );
  }

  const text = await res.text();
  let parsed: unknown = null;

  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    const info = (parsed ?? {}) as { error?: unknown; code?: unknown };
    throw new RemoteError(
      res.status,
      typeof info.code === "string" ? info.code : "http_error",
      typeof info.error === "string"
        ? info.error.slice(0, 300)
        : `The publish Worker answered ${res.status}.`
    );
  }

  return parsed as T;
}

const jsonBody = (value: unknown) => ({
  body: JSON.stringify(value),
  headers: { "content-type": "application/json" },
});

export function remoteClient(endpoint: Endpoint) {
  const call = async <T>(
    method: string,
    path: string,
    value?: unknown
  ): Promise<T> => {
    const payload = value === undefined ? undefined : jsonBody(value);

    return send<T>(endpoint, method, path, payload?.body, payload?.headers);
  };

  const id = (pid: string) => encodeURIComponent(pid);

  return {
    health: () => call<HealthReply>("GET", "/api/health"),
    list: (projectId?: string) =>
      call<{ publications: RemotePublication[] }>(
        "GET",
        `/api/publications${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ""}`
      ),
    create: (body: CreatePublicationBody) =>
      call<RemotePublication>("POST", "/api/publications", body),
    createVersion: (pid: string, body: CreateVersionBody) =>
      call<CreateVersionReply>(
        "POST",
        `/api/publications/${id(pid)}/versions`,
        body
      ),
    upload: (pid: string, sha: string, file: string, size: number) =>
      send<{ stored: boolean }>(
        endpoint,
        "PUT",
        `/api/publications/${id(pid)}/blobs/${sha}`,
        Readable.toWeb(createReadStream(file)) as ReadableStream,
        {
          "content-length": String(size),
          "content-type": "application/octet-stream",
        },
        UPLOAD_TIMEOUT_MS
      ),
    commit: (pid: string, vid: string, settings: PublicationSettings) =>
      call<RemotePublication>(
        "POST",
        `/api/publications/${id(pid)}/versions/${encodeURIComponent(vid)}/commit`,
        settings
      ),
    rollback: (pid: string, versionId: string) =>
      call<RemotePublication>("POST", `/api/publications/${id(pid)}/rollback`, {
        versionId,
      }),
    revoke: (pid: string) =>
      call<{ publication: RemotePublication; removedFiles: number }>(
        "POST",
        `/api/publications/${id(pid)}/revoke`,
        {}
      ),
    comments: (pid: string) =>
      call<{ comments: RemoteComment[] }>(
        "GET",
        `/api/publications/${id(pid)}/comments`
      ),
    deleteComment: (pid: string, cid: string) =>
      call<{ deleted: string }>(
        "DELETE",
        `/api/publications/${id(pid)}/comments/${encodeURIComponent(cid)}`
      ),
  };
}

export type RemoteClient = ReturnType<typeof remoteClient>;

export async function studioErrors<T>(task: () => Promise<T>): Promise<T> {
  try {
    return await task();
  } catch (error) {
    throw error instanceof RemoteError ? toStudioError(error) : error;
  }
}
