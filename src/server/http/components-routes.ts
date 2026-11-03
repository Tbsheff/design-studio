import type { Hono } from "hono";

import { directEditRuntimeOf, thumbOf } from "../direct-edit/index.js";
import { BadRequestError } from "../store/errors.js";

const THUMB_HEADERS = {
  "cache-control": "private, max-age=3600",
  "content-type": "image/png",
} as const;

const registerComponentRoutes = (app: Hono): void => {
  app.get("/api/projects/:pid/d/:did/components/:id/thumb", async (c) => {
    const runtime = directEditRuntimeOf();

    if (runtime === null) {
      throw new BadRequestError("direct edit is not ready");
    }

    const png = await thumbOf(
      runtime,
      { directionId: c.req.param("did"), projectId: c.req.param("pid") },
      c.req.param("id"),
      c.req.query("v") ?? "0"
    );

    return c.body(new Uint8Array(png), 200, THUMB_HEADERS);
  });
};

export { registerComponentRoutes };
