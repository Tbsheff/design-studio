import type { Project } from "../../shared/actions/_core/contracts.js";
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
  isVisible: (projectId: string) => boolean
): Promise<readonly ProjectSummary[]> => {
  const all = await projects.list();
  const summaries: ProjectSummary[] = [];

  for (const project of all) {
    if (!project.designSystemFor && isVisible(project.id)) {
      summaries.push(toProjectSummary(project));
    }
  }

  return summaries;
};

export { readProjectList };

export type { ProjectSummary };
