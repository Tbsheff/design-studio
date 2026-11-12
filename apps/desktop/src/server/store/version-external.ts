import type { Project, WorkTreeStatus } from "@design-studio/contracts";

const isExternalTree = (project: Project): boolean =>
  Boolean(project.app) ||
  (project.imported !== null && project.imported.created !== true);

const toCleanStatus = (): WorkTreeStatus => ({ changed: [], dirty: false });

export { isExternalTree, toCleanStatus };
