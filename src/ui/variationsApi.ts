import {
  STUDIO_TOKEN_HEADER,
  VARIATION_MAX,
  VARIATION_MAX_REACT,
  type Direction,
  type Project,
  type ProjectKind,
  type VariationBriefsRequest,
  type VariationBriefsResult,
  type VariationMixRequest,
  type VariationStartRequest,
  type VariationStartResult,
} from '../shared/contracts';
import { ApiError } from './api';
import { getSession } from './session';

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { [STUDIO_TOKEN_HEADER]: getSession().token, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `POST ${path} failed: ${res.status}`;
    let code: string | undefined;
    try {
      const data = (await res.json()) as { error?: string; message?: string };
      message = data.error ?? data.message ?? message;
      code = data.error;
    } catch {
      message = `${message} ${res.statusText}`;
    }
    throw new ApiError(res.status, message, code);
  }
  return (await res.json()) as T;
}

const base = (pid: string) => `/api/projects/${encodeURIComponent(pid)}/variations`;

export const variationsApi = {
  briefs: (pid: string, req: VariationBriefsRequest) => post<VariationBriefsResult>(`${base(pid)}/briefs`, req),
  start: (pid: string, req: VariationStartRequest) => post<VariationStartResult>(base(pid), req),
  cancel: (pid: string, groupId: string) => post<{ canceled: string[] }>(`${base(pid)}/${encodeURIComponent(groupId)}/cancel`),
  mix: (pid: string, req: VariationMixRequest) => post<{ runId: string }>(`${base(pid)}/mix`, req),
  keep: (pid: string, groupId: string, directionId: string) => post<{ versionId: string; directionId: string; label: string }>(`${base(pid)}/${encodeURIComponent(groupId)}/keep`, { directionId }),
};

export function maxVariationsFor(kind: ProjectKind): number {
  return kind === 'react' ? VARIATION_MAX_REACT : VARIATION_MAX;
}

export function groupOf(project: Project | null, groupId: string | null): Direction[] {
  if (!project || !groupId) return [];
  return project.directions.filter((direction) => direction.variation?.groupId === groupId).sort((a, b) => (a.variation?.index ?? 0) - (b.variation?.index ?? 0));
}
