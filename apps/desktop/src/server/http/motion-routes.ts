import type { Context, Hono } from "hono";

import type { Direction, Project } from "@design-studio/actions/_core/contracts";
import {
  ENTRANCE_PRESETS,
  MOTION_DELAY_MAX,
  MOTION_DURATION_MAX,
  MOTION_KINDS,
  MOTION_PROPERTIES_MAX,
  MOTION_PROPERTY,
  MOTION_STAGGER_MAX,
  MOTION_STATES,
  MOTION_VALUE,
} from "../../shared/motion.js";
import type { MotionSetResult } from "../../shared/motion.js";
import { DirectEditError } from "../direct-edit/index.js";
import type { DirectEditDeps } from "../direct-edit/index.js";
import type { MotionEditScope } from "../motion/commit.js";
import { listMotion } from "../motion/list.js";
import { setMotion } from "../motion/set.js";
import { MotionError } from "../motion/site.js";
import { specOf } from "../motion/spec.js";
import { z } from "../platform/zod-bridge/index.js";

interface MotionRouteDeps {
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

const MOTION_PATH = "/api/projects/:pid/d/:did/motion";
const BAD_REQUEST = 400;
const FILE_MAX = 1000;
const SELECTOR_MAX = 2000;
const TAG_MAX = 100;
const EASING_MAX = 80;

const ms = (max: number): z.ZodOptional<z.ZodNumber> =>
  z.number().int().min(0).max(max).optional();

const loc = z.strictObject({
  col: z.number().int().min(1),
  file: z.string().min(1).max(FILE_MAX),
  line: z.number().int().min(1),
});

const listQuery = z.strictObject({
  col: z.coerce.number().int().min(1),
  file: z.string().min(1).max(FILE_MAX),
  line: z.coerce.number().int().min(1),
});

const target = z.strictObject({
  selector: z.string().max(SELECTOR_MAX).optional(),
  source: loc,
  tag: z.string().max(TAG_MAX).optional(),
});

const spec = z.strictObject({
  delayMs: ms(MOTION_DELAY_MAX),
  durationMs: ms(MOTION_DURATION_MAX),
  easing: z.string().trim().max(EASING_MAX).optional(),
  end: z
    .record(z.string().regex(MOTION_PROPERTY), z.string().regex(MOTION_VALUE))
    .optional(),
  kind: z.enum(MOTION_KINDS),
  preset: z.enum(ENTRANCE_PRESETS).optional(),
  properties: z
    .array(z.string().regex(MOTION_PROPERTY))
    .max(MOTION_PROPERTIES_MAX)
    .optional(),
  staggerMs: ms(MOTION_STAGGER_MAX),
  state: z.enum(MOTION_STATES).optional(),
});

const setBody = z.strictObject({ spec, target });

const invalid = (ctx: Context, error: z.ZodError): Response => {
  const [issue] = error.issues;
  const where = issue?.path.join(".") || "request";
  const message = `${where}: ${issue?.message ?? "not valid"}`;

  return ctx.json({ error: "invalid_request", message }, BAD_REQUEST);
};

const failed = (ctx: Context, error: Error): Response => {
  if (error instanceof MotionError) {
    return ctx.json(
      { error: "motion_error", message: error.message },
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

const registerMotionList = (app: Hono, deps: MotionRouteDeps): void => {
  app.get(MOTION_PATH, async (ctx) => {
    const parsed = listQuery.safeParse(ctx.req.query());

    if (!parsed.success) {
      return invalid(ctx, parsed.error);
    }

    const { direction, project } = await deps.loadDirection(
      ctx.req.param("pid"),
      ctx.req.param("did")
    );

    try {
      const info = await listMotion(
        { project, workTree: direction.workTree },
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

const registerMotionSet = (app: Hono, deps: MotionRouteDeps): void => {
  app.post(MOTION_PATH, async (ctx) => {
    const parsed = setBody.safeParse(await deps.readBody(ctx));

    if (!parsed.success) {
      return invalid(ctx, parsed.error);
    }

    try {
      const result = await deps.withDirection(
        ctx.req.param("pid"),
        ctx.req.param("did"),
        async (project, direction): Promise<MotionSetResult> => {
          const scope: MotionEditScope = {
            direction,
            project,
            workTree: direction.workTree,
          };

          const done = await setMotion(deps.editDeps, scope, {
            spec: specOf(parsed.data.spec),
            target: parsed.data.target,
          });

          return {
            classes: done.plan.classes,
            files: done.plan.written.map((entry) => entry.target.relative),
            kind: done.plan.kind,
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

const registerMotionRoutes = (app: Hono, deps: MotionRouteDeps): void => {
  registerMotionList(app, deps);
  registerMotionSet(app, deps);
};

export { registerMotionRoutes };
