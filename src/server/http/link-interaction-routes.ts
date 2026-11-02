import type { Context, Hono } from "hono";
import type { z } from "zod";

import type { Project } from "../../shared/contracts.js";
import type { FrameStateDeps } from "../canvas/app-flow/frame-state-service.js";
import {
  linkInteractionSchema,
  toInteractionRequest,
} from "../canvas/links/link-interaction-input.js";
import { setLinkInteraction } from "../canvas/links/link-interaction.js";
import { probeWithPreview } from "../canvas/links/link-tools.js";
import type { LinkProbe } from "../canvas/links/link-tools.js";
import type { CanvasService } from "../canvas/service.js";
import type { CanvasToolContext, ToolText } from "../canvas/tools.js";
import type { StudioProjectStore } from "../store/projects.js";
import type { PreviewService } from "../types.js";

interface LinkInteractionRouteDeps {
  readonly canvas: CanvasService;
  readonly frameStates: FrameStateDeps;
  readonly preview: Pick<PreviewService, "directionUrl" | "withPage"> | null;
  readonly projects: StudioProjectStore;
  readonly readBody: (ctx: Context) => Promise<object>;
}

const INTERACTION_PATH = "/api/projects/:pid/links/interaction";
const BAD_REQUEST = 400;

const invalid = (ctx: Context, error: z.ZodError): Response => {
  const [issue] = error.issues;
  const where = issue?.path.join(".") || "request";
  const message = `${where}: ${issue?.message ?? "not valid"}`;

  return ctx.json({ error: "invalid_request", message }, BAD_REQUEST);
};

const textOf = (result: ToolText): string =>
  result.content.map((part) => part.text).join("\n");

const scopeOf = (
  deps: LinkInteractionRouteDeps,
  project: Project
): CanvasToolContext | null => {
  const [first] = project.directions;

  if (!first) {
    return null;
  }

  return {
    canvas: deps.canvas,
    direction: first,
    mode: "edit",
    plan: false,
    project,
  };
};

const probeOf = (
  deps: LinkInteractionRouteDeps,
  scope: CanvasToolContext
): LinkProbe | null => {
  if (!deps.preview) {
    return null;
  }

  return (
    probeWithPreview(
      deps.preview,
      scope.project,
      scope.direction,
      deps.frameStates
    ) ?? null
  );
};

const registerLinkInteractionRoutes = (
  app: Hono,
  deps: LinkInteractionRouteDeps
): void => {
  app.post(INTERACTION_PATH, async (ctx) => {
    const parsed = linkInteractionSchema.safeParse(await deps.readBody(ctx));

    if (!parsed.success) {
      return invalid(ctx, parsed.error);
    }

    const project = await deps.projects.get(ctx.req.param("pid"));
    const scope = scopeOf(deps, project);

    if (!scope) {
      const message = "The project has no direction.";

      return ctx.json({ error: "no_direction", message }, BAD_REQUEST);
    }

    const done = await setLinkInteraction(
      scope,
      toInteractionRequest(parsed.data),
      probeOf(deps, scope)
    );

    if (done.result.isError || !done.link) {
      const message = textOf(done.result);

      return ctx.json({ error: "link_interaction", message }, BAD_REQUEST);
    }

    const links = await deps.canvas.links.read(project);

    return ctx.json({ link: done.link, links });
  });
};

export { registerLinkInteractionRoutes };

export type { LinkInteractionRouteDeps };
