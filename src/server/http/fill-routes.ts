import type { Context, Hono } from "hono";
import { z } from "zod";

import type { Direction, Project } from "../../shared/contracts.js";
import {
  BLEND_MODES,
  BLEND_PROPERTIES,
  FILL_ANGLE_MAX,
  FILL_AT,
  FILL_COLOR,
  FILL_STOPS_MAX,
  FILL_STOPS_MIN,
  FILL_TOKEN,
  FILL_TYPES,
  RADIAL_FORMS,
} from "../../shared/fill.js";
import type { FillBlend, FillSpec } from "../../shared/fill.js";
import { DirectEditError } from "../direct-edit/index.js";
import type { DirectEditDeps } from "../direct-edit/index.js";
import type { FillEditScope } from "../fill/commit.js";
import { FillError } from "../fill/errors.js";
import { getFill } from "../fill/get.js";
import { setFill } from "../fill/set.js";

interface FillRouteDeps {
  editDeps: DirectEditDeps;
  readBody: (ctx: Context) => Promise<object>;
  loadDirection: (
    projectId: string,
    directionId: string
  ) => Promise<{ project: Project; direction: Direction }>;
  withDirection: <Result>(
    projectId: string,
    directionId: string,
    task: (project: Project, direction: Direction) => Promise<Result>
  ) => Promise<Result>;
}

interface FillSetReply {
  blend: FillBlend | null;
  files: string[];
  fill: FillSpec;
  mode: "classes" | "css";
  versionId: string;
}

const FILL_PATH = "/api/projects/:pid/d/:did/fill";
const BAD_REQUEST = 400;
const FILE_MAX = 1000;
const SELECTOR_MAX = 2000;
const TAG_MAX = 100;
const PERCENT_MAX = 100;

const loc = z.strictObject({
  col: z.number().int().min(1),
  file: z.string().min(1).max(FILE_MAX),
  line: z.number().int().min(1),
});

const getQuery = z.strictObject({
  col: z.coerce.number().int().min(1),
  file: z.string().min(1).max(FILE_MAX),
  line: z.coerce.number().int().min(1),
});

const target = z.strictObject({
  selector: z.string().max(SELECTOR_MAX).optional(),
  source: loc,
  tag: z.string().max(TAG_MAX).optional(),
});

const colorField = z.string().trim().regex(FILL_COLOR).optional();
const tokenField = z.string().trim().regex(FILL_TOKEN).optional();

const stop = z.strictObject({
  color: colorField,
  position: z.number().min(0).max(PERCENT_MAX).optional(),
  token: tokenField,
});

const fill = z.strictObject({
  angle: z.number().min(-FILL_ANGLE_MAX).max(FILL_ANGLE_MAX).optional(),
  at: z.string().trim().regex(FILL_AT).optional(),
  blendMode: z.enum(BLEND_MODES).optional(),
  blendProperty: z.enum(BLEND_PROPERTIES).optional(),
  color: colorField,
  form: z.enum(RADIAL_FORMS).optional(),
  stops: z.array(stop).min(FILL_STOPS_MIN).max(FILL_STOPS_MAX).optional(),
  token: tokenField,
  type: z.enum(FILL_TYPES),
});

const setBody = z.strictObject({ fill, target });

const invalid = (ctx: Context, error: z.ZodError): Response => {
  const [issue] = error.issues;
  const where = issue?.path.join(".") || "request";
  const message = `${where}: ${issue?.message ?? "not valid"}`;

  return ctx.json({ error: "invalid_request", message }, BAD_REQUEST);
};

const failed = (ctx: Context, error: Error): Response => {
  if (error instanceof FillError) {
    return ctx.json(
      { error: "fill_error", message: error.message },
      BAD_REQUEST
    );
  }

  if (error instanceof DirectEditError) {
    return ctx.json(
      { error: error.code, message: error.message },
      error.status
    );
  }

  throw error;
};

const registerFillGet = (app: Hono, deps: FillRouteDeps): void => {
  app.get(FILL_PATH, async (ctx) => {
    const parsed = getQuery.safeParse(ctx.req.query());

    if (!parsed.success) {
      return invalid(ctx, parsed.error);
    }

    const { direction, project } = await deps.loadDirection(
      ctx.req.param("pid"),
      ctx.req.param("did")
    );

    try {
      const info = await getFill(
        { direction, project, workTree: direction.workTree },
        parsed.data
      );

      return ctx.json(info);
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      return failed(ctx, error);
    }
  });
};

const registerFillSet = (app: Hono, deps: FillRouteDeps): void => {
  app.post(FILL_PATH, async (ctx) => {
    const parsed = setBody.safeParse(await deps.readBody(ctx));

    if (!parsed.success) {
      return invalid(ctx, parsed.error);
    }

    try {
      const result = await deps.withDirection(
        ctx.req.param("pid"),
        ctx.req.param("did"),
        async (project, direction): Promise<FillSetReply> => {
          const scope: FillEditScope = {
            direction,
            project,
            workTree: direction.workTree,
          };

          const done = await setFill(deps.editDeps, scope, {
            input: parsed.data.fill,
            target: parsed.data.target,
          });

          return {
            blend: done.plan.blend,
            files: done.plan.written.map((entry) => entry.target.relative),
            fill: done.plan.fill,
            mode: done.plan.mode,
            versionId: done.version.id,
          };
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

const registerFillRoutes = (app: Hono, deps: FillRouteDeps): void => {
  registerFillGet(app, deps);
  registerFillSet(app, deps);
};

export { registerFillRoutes };

export type { FillSetReply };
