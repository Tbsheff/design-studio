import type { Project, RunRequest } from "@design-studio/contracts";

import { isLeanRun, leanContext, loadRepoContext } from "../agent/index.js";
import { insertPatternNames } from "../share/pattern/index.js";
import { getReferenceBlock, getStyleReferenceBlock } from "../store/index.js";

const toRepoText = (
  project: Project,
  workTree: string,
  request: RunRequest
): Promise<string | null> => {
  if (isLeanRun(request)) {
    return leanContext(project, workTree, request.selection);
  }

  return insertPatternNames(loadRepoContext(project, workTree));
};

const toRunRepoContext = async (
  project: Project,
  workTree: string,
  request: RunRequest
): Promise<string | null> => {
  const parts = await Promise.all([
    toRepoText(project, workTree, request),
    getReferenceBlock(workTree),
    getStyleReferenceBlock(project.id, workTree),
  ]);

  const found = parts.filter(
    (part): part is string => part !== null && part !== ""
  );

  if (found.length === 0) {
    return parts[0] ?? null;
  }

  return found.join("\n\n");
};

export { toRunRepoContext };
