import type { Hono } from "hono";

import { linkLegacy } from "../publish/legacy-link.js";
import { createPublishService } from "../publish/service.js";
import type { PublishDeps } from "../publish/service.js";
import type { AppContext } from "./app-context.js";

const toPublishDeps = (ctx: AppContext): PublishDeps => ({
  comments: ctx.comments,
  dataDir: ctx.config.dataDir,
  preview: ctx.preview,
  projects: ctx.projects,
  secrets: [ctx.config.studioToken],
  uiDir: ctx.uiDir,
  versions: ctx.versions,
});

const createAppPublishLink = (ctx: AppContext): void => {
  const deps = toPublishDeps(ctx);

  linkLegacy(deps, createPublishService(deps));
};

const registerAppPublishRoutes = (_app: Hono, ctx: AppContext): void => {
  createAppPublishLink(ctx);
};

export { registerAppPublishRoutes };
