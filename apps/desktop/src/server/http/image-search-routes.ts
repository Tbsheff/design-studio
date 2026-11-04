import type { Context, Hono } from "hono";

import type {
  Direction,
  Project,
  ProjectSettings,
} from "../../shared/contracts.js";
import { IMAGE_SEARCH_LIMIT_MAX } from "../../shared/image-search.js";
import type { PlaceImageResult } from "../../shared/image-search.js";
import { DirectEditError } from "../direct-edit/engine/index.js";
import type { DirectEditDeps } from "../direct-edit/index.js";
import { previewOriginOf } from "../direct-edit/index.js";
import { ImageSearchError } from "../image-search/errors.js";
import { IMAGE_SEARCH_OFF, isImageSearchOn } from "../image-search/gate.js";
import { toPlaceInput, toSearchRequest } from "../image-search/input.js";
import { placeImage } from "../image-search/place.js";
import { searchImages } from "../image-search/search.js";
import type { PlaceTarget } from "../image-search/target.js";
import {
  placeImageFields,
  searchImagesFields,
} from "../image-search/tool-fields.js";
import { imageSearchEnv } from "../platform/config/index.js";
import { z } from "../platform/zod-bridge/index.js";
import type { PreviewService } from "../types.js";

interface ImageSearchProjects {
  readonly get: (projectId: string) => Promise<Project>;
  readonly updateSettings: (
    projectId: string,
    patch: Partial<ProjectSettings>
  ) => Promise<Project>;
}

interface ImageSearchRouteDeps {
  readonly editDeps: DirectEditDeps;
  readonly preview: PreviewService;
  readonly projects: ImageSearchProjects;
  readonly readBody: (ctx: Context) => Promise<object>;
  readonly withDirection: <Result>(
    projectId: string,
    directionId: string,
    task: (project: Project, direction: Direction) => Promise<Result>
  ) => Promise<Result>;
}

interface ImageSearchStatus {
  readonly env: boolean;
  readonly message: string | null;
  readonly on: boolean;
  readonly setting: boolean;
}

const STATUS_PATH = "/api/projects/:pid/image-search";

const SETTING_PATH = "/api/projects/:pid/image-search/setting";

const PHOTOS_PATH = "/api/projects/:pid/image-search/photos";

const PLACE_PATH = "/api/projects/:pid/d/:did/image-search/place";

const BAD_REQUEST = 400;

const FILE_MAX = 1000;

const SELECTOR_MAX = 2000;

const TAG_MAX = 100;

const HTML_MAX = 4000;

const OWNERS_MAX = 20;

const searchQuery = z.strictObject({
  ...searchImagesFields,
  limit: z.coerce.number().int().min(1).max(IMAGE_SEARCH_LIMIT_MAX).optional(),
});

const settingBody = z.strictObject({ on: z.boolean() });

const loc = z.strictObject({
  col: z.number().int().min(1),
  file: z.string().min(1).max(FILE_MAX),
  line: z.number().int().min(1),
});

const owner = z.object({ name: z.string(), stack: z.string() });

const target = z.object({
  background: z.boolean().optional(),
  html: z.string().max(HTML_MAX).optional(),
  owners: z.array(owner).max(OWNERS_MAX).optional(),
  selector: z.string().max(SELECTOR_MAX).nullable().optional(),
  source: loc.nullable().optional(),
  tag: z.string().max(TAG_MAX),
});

const placeBody = z.strictObject({ ...placeImageFields, target });

const invalid = (ctx: Context, message: string): Response =>
  ctx.json({ error: "invalid_request", message }, BAD_REQUEST);

const zodInvalid = (ctx: Context, error: z.ZodError): Response => {
  const [issue] = error.issues;
  const where = issue?.path.join(".") || "request";

  return invalid(ctx, `${where}: ${issue?.message ?? "not valid"}`);
};

const searchError = (ctx: Context, error: ImageSearchError): Response => {
  if (error.message === IMAGE_SEARCH_OFF) {
    return ctx.json(
      { error: "image_search_off", message: error.message },
      BAD_REQUEST
    );
  }

  return ctx.json(
    { error: "image_search_error", message: error.message },
    BAD_REQUEST
  );
};

const failed = (ctx: Context, error: Error): Response => {
  if (error instanceof ImageSearchError) {
    return searchError(ctx, error);
  }

  if (error instanceof DirectEditError) {
    return ctx.json(
      { error: error.code, message: error.message },
      error.status
    );
  }

  throw error;
};

const isSettingOn = (project: Project): boolean =>
  Object.entries(project.settings).some(
    ([key, value]) => key === "imageSearch" && value === true
  );

const statusOf = (project: Project): ImageSearchStatus => {
  const on = isImageSearchOn(project);
  const env = imageSearchEnv().trim().toLowerCase() === "on";
  const setting = isSettingOn(project);

  let message: string | null = IMAGE_SEARCH_OFF;

  if (on) {
    message = null;
  }

  return { env, message, on, setting };
};

const toPlaceTarget = (where: z.output<typeof target>): PlaceTarget =>
  where as PlaceTarget;

const registerStatus = (app: Hono, deps: ImageSearchRouteDeps): void => {
  app.get(STATUS_PATH, async (ctx) => {
    const project = await deps.projects.get(ctx.req.param("pid"));

    return ctx.json(statusOf(project));
  });

  app.post(SETTING_PATH, async (ctx) => {
    const parsed = settingBody.safeParse(await deps.readBody(ctx));

    if (!parsed.success) {
      return zodInvalid(ctx, parsed.error);
    }

    const pid = ctx.req.param("pid");
    await deps.projects.get(pid);

    const patch = { imageSearch: parsed.data.on } as Partial<ProjectSettings>;
    const project = await deps.projects.updateSettings(pid, patch);

    return ctx.json(statusOf(project));
  });
};

const registerSearch = (app: Hono, deps: ImageSearchRouteDeps): void => {
  app.get(PHOTOS_PATH, async (ctx) => {
    const parsed = searchQuery.safeParse(ctx.req.query());

    if (!parsed.success) {
      return zodInvalid(ctx, parsed.error);
    }

    const project = await deps.projects.get(ctx.req.param("pid"));

    try {
      return ctx.json(
        await searchImages(project, toSearchRequest(parsed.data))
      );
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      return failed(ctx, error);
    }
  });
};

const registerPlace = (app: Hono, deps: ImageSearchRouteDeps): void => {
  app.post(PLACE_PATH, async (ctx) => {
    const parsed = placeBody.safeParse(await deps.readBody(ctx));

    if (!parsed.success) {
      return zodInvalid(ctx, parsed.error);
    }

    const { target: where, ...fields } = parsed.data;

    try {
      const result = await deps.withDirection(
        ctx.req.param("pid"),
        ctx.req.param("did"),
        async (project, direction): Promise<PlaceImageResult> => {
          const previewOrigin = await previewOriginOf(
            deps.preview,
            project,
            direction
          );

          const { workTree } = direction;

          const done = await placeImage(
            deps.editDeps,
            { direction, previewOrigin, project, workTree },
            toPlaceInput(fields),
            toPlaceTarget(where)
          );

          return done.result;
        }
      );

      return ctx.json(result);
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      return failed(ctx, error);
    }
  });
};

const registerImageSearchRoutes = (
  app: Hono,
  deps: ImageSearchRouteDeps
): void => {
  registerStatus(app, deps);
  registerSearch(app, deps);
  registerPlace(app, deps);
};

export { registerImageSearchRoutes };

export type { ImageSearchRouteDeps, ImageSearchStatus };
