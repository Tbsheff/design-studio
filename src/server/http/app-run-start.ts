import { withCommentInputs } from "../comments/run-payload.js";
import {
  captureReferencePage,
  parseReferenceUrls,
} from "../design-system/reference-page.js";
import { ConflictError } from "../platform/errors/index.js";
import type { StartRunCall } from "../run-log/index.js";
import type { AppContext } from "./app-context.js";
import { parseRunRequest } from "./app-run-parse.js";

const startRunFromCall = async (
  ctx: AppContext,
  input: StartRunCall
): Promise<string> => {
  const body = Object.fromEntries(Object.entries(input.body));
  const request = parseRunRequest(body);
  const loopback = ctx.config.fetchAllowLoopback === true;
  const urls = parseReferenceUrls(body.referenceUrls, loopback);

  if (urls.length > 0) {
    request.referencePages = await Promise.all(
      urls.map((url) => captureReferencePage(url, loopback))
    );
  }

  await ctx.waitForStop(input.projectId, input.directionId);

  return ctx.withDirection(
    input.projectId,
    input.directionId,
    async (project, direction) => {
      if (ctx.runner.isRunning(project.id, direction.id)) {
        throw new ConflictError("run_in_progress");
      }

      if (ctx.liveDrafts.isReading(project.id)) {
        throw new ConflictError(
          "The studio is still reading the sources. Wait until they finish."
        );
      }

      const withTasks = await ctx.withTaskInputs(project, direction, request);

      return ctx.startRun(
        project,
        direction,
        await withCommentInputs(ctx.comments, project, direction, withTasks)
      );
    }
  );
};

export { startRunFromCall };
