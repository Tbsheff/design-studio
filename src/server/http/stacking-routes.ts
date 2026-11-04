import type { Context, Hono } from "hono";
import { z } from "zod";

import type { Direction, Project } from "../../shared/contracts.js";
import type { StackingSetResult } from "../../shared/stacking.js";
import { DirectEditError } from "../direct-edit/engine/errors.js";
import type { DirectEditDeps } from "../direct-edit/index.js";
import {
  getStackingFields,
  setStackingFields,
} from "../platform/tool-fields/stacking.js";
import { StackingError } from "../stacking/errors.js";
import { getStacking } from "../stacking/get.js";
import { toStackingInput } from "../stacking/input.js";
import { setStacking, toStackingResult } from "../stacking/set.js";

interface StackingRouteDeps {
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

const STACKING_PATH = "/api/projects/:pid/d/:did/stacking";

const BAD_REQUEST = 400;

const FILE_MAX = 1000;

const SELECTOR_MAX = 2000;

const TAG_MAX = 100;

const NO_CHANGE =
  "Pass at least one of position, top, right, bottom, left, overflow, overflowX, overflowY or zIndex.";

const loc = z.strictObject({
  col: z.number().int().min(1),
  file: z.string().min(1).max(FILE_MAX),
  line: z.number().int().min(1),
});

const getQuery = z.strictObject({
  ...getStackingFields,
  col: z.coerce.number().int().min(1),
  file: z.string().min(1).max(FILE_MAX),
  line: z.coerce.number().int().min(1),
});

const target = z.strictObject({
  selector: z.string().max(SELECTOR_MAX).nullable().optional(),
  source: loc,
  tag: z.string().max(TAG_MAX).nullable().optional(),
});

const setBody = z.strictObject({ ...setStackingFields, target });

const invalid = (ctx: Context, message: string): Response =>
  ctx.json({ error: "invalid_request", message }, BAD_REQUEST);

const zodInvalid = (ctx: Context, error: z.ZodError): Response => {
  const [issue] = error.issues;
  const where = issue?.path.join(".") || "request";

  return invalid(ctx, `${where}: ${issue?.message ?? "not valid"}`);
};

const failed = (ctx: Context, error: Error): Response => {
  if (error instanceof StackingError) {
    return ctx.json(
      { error: "stacking_error", message: error.message },
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

const registerStackingGet = (app: Hono, deps: StackingRouteDeps): void => {
  app.get(STACKING_PATH, async (ctx) => {
    const parsed = getQuery.safeParse(ctx.req.query());

    if (!parsed.success) {
      return zodInvalid(ctx, parsed.error);
    }

    const { direction, project } = await deps.loadDirection(
      ctx.req.param("pid"),
      ctx.req.param("did")
    );

    const { breakpoint, col, file, line } = parsed.data;

    try {
      const info = await getStacking(
        { direction, project, workTree: direction.workTree },
        { breakpoint: breakpoint ?? "base", source: { col, file, line } }
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

const registerStackingSet = (app: Hono, deps: StackingRouteDeps): void => {
  app.post(STACKING_PATH, async (ctx) => {
    const parsed = setBody.safeParse(await deps.readBody(ctx));

    if (!parsed.success) {
      return zodInvalid(ctx, parsed.error);
    }

    const { target: where, ...fields } = parsed.data;
    const input = toStackingInput(fields);

    if (input === null) {
      return invalid(ctx, NO_CHANGE);
    }

    try {
      const result = await deps.withDirection(
        ctx.req.param("pid"),
        ctx.req.param("did"),
        async (project, direction): Promise<StackingSetResult> => {
          const done = await setStacking(
            deps.editDeps,
            { direction, project, workTree: direction.workTree },
            {
              input,
              target: {
                selector: where.selector ?? null,
                source: where.source,
                tag: where.tag ?? null,
              },
            }
          );

          return toStackingResult(done.plan, done.version);
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

const registerStackingRoutes = (app: Hono, deps: StackingRouteDeps): void => {
  registerStackingGet(app, deps);
  registerStackingSet(app, deps);
};

export { registerStackingRoutes };
