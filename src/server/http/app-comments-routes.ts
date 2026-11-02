import type { Hono } from "hono";

import type { AppContext } from "./app-context.js";
import { registerCommentRoutes } from "./comments-routes.js";

const registerAppCommentsRoutes = (app: Hono, ctx: AppContext): void => {
  const {
    comments,
    loadDirection,
    preview,
    projects,
    runner,
    runsDir,
    startRun,
    withDirection,
  } = ctx;
  registerCommentRoutes(app, {
    comments,
    runner,
    runsDir,
    loadDirection,
    withDirection,
    startRun,
    hasAttachment: (pid, id) =>
      projects.getAttachment(pid, id).then(
        () => true,
        () => false
      ),
    prefill: {
      preview,
      projectDir: (id) => projects.projectDir(id),
      getAttachment: (pid, id) => projects.getAttachment(pid, id),
      saveAttachment: (pid, file) => projects.saveAttachment(pid, file),
    },
  });
};

export { registerAppCommentsRoutes };
