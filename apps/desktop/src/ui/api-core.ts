import { request } from "./platform/http";
import type { JsonBody } from "./platform/http";
import { prefetch, readShared } from "./platform/query";

const json = <Payload>(
  method: string,
  path: string,
  body?: JsonBody
): Promise<Payload> => {
  const load = async (): Promise<Payload> => {
    const res = await request(method, path, body ?? null);

    return (await res.json()) as Payload;
  };

  if (method === "GET") {
    return readShared(`GET ${path}`, load);
  }

  return load();
};

const getBlob = async (path: string): Promise<Blob> => {
  const res = await request("GET", path);

  return res.blob();
};

const enc = encodeURIComponent;

const toProjectPath = (pid: string): string => `/api/projects/${enc(pid)}`;

const toDirectionPath = (pid: string, did: string): string =>
  `${toProjectPath(pid)}/d/${enc(did)}`;

const RUNS_PAGE = "/runs?cursor=null&limit=200";

const warmPath = (pid: string, path: string): void => {
  prefetch(pid, `GET ${path}`, async () => {
    const res = await request("GET", path);

    return (await res.json()) as unknown;
  });
};

const warmProject = (pid: string, directionId: string | null): void => {
  warmPath(pid, toProjectPath(pid));
  warmPath(pid, `${toProjectPath(pid)}/canvas`);

  if (directionId) {
    warmPath(pid, `${toDirectionPath(pid, directionId)}/preview`);
  }
};

const BASE64_CHUNK = 32_768;

const fileToBase64 = async (file: File): Promise<string> => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";

  for (let at = 0; at < bytes.length; at += BASE64_CHUNK) {
    binary += String.fromCodePoint(...bytes.subarray(at, at + BASE64_CHUNK));
  }

  return btoa(binary);
};

const base64ToBlob = (data: string, mimeType: string): Blob => {
  const binary = atob(data);
  const bytes = Uint8Array.from(binary, (char) => char.codePointAt(0) ?? 0);

  return new Blob([bytes], { type: mimeType });
};

export {
  json,
  getBlob,
  enc,
  toProjectPath,
  toDirectionPath,
  RUNS_PAGE,
  warmPath,
  warmProject,
  fileToBase64,
  base64ToBlob,
};
