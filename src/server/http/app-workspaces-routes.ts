import { existsSync } from "node:fs";

import type { Hono } from "hono";

import type { AppContext } from "./app-context.js";
import { optionalString, readBody, requireString } from "./app-request.js";

const registerWorkspacesRoutes = (app: Hono, ctx: AppContext): void => {
  const { defaultFolder, workspaces } = ctx;

  app.get("/api/workspaces", async (c) => c.json(await workspaces.list()));

  app.post("/api/workspaces", async (c) => {
    const body = await readBody(c);

    return c.json(
      await workspaces.add({
        label: optionalString(body, "label"),
        path: requireString(body, "path"),
      })
    );
  });

  app.put("/api/workspaces/default", async (c) => {
    const body = await readBody(c);
    const previous = await defaultFolder.current();
    const next = await defaultFolder.set(requireString(body, "path"));

    if (previous !== next && existsSync(previous)) {
      await workspaces
        .add({ path: previous })
        .catch((error: unknown) =>
          console.error("[http] could not keep the old default folder", error)
        );
    }

    return c.json(await workspaces.list());
  });

  app.patch("/api/workspaces/:id", async (c) => {
    const body = await readBody(c);

    return c.json(
      await workspaces.rename(c.req.param("id"), requireString(body, "label"))
    );
  });

  app.delete("/api/workspaces/:id", async (c) => {
    await workspaces.remove(c.req.param("id"));

    return c.json({ ok: true });
  });
};

export { registerWorkspacesRoutes };
