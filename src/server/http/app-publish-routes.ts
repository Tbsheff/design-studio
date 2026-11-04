import { Schema } from "effect";
import type { Hono } from "hono";

import { publishPublish } from "../../shared/actions/publish/publish.js";
import { assertSafeId, BadRequestError } from "../platform/errors/index.js";
import { linkLegacy, planFor } from "../publish/legacy-link.js";
import { toPlanInput } from "../publish/plan-input.js";
import { createPublishService } from "../publish/service.js";
import type { PublishDeps } from "../publish/service.js";
import type { AppContext } from "./app-context.js";
import { readBody } from "./app-request.js";

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

const toPublishDeps = (ctx: AppContext): PublishDeps => ({
  comments: ctx.comments,
  dataDir: ctx.config.dataDir,
  preview: ctx.preview,
  projects: ctx.projects,
  secrets: [ctx.config.studioToken],
  versions: ctx.versions,
});

const registerAppPublishRoutes = (app: Hono, ctx: AppContext): void => {
  const deps = toPublishDeps(ctx);
  const link = linkLegacy(deps, createPublishService(deps));

  app.post("/api/projects/:projectId/publish/plan", async (c) => {
    const projectId = assertSafeId(c.req.param("projectId") ?? "", "projectId");
    const body = await readBody(c);
    const input = await toDecodedPlan({ ...body, projectId });

    return c.json(
      await planFor(link, projectId, await toPlanInput(link, input))
    );
  });
};

export { registerAppPublishRoutes };
