import type { Hono } from "hono";

import type { AppContext } from "./app-context.js";

const registerSessionRoutes = (app: Hono, ctx: AppContext): void => {
  const { config } = ctx;

  app.get("/api/session", (c) => {
    if (c.req.header("sec-fetch-site") !== "same-origin") {
      return c.json({ error: "forbidden" }, 403);
    }
    return c.json({
      previewOrigin: config.previewOrigin,
      token: config.studioToken,
    });
  });
};

export { registerSessionRoutes };
