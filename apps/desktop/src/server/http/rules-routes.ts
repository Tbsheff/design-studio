import type { Direction, Project } from "../../shared/actions/_core/contracts.js";
import type { DesignRule } from "../../shared/actions/_core/design-rules.js";
import { loadDesignRules } from "../design-rules/store.js";

const rulesLoader =
  (projectDir: (projectId: string) => string) =>
  async (project: Project, direction: Direction): Promise<DesignRule[]> =>
    (
      await loadDesignRules({
        direction,
        project,
        studioDir: projectDir(project.id),
      })
    ).rules;

export { rulesLoader };
