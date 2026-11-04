import type { Direction, Project } from "@design-studio/contracts";
import type { Context, Hono } from "hono";

import type { TextUpdateResult } from "../../shared/text-search.js";
import type { CanvasService } from "../canvas/index.js";
import type { DirectEditDeps } from "../direct-edit/index.js";
import { z } from "../platform/zod-bridge/index.js";
import { TextSearchError } from "../text-search/errors.js";
import { toSearchQuery, toUpdateRequest } from "../text-search/input.js";
import type { SearchTarget } from "../text-search/scope.js";
import { searchText } from "../text-search/search-text.js";
import {
  searchTextFields,
  updateTextFields,
} from "../text-search/tool-fields.js";
import { updateText } from "../text-search/update-text.js";

interface Located {
  readonly direction: Direction;
  readonly project: Project;
}

interface RouteIds {
  readonly did: string;
  readonly pid: string;
}

interface TextSearchRouteDeps {
  readonly canvas: CanvasService;
  readonly editDeps: DirectEditDeps;
  readonly loadDirection: (pid: string, did: string) => Promise<Located>;
  readonly readBody: (ctx: Context) => Promise<object>;
  readonly withDirection: <Result>(
    projectId: string,
    directionId: string,
    task: (project: Project, direction: Direction) => Promise<Result>
  ) => Promise<Result>;
}

const SEARCH_PATH = "/api/projects/:pid/d/:did/search-text";

const UPDATE_PATH = "/api/projects/:pid/d/:did/update-text";

const BAD_REQUEST = 400;

const CONFLICT = 409;

const CLIENT = "ui";

const RUN_BUSY =
  "An agent run is working on this direction. Wait for it to end, then replace the text.";

const flag = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => value === "true");

const searchQuery = z.strictObject({
  caseSensitive: flag,
  glob: searchTextFields.glob,
  query: searchTextFields.query,
  regex: flag,
  wholeWord: flag,
});

const updateBody = z.strictObject(updateTextFields);

const invalid = (ctx: Context, error: z.ZodError): Response => {
  const [issue] = error.issues;
  const where = issue?.path.join(".") || "request";
  const message = `${where}: ${issue?.message ?? "not valid"}`;

  return ctx.json({ error: "invalid_request", message }, BAD_REQUEST);
};

const targetOf = async (
  deps: TextSearchRouteDeps,
  found: Located
): Promise<SearchTarget> => {
  const snapshot = await deps.canvas.read(found.project);

  return {
    direction: found.direction,
    frames: snapshot.canvas?.frames ?? [],
    project: found.project,
  };
};

const idsOf = (ctx: Context): RouteIds => ({
  did: ctx.req.param("did") ?? "",
  pid: ctx.req.param("pid") ?? "",
});

const searchFailed = (ctx: Context, error: Error): Response => {
  if (error instanceof TextSearchError) {
    return ctx.json(
      { error: "text_search", message: error.message },
      BAD_REQUEST
    );
  }

  throw error;
};

const runUpdate = (
  deps: TextSearchRouteDeps,
  ids: RouteIds,
  body: z.output<typeof updateBody>
): Promise<TextUpdateResult | null> =>
  deps.withDirection(ids.pid, ids.did, async (project, direction) => {
    if (deps.editDeps.runner.isRunning(project.id, direction.id)) {
      return null;
    }

    const target = await targetOf(deps, { direction, project });

    const done = await updateText(target, toUpdateRequest(body), {
      client: CLIENT,
      deps: deps.editDeps,
      history: deps.editDeps.history ?? null,
    });

    return done.result;
  });

const registerSearch = (app: Hono, deps: TextSearchRouteDeps): void => {
  app.get(SEARCH_PATH, async (ctx) => {
    const parsed = searchQuery.safeParse(ctx.req.query());

    if (!parsed.success) {
      return invalid(ctx, parsed.error);
    }

    const ids = idsOf(ctx);

    try {
      const target = await targetOf(
        deps,
        await deps.loadDirection(ids.pid, ids.did)
      );

      return ctx.json(await searchText(target, toSearchQuery(parsed.data)));
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      return searchFailed(ctx, error);
    }
  });
};

const registerUpdate = (app: Hono, deps: TextSearchRouteDeps): void => {
  app.post(UPDATE_PATH, async (ctx) => {
    const parsed = updateBody.safeParse(await deps.readBody(ctx));

    if (!parsed.success) {
      return invalid(ctx, parsed.error);
    }

    try {
      const result = await runUpdate(deps, idsOf(ctx), parsed.data);

      if (result === null) {
        return ctx.json({ error: "run_busy", message: RUN_BUSY }, CONFLICT);
      }

      return ctx.json(result);
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      return searchFailed(ctx, error);
    }
  });
};

const registerTextSearchRoutes = (
  app: Hono,
  deps: TextSearchRouteDeps
): void => {
  registerSearch(app, deps);
  registerUpdate(app, deps);
};

export { registerTextSearchRoutes };

export type { TextSearchRouteDeps };
