import type { Direction, Project } from "@design-studio/contracts";
import type { ComponentUsage } from "@design-studio/contracts/usage-scope";

import type { PreviewService } from "../../shared/server-ports.js";
import type { StudioProjectStore } from "../store/projects.js";
import { componentUsage } from "./usage-scope.js";
import type { UsageAt } from "./usage-scope.js";

interface UsageQuery {
  readonly directionId: string | null;
  readonly file: string;
  readonly projectId: string;
  readonly route: string | null;
  readonly usedAt: string | null;
}

const toDirection = (
  projects: StudioProjectStore,
  project: Project,
  directionId: string | null
): Direction => {
  if (directionId === null) {
    return projects.mainDirection(project);
  }

  return projects.directionOf(project, directionId);
};

const readUsage = async (
  projects: StudioProjectStore,
  preview: PreviewService | null,
  query: UsageQuery
): Promise<ComponentUsage> => {
  const project = await projects.get(query.projectId);
  const direction = toDirection(projects, project, query.directionId);
  const at: UsageAt = {};

  if (query.usedAt !== null) {
    at.usedAt = query.usedAt;
  }

  if (query.route !== null) {
    at.route = query.route;
  }

  return componentUsage(
    project,
    direction.workTree,
    query.file,
    preview?.usageEdges,
    at
  );
};

export { readUsage };

export type { UsageQuery };
