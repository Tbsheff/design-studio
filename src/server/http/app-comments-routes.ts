import type { Hono } from "hono";

import { bindCommentRuntime } from "../comments/comment-core.js";
import type { AppContext } from "./app-context.js";
import { registerCommentRoutes } from "./comments-routes.js";

const registerAppCommentsRoutes = (app: Hono, ctx: AppContext): void => {
  const {
    comments,
    config,
    loadDirection,
    preview,
    projects,
    runner,
    runsDir,
    startRun,
    withDirection,
  } = ctx;
  const hasAttachment = (pid: string, id: string): Promise<boolean> =>
    projects.getAttachment(pid, id).then(
      () => true,
      () => false
    );
  const prefill = {
    preview,
    projectDir: (id: string) => projects.projectDir(id),
    getAttachment: (pid: string, id: string) => projects.getAttachment(pid, id),
    saveAttachment: (
      pid: string,
      file: { name: string; mime: string; bytes: Uint8Array }
    ) => projects.saveAttachment(pid, file),
  };
  bindCommentRuntime(config.dataDir, {
    files: comments,
    hasAttachment,
    loadTarget: async (pid, did) => {
      const project = await projects.get(pid);
      const direction =
        did === null
          ? projects.mainDirection(project)
          : projects.directionOf(project, did);
      return { direction, project };
    },
    prefill,
    projectDir: (id) => projects.projectDir(id),
  });
  registerCommentRoutes(app, {
    comments,
    runner,
    runsDir,
    loadDirection,
    withDirection,
    startRun,
    hasAttachment,
    prefill,
  });
};

export { registerAppCommentsRoutes };
