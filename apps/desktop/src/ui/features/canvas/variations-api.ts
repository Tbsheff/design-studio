import { VARIATION_MAX, VARIATION_MAX_REACT } from "@design-studio/contracts";
import type {
  Direction,
  Project,
  ProjectKind,
  VariationBriefsRequest,
  VariationBriefsResult,
  VariationMixRequest,
  VariationStartRequest,
  VariationStartResult,
} from "@design-studio/contracts";

import { sendJson } from "../../platform/http.js";
import type { JsonBody } from "../../platform/http.js";

const post = <T>(path: string, body: JsonBody = {}): Promise<T> =>
  sendJson<T>("POST", path, body);

const base = (pid: string) =>
  `/api/projects/${encodeURIComponent(pid)}/variations`;

export const variationsApi = {
  briefs: (pid: string, req: VariationBriefsRequest) =>
    post<VariationBriefsResult>(`${base(pid)}/briefs`, { ...req }),
  cancel: (pid: string, groupId: string) =>
    post<{ canceled: string[] }>(
      `${base(pid)}/${encodeURIComponent(groupId)}/cancel`
    ),
  keep: (pid: string, groupId: string, directionId: string) =>
    post<{ versionId: string; directionId: string; label: string }>(
      `${base(pid)}/${encodeURIComponent(groupId)}/keep`,
      { directionId }
    ),
  mix: (pid: string, req: VariationMixRequest) =>
    post<{ runId: string }>(`${base(pid)}/mix`, { ...req }),
  start: (pid: string, req: VariationStartRequest) =>
    post<VariationStartResult>(base(pid), { ...req }),
};

export function maxVariationsFor(kind: ProjectKind): number {
  return kind === "react" ? VARIATION_MAX_REACT : VARIATION_MAX;
}

export function groupOf(
  project: Project | null,
  groupId: string | null
): Direction[] {
  if (!project || !groupId) {
    return [];
  }

  return project.directions
    .filter((direction) => direction.variation?.groupId === groupId)
    .sort((a, b) => (a.variation?.index ?? 0) - (b.variation?.index ?? 0));
}
