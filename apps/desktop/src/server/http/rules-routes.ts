import type { Direction, Project } from "@design-studio/actions/_core/contracts";
import type { DesignRule } from "@design-studio/actions/_core/design-rules";
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
