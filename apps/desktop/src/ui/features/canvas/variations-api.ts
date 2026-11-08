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

const post = <Item>(path: string, body: JsonBody = {}): Promise<Item> =>
  sendJson<Item>("POST", path, body);

const base = (pid: string): string =>
  `/api/projects/${encodeURIComponent(pid)}/variations`;

interface KeptVariation {
  versionId: string;
  directionId: string;
  label: string;
}

const variationsApi = {
  briefs: (
    pid: string,
    req: VariationBriefsRequest
  ): Promise<VariationBriefsResult> =>
    post<VariationBriefsResult>(`${base(pid)}/briefs`, { ...req }),
  cancel: (pid: string, groupId: string): Promise<{ canceled: string[] }> =>
    post<{ canceled: string[] }>(
      `${base(pid)}/${encodeURIComponent(groupId)}/cancel`
    ),
  keep: (
    pid: string,
    groupId: string,
    directionId: string
  ): Promise<KeptVariation> =>
    post<KeptVariation>(`${base(pid)}/${encodeURIComponent(groupId)}/keep`, {
      directionId,
    }),
  mix: (pid: string, req: VariationMixRequest): Promise<{ runId: string }> =>
    post<{ runId: string }>(`${base(pid)}/mix`, { ...req }),
  start: (
    pid: string,
    req: VariationStartRequest
  ): Promise<VariationStartResult> =>
    post<VariationStartResult>(base(pid), { ...req }),
};

const maxVariationsFor = (kind: ProjectKind): number => {
  if (kind === "react") {
    return VARIATION_MAX_REACT;
  }

  return VARIATION_MAX;
};

const groupOf = (
  project: Project | null,
  groupId: string | null
): Direction[] => {
  if (!project || !groupId) {
    return [];
  }

  return project.directions
    .filter((direction) => direction.variation?.groupId === groupId)
    .toSorted(
      (directionValue, direction3) =>
        (directionValue.variation?.index ?? 0) -
        (direction3.variation?.index ?? 0)
    );
};

export { groupOf, maxVariationsFor, variationsApi };

export type { KeptVariation };
