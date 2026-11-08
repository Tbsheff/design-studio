import { Hono } from "hono";

import { isRunSummary } from "../run-log/index.js";
import { registerAppCanvasRoutes } from "./app-canvas-routes.js";
import { registerAppCommentsRoutes } from "./app-comments-routes.js";
import { createAppContext, type AppDeps } from "./app-context.js";
import {
  registerDevserverPortRoutes,
  registerDevserverRoutes,
} from "./app-devserver-routes.js";
import {
  registerDirectEditCreateRoutes,
  registerDirectEditPanelRoutes,
} from "./app-direct-edit-panel-routes.js";
import { registerDirectEditRoutes } from "./app-direct-edit-routes.js";
import { toErrorReply } from "./app-errors.js";
import { registerEventsRoutes } from "./app-events-routes.js";
import { registerAppExportRoutes } from "./app-export-routes.js";
import { createMcpSlot, registerAppMcpRoutes } from "./app-mcp-routes.js";
import { registerAppPacksRoutes } from "./app-packs-routes.js";
import {
  registerHomeProjectRoutes,
  registerProjectsRoutes,
} from "./app-projects-routes.js";
import { registerAppPublishRoutes } from "./app-publish-routes.js";
import {
  registerProjectRunsRoutes,
  registerRunsRoutes,
  registerRunsVariationRoutes,
} from "./app-runs-routes.js";
import { registerSessionRoutes } from "./app-session-routes.js";
import { registerAppShareRoutes } from "./app-share-routes.js";
import { registerAppShipRoutes } from "./app-ship-routes.js";
import { registerStudioRoutes } from "./app-studio-routes.js";
import {
  registerVersionsHistoryRoutes,
  registerVersionsRoutes,
} from "./app-versions-routes.js";
import { registerLoopbackGuard } from "./loopback-guard.js";
import { renderIndexHtml, serveStatic } from "./static.js";

export { isRunSummary };

export function createApp(deps: AppDeps): Hono {
  const ctx = createAppContext(deps);
  const { config, uiDir } = ctx;
  const app = new Hono();
  app.onError((error, c) => {
    const reply = toErrorReply(error);
    if (reply.status === 500) console.error("[http]", error);
    return c.json(reply.body, reply.status);
  });

  registerSessionRoutes(app, ctx);

  registerLoopbackGuard(app, ctx);

  const mcpSlot = createMcpSlot();
  registerProjectsRoutes(app, ctx);
  registerStudioRoutes(app, ctx);
  registerDevserverRoutes(app, ctx);
  registerEventsRoutes(app, ctx);
  registerProjectRunsRoutes(app, ctx);
  registerVersionsRoutes(app, ctx);
  registerDirectEditRoutes(app, ctx);
  registerRunsRoutes(app, ctx);
  registerAppExportRoutes(app, ctx);
  registerAppCommentsRoutes(app, ctx);
  registerDirectEditPanelRoutes(app);
  registerAppPacksRoutes(app, ctx);
  registerHomeProjectRoutes(app, ctx);
  registerVersionsHistoryRoutes(app, ctx, mcpSlot);
  registerAppCanvasRoutes(app, ctx);
  const variations = registerRunsVariationRoutes(app, ctx);
  const mcpRoutes = registerAppMcpRoutes(app, ctx, mcpSlot, variations);
  registerAppShipRoutes(app, ctx, mcpRoutes);
  registerAppShareRoutes(app, ctx);
  registerAppPublishRoutes(app, ctx);
  registerDirectEditCreateRoutes(app, ctx);
  registerDevserverPortRoutes(app, ctx);

  app.all("/api/*", (c) => c.json({ error: "not found" }, 404));

  app.get("*", async (c) => {
    const served = await serveStatic(uiDir, c.req.path);
    if (served) return served;
    const html = await renderIndexHtml(uiDir, config);
    return c.html(html);
  });

  return app;
}
