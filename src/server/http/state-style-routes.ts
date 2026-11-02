import type { Context, Hono } from "hono";
import { z } from "zod";

import type { Direction, Project } from "../../shared/contracts.js";
import type { StateStyleResult } from "../../shared/state-styles.js";
import type { CanvasService } from "../canvas/index.js";
import { DirectEditError } from "../direct-edit/engine/errors.js";
import type { DirectEditDeps } from "../direct-edit/index.js";
import { StateStyleError } from "../state-styles/errors.js";
import { setForcedState } from "../state-styles/forced.js";
import {
  forcedStateFields,
  setStateFields,
  toStateInput,
} from "../state-styles/input.js";
import { listStateStyles } from "../state-styles/list.js";
import { setStateStyle, toStateResult } from "../state-styles/set.js";

interface StateStyleRouteDeps {
  canvas: CanvasService;
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

const STATE_PATH = "/api/projects/:pid/d/:did/state-styles";
const FORCED_PATH = `${STATE_PATH}/forced`;
const BAD_REQUEST = 400;
const FILE_MAX = 1000;
const SELECTOR_MAX = 2000;
const TAG_MAX = 100;

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
  selector: z.string().max(SELECTOR_MAX).nullable().optional(),
  source: loc,
  tag: z.string().max(TAG_MAX).nullable().optional(),
});

const setBody = z.strictObject({ ...setStateFields, target });

const forcedBody = z.strictObject({
  ...forcedStateFields,
  frameId: forcedStateFields.frameId.optional(),
});

type ForcedBody = z.output<typeof forcedBody>;

const invalid = (ctx: Context, error: z.ZodError): Response => {
  const [issue] = error.issues;
  const where = issue?.path.join(".") || "request";
  const message = `${where}: ${issue?.message ?? "not valid"}`;

  return ctx.json({ error: "invalid_request", message }, BAD_REQUEST);
};

const failed = (ctx: Context, error: Error): Response => {
  if (error instanceof StateStyleError) {
    return ctx.json(
      { error: "state_style_error", message: error.message },
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

const registerStateList = (app: Hono, deps: StateStyleRouteDeps): void => {
  app.get(STATE_PATH, async (ctx) => {
    const parsed = listQuery.safeParse(ctx.req.query());

    if (!parsed.success) {
      return invalid(ctx, parsed.error);
    }

    const { direction, project } = await deps.loadDirection(
      ctx.req.param("pid"),
      ctx.req.param("did")
    );

    try {
      const info = await listStateStyles(
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

const registerStateSet = (app: Hono, deps: StateStyleRouteDeps): void => {
  app.post(STATE_PATH, async (ctx) => {
    const parsed = setBody.safeParse(await deps.readBody(ctx));

    if (!parsed.success) {
      return invalid(ctx, parsed.error);
    }

    const { target: where, ...fields } = parsed.data;

    try {
      const result = await deps.withDirection(
        ctx.req.param("pid"),
        ctx.req.param("did"),
        async (project, direction): Promise<StateStyleResult> => {
          const done = await setStateStyle(
            deps.editDeps,
            { direction, project, workTree: direction.workTree },
            {
              input: toStateInput(fields),
              target: {
                selector: where.selector ?? null,
                source: where.source,
                tag: where.tag ?? null,
              },
            }
          );

          return toStateResult(done.plan, done.version);
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

const frameFor = (
  frames: readonly { readonly directionId?: string; readonly id: string }[],
  directionId: string,
  body: ForcedBody
): string => {
  if (body.frameId) {
    return body.frameId;
  }

  const bound = frames.find((frame) => frame.directionId === directionId);

  return bound?.id ?? frames[0]?.id ?? "f1";
};

const registerStateForced = (app: Hono, deps: StateStyleRouteDeps): void => {
  app.post(FORCED_PATH, async (ctx) => {
    const parsed = forcedBody.safeParse(await deps.readBody(ctx));

    if (!parsed.success) {
      return invalid(ctx, parsed.error);
    }

    const directionId = ctx.req.param("did");

    const { project } = await deps.loadDirection(
      ctx.req.param("pid"),
      directionId
    );

    const snapshot = await deps.canvas.read(project);
    const canvasFrames = snapshot.canvas?.frames ?? [];

    try {
      const forced = setForcedState({
        frameId: frameFor(canvasFrames, directionId, parsed.data),
        frames: canvasFrames,
        layer: parsed.data.layer ?? null,
        projectId: project.id,
        state: parsed.data.state,
      });

      return ctx.json(forced);
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      return failed(ctx, error);
    }
  });
};

const registerStateStyleRoutes = (
  app: Hono,
  deps: StateStyleRouteDeps
): void => {
  registerStateList(app, deps);
  registerStateSet(app, deps);
  registerStateForced(app, deps);
};

export { registerStateStyleRoutes };
