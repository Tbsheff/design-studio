import { Forbidden } from "@design-studio/actions/_core/errors/forbidden";
import { toWire } from "@design-studio/actions/_core/wire";
import type { Hono } from "hono";

import type { AppContext } from "./app-context.js";

const FORBIDDEN_BODY = toWire(
  new Forbidden({
    message: "Only the Design Studio app can read this session.",
    perm: "session",
  })
);

const registerSessionRoutes = (app: Hono, ctx: AppContext): void => {
  const { config } = ctx;

  app.get("/api/session", (c) => {
    if (c.req.header("sec-fetch-site") !== "same-origin") {
      return c.json(FORBIDDEN_BODY, 403);
    }
    return c.json({
      previewOrigin: config.previewOrigin,
      token: config.studioToken,
    });
  });
};

export { registerSessionRoutes };
