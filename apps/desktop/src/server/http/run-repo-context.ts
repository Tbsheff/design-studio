import type { Project, RunRequest } from "@design-studio/contracts";

import { isLeanRun, leanContext, loadRepoContext } from "../agent/index.js";
import { insertPatternNames } from "../share/pattern/index.js";
import { getReferenceBlock } from "../store/index.js";

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
  const [text, reference] = await Promise.all([
    toRepoText(project, workTree, request),
    getReferenceBlock(workTree),
  ]);

  if (reference === null) {
    return text;
  }

  if (text === null || text === "") {
    return reference;
  }

  return `${text}\n\n${reference}`;
};

export { toRunRepoContext };
