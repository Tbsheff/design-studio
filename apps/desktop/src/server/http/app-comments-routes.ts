import type { Hono } from "hono";

import { bindCommentRuntime } from "../comments/comment-core.js";
import { createRunWatcher } from "../comments/run-watch.js";
import type { AppContext } from "./app-context.js";
import { registerCommentRoutes } from "./comments-routes.js";

const registerAppCommentsRoutes = (app: Hono, ctx: AppContext): void => {
  const {
    canvas,
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
  const watcher = createRunWatcher({ files: comments, runner, runsDir });
  const loadReferenceTarget = async (pid: string, did: string | null) => {
    const project = await projects.get(pid);
    const direction =
      did === null
        ? projects.mainDirection(project)
        : projects.directionOf(project, did);
    return { direction, project };
  };
  bindCommentRuntime(config.dataDir, {
    files: comments,
    hasAttachment,
    loadTarget: loadReferenceTarget,
    prefill,
    projectDir: (id) => projects.projectDir(id),
    reference: {
      dataDir: config.dataDir,
      listFrames: async (project) =>
        (await canvas.read(project)).canvas?.frames ?? [],
      loadTarget: loadReferenceTarget,
      preview,
    },
    runs: { runner, startRun, watcher, withDirection },
  });
  registerCommentRoutes(app, { comments, loadDirection, watcher });
};

export { registerAppCommentsRoutes };
