import type { Context, Hono } from "hono";

import type { PublishPlanInput } from "../../shared/publish.js";
import {
  createPublishService,
  type PublishDeps,
  type PublishService,
} from "../publish/service.js";
import { assertSafeId, BadRequestError } from "../store/errors.js";

export interface PublishRouteDeps extends PublishDeps {
  readBody: (c: Context) => Promise<Record<string, unknown>>;
}

const STRINGS = [
  "directionId",
  "versionId",
  "title",
  "password",
  "publicationId",
] as const;

const BOOLEANS = [
  "keepPassword",
  "comments",
  "viewerComments",
  "noindex",
] as const;

function planInput(raw: Record<string, unknown>): PublishPlanInput {
  const input: PublishPlanInput = {};

  for (const key of STRINGS) {
    if (typeof raw[key] === "string") {
      input[key] = raw[key];
    }
  }

  for (const key of BOOLEANS) {
    if (typeof raw[key] === "boolean") {
      input[key] = raw[key];
    }
  }

  if (Array.isArray(raw.frames)) {
    input.frames = raw.frames as PublishPlanInput["frames"];
  }

  if (Array.isArray(raw.frameIds)) {
    input.frameIds = raw.frameIds.filter(
      (id): id is string => typeof id === "string"
    );
  }

  if (typeof raw.expiresInDays === "number") {
    input.expiresInDays =
      raw.expiresInDays as PublishPlanInput["expiresInDays"];
  }

  return input;
}

function registerSetupRoutes(
  app: Hono,
  deps: PublishRouteDeps,
  service: PublishService
): void {
  app.get("/api/publish/cli", async (c) =>
    c.json(await service.cli.state(c.req.query("fresh") === "1"))
  );

  app.post("/api/publish/login", async (c) => {
    const body = await deps.readBody(c);

    return c.json(
      await service.cli.startLogin(
        body.keyring !== false,
        body.narrow !== false
      )
    );
  });

  app.delete("/api/publish/login", async (c) =>
    c.json(await service.cli.cancelLogin())
  );
  app.post("/api/publish/logout", async (c) =>
    c.json(await service.cli.logout())
  );

  app.put("/api/publish/settings", async (c) => {
    const body = await deps.readBody(c);

    if (body.accountId !== null && typeof body.accountId !== "string") {
      throw new BadRequestError("accountId must be a string or null");
    }

    return c.json(await service.cli.setAccount(body.accountId));
  });

  app.get("/api/publish/backend", async (c) =>
    c.json(await service.backend.state(c.req.query("check") === "1"))
  );

  app.post("/api/publish/backend/setup", async (c) => {
    const body = await deps.readBody(c);
    const mode = body.mode === "local" ? "local" : "cloudflare";

    return c.json(await service.backend.start(mode));
  });
}

export function registerPublishRoutes(
  app: Hono,
  deps: PublishRouteDeps
): PublishService {
  const service = createPublishService(deps);
  registerSetupRoutes(app, deps, service);

  const pidOf = (c: Context) =>
    assertSafeId(c.req.param("pid") ?? "", "projectId");

  app.get("/api/projects/:pid/publications", async (c) =>
    c.json(await service.list(pidOf(c)))
  );

  app.post("/api/projects/:pid/publish/plan", async (c) =>
    c.json(await service.plan(pidOf(c), planInput(await deps.readBody(c))))
  );

  app.post("/api/projects/:pid/publish", async (c) => {
    const body = await deps.readBody(c);

    if (typeof body.planId !== "string") {
      throw new BadRequestError("planId is required");
    }

    return c.json({
      publication: await service.publish(pidOf(c), body.planId),
    });
  });

  app.delete("/api/projects/:pid/publications/:id", async (c) =>
    c.json({
      publication: await service.unpublish(pidOf(c), c.req.param("id")),
    })
  );

  app.post("/api/projects/:pid/publications/:id/rollback", async (c) => {
    const body = await deps.readBody(c);

    if (typeof body.versionId !== "string") {
      throw new BadRequestError("versionId is required");
    }

    return c.json({
      publication: await service.rollback(
        pidOf(c),
        c.req.param("id"),
        body.versionId
      ),
    });
  });

  app.get("/api/projects/:pid/publications/:id/comments", async (c) =>
    c.json({ comments: await service.comments(pidOf(c), c.req.param("id")) })
  );

  app.delete("/api/projects/:pid/publications/:id/comments/:cid", async (c) => {
    await service.deleteComment(
      pidOf(c),
      c.req.param("id"),
      c.req.param("cid")
    );

    return c.json({ ok: true });
  });

  return service;
}
