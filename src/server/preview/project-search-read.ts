import type { ProjectSearchResult } from "../../shared/project-search.js";
import { searchProjects } from "../app/project-search.js";
import type { StudioProjectStore } from "../store/projects.js";
import type { PreviewService } from "../types.js";

interface ProjectSearchQuery {
  readonly limit: number;
  readonly projectId: string | null;
  readonly query: string;
}

const readProjectSearch = (
  projects: StudioProjectStore,
  preview: PreviewService | null,
  runsDir: (projectId: string) => string,
  query: ProjectSearchQuery
): Promise<ProjectSearchResult> =>
  searchProjects(
    {
      appStatus: (project) => preview?.apps?.status(project) ?? null,
      projects,
      runsDir,
    },
    query
  );

export { readProjectSearch };

export type { ProjectSearchQuery };
