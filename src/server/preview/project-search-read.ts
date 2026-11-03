import type { ProjectSearchResult } from "../../shared/project-search.js";
import { searchProjects } from "../app/project-search.js";
import type { OrgScope } from "../store/org-scope.js";
import { isProjectInScope } from "../store/project-org.js";
import type { StudioProjectStore } from "../store/projects.js";
import type { PreviewService } from "../types.js";

interface ProjectSearchQuery {
  readonly limit: number;
  readonly projectId: string | null;
  readonly query: string;
  readonly scope: OrgScope;
}

const listInScope = async (
  projects: StudioProjectStore,
  scope: OrgScope
): Promise<Awaited<ReturnType<StudioProjectStore["list"]>>> => {
  const all = await projects.list();

  const visible = await Promise.all(
    all.map((project) => isProjectInScope(scope, project.id))
  );

  return all.filter((_project, index) => visible[index] === true);
};

const readProjectSearch = (
  projects: StudioProjectStore,
  preview: PreviewService | null,
  runsDir: (projectId: string) => string,
  query: ProjectSearchQuery
): Promise<ProjectSearchResult> =>
  searchProjects(
    {
      appStatus: (project) => preview?.apps?.status(project) ?? null,
      projects: { list: () => listInScope(projects, query.scope) },
      runsDir,
    },
    query
  );

export { readProjectSearch };

export type { ProjectSearchQuery };
