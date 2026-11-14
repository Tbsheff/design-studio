import { directEditRuntimeOf } from "../../direct-edit/index.js";
import { runAsAgent } from "../../platform/call-origin/index.js";
import { createPageFrames } from "./page-frames-ops.js";
import type { PageFramesWritten } from "./page-frames-ops.js";

interface RunPageFramesQuery {
  readonly directionId: string;
  readonly pages: readonly string[];
  readonly projectId: string;
}

const createRunPageFrames = (
  query: RunPageFramesQuery
): Promise<PageFramesWritten | null> => {
  const runtime = directEditRuntimeOf();

  if (runtime === null) {
    return Promise.resolve(null);
  }

  const { directionId, pages, projectId } = query;

  return runAsAgent({ directionId, projectId }, () =>
    runtime.withDirection(projectId, directionId, (project, direction) =>
      createPageFrames(
        { direction, project, runtime },
        { fromFrame: null, pages }
      )
    )
  );
};

export { createRunPageFrames };

export type { RunPageFramesQuery };
