import type { ProjectSearchResult } from "../../shared/project-search.js";
import { searchProjects } from "../app/project-search.js";
import type { StudioProjectStore } from "../store/projects.js";
import type { PreviewService } from "../types.js";

interface ProjectSearchQuery {
  readonly limit: number;
  readonly projectId: string | null;
  readonly query: string;
}

interface ScopedSearchQuery extends ProjectSearchQuery {
  readonly isVisible: (projectId: string) => boolean;
}

const listInScope = async (
  projects: StudioProjectStore,
  isVisible: (projectId: string) => boolean
): Promise<Awaited<ReturnType<StudioProjectStore["list"]>>> => {
  const all = await projects.list();

  return all.filter((project) => isVisible(project.id));
};

const readProjectSearch = (
  projects: StudioProjectStore,
  preview: PreviewService | null,
  runsDir: (projectId: string) => string,
  query: ScopedSearchQuery
): Promise<ProjectSearchResult> =>
  searchProjects(
    {
      appStatus: (project) => preview?.apps?.status(project) ?? null,
      projects: { list: () => listInScope(projects, query.isVisible) },
      runsDir,
    },
    query
  );

export { readProjectSearch };

export type { ProjectSearchQuery };
