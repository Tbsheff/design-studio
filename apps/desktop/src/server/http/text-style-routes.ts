import type { Direction, Project } from "@design-studio/contracts";
import type { Context, Hono } from "hono";

import {
  TEXT_STYLE_LIST_DEFAULT,
  TEXT_STYLE_LIST_MAX,
  TEXT_STYLE_NAME,
  TEXT_STYLE_QUERY_MAX,
  TEXT_STYLE_VALUE_MAX,
} from "../../shared/text-styles.js";
import type {
  TextStyleApplyResult,
  TextStyleCreateResult,
} from "../../shared/text-styles.js";
import { DirectEditError } from "../direct-edit/index.js";
import type { DirectEditDeps } from "../direct-edit/index.js";
import { z } from "../platform/zod-bridge/index.js";
import { applyTextStyle } from "../text-styles/apply.js";
import { commitOne, guardEdit } from "../text-styles/commit.js";
import type { TextStyleEditScope } from "../text-styles/commit.js";
import { computedTextValues, createTextStyle } from "../text-styles/create.js";
import { createTextStyleDetach } from "../text-styles/detach.js";
import { listTextStyles, TextStyleError } from "../text-styles/list.js";

interface TextStyleRouteDeps {
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

interface TextStyleDetachResult {
  file: string;
  versionId: string;
}

type Edit<Input, Result> = (
  deps: DirectEditDeps,
  scope: TextStyleEditScope,
  input: Input
) => Promise<Result>;

const TEXT_STYLES_PATH = "/api/projects/:pid/d/:did/text-styles";
const BAD_REQUEST = 400;
const FILE_MAX = 1000;
const SELECTOR_MAX = 2000;
const TAG_MAX = 100;
const STYLE_KEYS_MAX = 40;

const listQuery = z.strictObject({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(TEXT_STYLE_LIST_MAX)
    .default(TEXT_STYLE_LIST_DEFAULT),
  query: z.string().trim().max(TEXT_STYLE_QUERY_MAX).optional(),
});

const loc = z.strictObject({
  col: z.number().int().min(1),
  file: z.string().min(1).max(FILE_MAX),
  line: z.number().int().min(1),
});

const target = z.strictObject({
  selector: z.string().max(SELECTOR_MAX).optional(),
  source: loc,
  tag: z.string().max(TAG_MAX).optional(),
});

const styleName = z.string().trim().regex(TEXT_STYLE_NAME);

const computed = z
  .record(z.string(), z.string().max(TEXT_STYLE_VALUE_MAX))
  .refine((value) => Object.keys(value).length <= STYLE_KEYS_MAX);

const applyBody = z.strictObject({ style: styleName, target });

const createBody = z.strictObject({ name: styleName, styles: computed });

const detachBody = z.strictObject({ styles: computed, target });

type ApplyInput = z.output<typeof applyBody>;

type CreateInput = z.output<typeof createBody>;

type DetachInput = z.output<typeof detachBody>;

const invalid = (ctx: Context, error: z.ZodError): Response => {
  const [issue] = error.issues;
  const where = issue?.path.join(".") || "request";
  const message = `${where}: ${issue?.message ?? "not valid"}`;

  return ctx.json({ error: "invalid_request", message }, BAD_REQUEST);
};

const failed = (ctx: Context, error: Error): Response => {
  if (error instanceof TextStyleError) {
    return ctx.json(
      { error: "text_style_error", message: error.message },
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

const runApply: Edit<ApplyInput, TextStyleApplyResult> = async (
  deps,
  scope,
  input
) => {
  const done = await applyTextStyle(deps, scope, input);

  return {
    classes: done.plan.classes,
    file: done.plan.written.target.relative,
    mode: done.plan.mode,
    style: done.plan.style.name,
    versionId: done.version.id,
  };
};

const runCreate: Edit<CreateInput, TextStyleCreateResult> = async (
  deps,
  scope,
  input
) => {
  const done = await createTextStyle(deps, scope, {
    name: input.name,
    values: computedTextValues(input.styles),
  });

  return {
    file: done.plan.written.target.relative,
    name: done.plan.name,
    source: done.plan.source,
    values: done.plan.values,
    versionId: done.version.id,
  };
};

const runDetach: Edit<DetachInput, TextStyleDetachResult> = async (
  deps,
  scope,
  input
) => {
  guardEdit(deps, scope);

  const written = await createTextStyleDetach(scope, {
    styles: input.styles,
    target: {
      selector: input.target.selector ?? null,
      source: input.target.source,
      tag: input.target.tag ?? null,
    },
  });

  const version = await commitOne(deps, scope, written, "Detach text style");

  return { file: written.target.relative, versionId: version.id };
};

const registerTextStyleList = (app: Hono, deps: TextStyleRouteDeps): void => {
  app.get(TEXT_STYLES_PATH, async (ctx) => {
    const parsed = listQuery.safeParse(ctx.req.query());

    if (!parsed.success) {
      return invalid(ctx, parsed.error);
    }

    const { direction } = await deps.loadDirection(
      ctx.req.param("pid"),
      ctx.req.param("did")
    );

    try {
      const list = await listTextStyles(
        { workTree: direction.workTree },
        parsed.data
      );

      return ctx.json(list);
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      return failed(ctx, error);
    }
  });
};

interface EditRoute<Input, Result> {
  action: string;
  run: Edit<Input, Result>;
  schema: z.ZodType<Input>;
}

const registerEdit = <Input, Result>(
  app: Hono,
  deps: TextStyleRouteDeps,
  { action, run, schema }: EditRoute<Input, Result>
): void => {
  app.post(`${TEXT_STYLES_PATH}/${action}`, async (ctx) => {
    const parsed = schema.safeParse(await deps.readBody(ctx));

    if (!parsed.success) {
      return invalid(ctx, parsed.error);
    }

    try {
      const result = await deps.withDirection(
        ctx.req.param("pid"),
        ctx.req.param("did"),
        (project, direction) => {
          const scope: TextStyleEditScope = {
            direction,
            project,
            workTree: direction.workTree,
          };

          return run(deps.editDeps, scope, parsed.data);
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

const registerTextStyleRoutes = (app: Hono, deps: TextStyleRouteDeps): void => {
  registerTextStyleList(app, deps);
  registerEdit(app, deps, {
    action: "apply",
    run: runApply,
    schema: applyBody,
  });
  registerEdit(app, deps, {
    action: "create",
    run: runCreate,
    schema: createBody,
  });
  registerEdit(app, deps, {
    action: "detach",
    run: runDetach,
    schema: detachBody,
  });
};

export { registerTextStyleRoutes };

export type { TextStyleDetachResult };
