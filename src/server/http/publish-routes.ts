import { Schema } from "effect";
import type { Context, Hono } from "hono";

import { publishPublish } from "../../shared/actions/publish/publish.js";
import { linkLegacy, planFor } from "../publish/legacy-link.js";
import { toPlanInput } from "../publish/plan-input.js";
import {
  createPublishService,
  type PublishDeps,
  type PublishService,
} from "../publish/service.js";
import { assertSafeId, BadRequestError } from "../store/errors.js";

const decodePlanBody = Schema.decodeUnknownPromise(publishPublish.input, {
  onExcessProperty: "error",
});

const toDecodedPlan = async (raw: Record<string, unknown>) => {
  try {
    return await decodePlanBody(raw);
  } catch (error) {
    throw new BadRequestError(String(error));
  }
};

export interface PublishRouteDeps extends PublishDeps {
  readBody: (c: Context) => Promise<Record<string, unknown>>;
}

function registerSetupRoutes(
  app: Hono,
  deps: PublishRouteDeps,
  service: PublishService
): void {
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
  const link = linkLegacy(deps, service);

  app.post("/api/projects/:pid/publish/plan", async (c) => {
    const projectId = assertSafeId(c.req.param("pid") ?? "", "projectId");
    const body = await deps.readBody(c);
    const input = await toDecodedPlan({ ...body, projectId });

    return c.json(
      await planFor(link, projectId, await toPlanInput(link, input))
    );
  });

  return service;
}
