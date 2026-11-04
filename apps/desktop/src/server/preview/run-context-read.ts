import type { Direction, Project } from "../../shared/actions/_core/contracts.js";
import { loadRepoContext } from "../agent/index.js";
import type { StudioProjectStore } from "../store/projects.js";

interface RunContextQuery {
  readonly directionId: string | null;
  readonly projectId: string;
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

const readRunContext = async (
  projects: StudioProjectStore,
  query: RunContextQuery
): Promise<Awaited<ReturnType<typeof loadRepoContext>>> => {
  const project = await projects.get(query.projectId);
  const direction = toDirection(projects, project, query.directionId);

  return loadRepoContext(project, direction.workTree);
};

export { readRunContext };

export type { RunContextQuery };
