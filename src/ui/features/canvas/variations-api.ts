import {
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
} from "../../../shared/contracts.js";
import { sendJson, type JsonBody } from "../../platform/http.js";

const post = <T>(path: string, body: JsonBody = {}): Promise<T> =>
  sendJson<T>("POST", path, body);

const base = (pid: string) =>
  `/api/projects/${encodeURIComponent(pid)}/variations`;

export const variationsApi = {
  briefs: (pid: string, req: VariationBriefsRequest) =>
    post<VariationBriefsResult>(`${base(pid)}/briefs`, { ...req }),
  start: (pid: string, req: VariationStartRequest) =>
    post<VariationStartResult>(base(pid), { ...req }),
  cancel: (pid: string, groupId: string) =>
    post<{ canceled: string[] }>(
      `${base(pid)}/${encodeURIComponent(groupId)}/cancel`
    ),
  mix: (pid: string, req: VariationMixRequest) =>
    post<{ runId: string }>(`${base(pid)}/mix`, { ...req }),
  keep: (pid: string, groupId: string, directionId: string) =>
    post<{ versionId: string; directionId: string; label: string }>(
      `${base(pid)}/${encodeURIComponent(groupId)}/keep`,
      { directionId }
    ),
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
