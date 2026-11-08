import { tokenEntriesFor } from "../../page-import/index.js";
import type { CompiledTokenEntry } from "../../page-import/index.js";
import type { Project } from "../deps.js";

const MAIN_DIRECTION = "main";

const toProjectEntries = (project: Project): Promise<CompiledTokenEntry[]> => {
  const direction =
    project.directions.find((found) => found.id === MAIN_DIRECTION) ??
    project.directions[0] ??
    null;

  if (direction === null) {
    return Promise.resolve([]);
  }

  return tokenEntriesFor(project, direction);
};

export { toProjectEntries };
