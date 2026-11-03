import type { Project } from "../../shared/contracts.js";
import type { OrgScope } from "../store/org-scope.js";
import { isProjectInScope } from "../store/project-org.js";
import type { StudioProjectStore } from "../store/projects.js";

interface ProjectSummary {
  readonly app?: {
    readonly appDir: string;
    readonly framework: string;
    readonly mode: string;
  };
  readonly directions: readonly {
    readonly headVersionId: string | null;
    readonly id: string;
    readonly name: string;
  }[];
  readonly entry: string;
  readonly folder: string | null;
  readonly id: string;
  readonly kind: string;
  readonly name: string;
  readonly updatedAt: string;
}

const toProjectSummary = (project: Project): ProjectSummary => {
  const [main] = project.directions;

  const summary = {
    directions: project.directions.map((direction) => ({
      headVersionId: direction.headVersionId,
      id: direction.id,
      name: direction.name,
    })),
    entry: project.entry || "index.html",
    folder: project.imported?.sourcePath ?? main?.workTree ?? null,
    id: project.id,
    kind: project.kind,
    name: project.name,
    updatedAt: new Date(project.updatedAt).toISOString(),
  };

  if (!project.app) {
    return summary;
  }

  return {
    ...summary,
    app: {
      appDir: project.app.appDir,
      framework: project.app.framework,
      mode: project.app.mode,
    },
  };
};

const readProjectList = async (
  projects: StudioProjectStore,
  scope: OrgScope
): Promise<readonly ProjectSummary[]> => {
  const all = await projects.list();
  const list = all.filter((project) => !project.designSystemFor);

  const visible = await Promise.all(
    list.map((project) => isProjectInScope(scope, project.id))
  );

  const summaries: ProjectSummary[] = [];

  for (const [index, project] of list.entries()) {
    if (visible[index] === true) {
      summaries.push(toProjectSummary(project));
    }
  }

  return summaries;
};

export { readProjectList };

export type { ProjectSummary };
