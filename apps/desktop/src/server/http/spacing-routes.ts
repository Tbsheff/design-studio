import type { Direction, Project } from "@design-studio/contracts";
import {
  SPACING_PROPERTIES,
  SPACING_PX_MAX,
  SPACING_SIDES,
  SPACING_TOKEN,
} from "@design-studio/contracts/spacing";
import type {
  SpacingInfo,
  SpacingInput,
  SpacingSetResult,
} from "@design-studio/contracts/spacing";
import type { Context, Hono } from "hono";

import { DirectEditError, lengthToPx } from "../direct-edit/engine/index.js";
import type { DirectEditDeps } from "../direct-edit/index.js";
import { z } from "../platform/zod-bridge/index.js";
import type { SpacingScope } from "../spacing/commit.js";
import { SpacingError } from "../spacing/errors.js";
import { inspectSpacing } from "../spacing/get.js";
import type { SpacingElement } from "../spacing/get.js";
import { applySpacing, toSpacingResult } from "../spacing/set.js";
import { loadSpacingSite } from "../spacing/site.js";
import type { SpacingSite } from "../spacing/site.js";

interface SpacingRouteDeps {
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

interface SpacingStep {
  readonly px: number;
  readonly token: string;
}

interface SpacingBoxReply extends SpacingInfo {
  readonly scale: readonly SpacingStep[];
}

const SPACING_PATH = "/api/projects/:pid/d/:did/spacing";
const BAD_REQUEST = 400;
const FILE_MAX = 1000;
const SELECTOR_MAX = 2000;
const TAG_MAX = 100;
const STYLE_MAX = 200;
const STEP_FINE = 24;
const STEP_COARSE_EVERY = 4;
const STEP_MAX = 96;
const EMPTY_RECT = { height: 0, width: 0, x: 0, y: 0 };

const loc = z.strictObject({
  col: z.number().int().min(1),
  file: z.string().min(1).max(FILE_MAX),
  line: z.number().int().min(1),
});

const getQuery = z.strictObject({
  col: z.coerce.number().int().min(1),
  file: z.string().min(1).max(FILE_MAX),
  gap: z.string().max(STYLE_MAX).optional(),
  line: z.coerce.number().int().min(1),
  margin: z.string().max(STYLE_MAX).optional(),
  padding: z.string().max(STYLE_MAX).optional(),
});

const target = z.strictObject({
  selector: z.string().max(SELECTOR_MAX).optional(),
  source: loc,
  tag: z.string().max(TAG_MAX).optional(),
});

const spacing = z.strictObject({
  property: z.enum(SPACING_PROPERTIES),
  side: z.enum(SPACING_SIDES).default("all"),
  snap: z.boolean().default(false),
  token: z.string().trim().regex(SPACING_TOKEN).optional(),
  value: z.number().min(-SPACING_PX_MAX).max(SPACING_PX_MAX).optional(),
});

const setBody = z.strictObject({ spacing, target });

type GetQuery = z.output<typeof getQuery>;

type SetBody = z.output<typeof setBody>;

const invalid = (ctx: Context, error: z.ZodError): Response => {
  const [issue] = error.issues;
  const where = issue?.path.join(".") || "request";
  const message = `${where}: ${issue?.message ?? "not valid"}`;

  return ctx.json({ error: "invalid_request", message }, BAD_REQUEST);
};

const failed = (ctx: Context, error: Error): Response => {
  if (error instanceof SpacingError) {
    return ctx.json(
      { error: "spacing_error", message: error.message },
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

const scaleSteps = (): number[] => {
  const fine = Array.from({ length: STEP_FINE + 1 }, (_slot, step) => step);

  const coarse = Array.from(
    { length: (STEP_MAX - STEP_FINE) / STEP_COARSE_EVERY },
    (_slot, index) => STEP_FINE + (index + 1) * STEP_COARSE_EVERY
  );

  return [...fine, ...coarse];
};

const themeScale = (site: SpacingSite): SpacingStep[] => {
  const { theme } = site;

  if (!theme || site.mode !== "classes") {
    return [];
  }

  const steps = scaleSteps().map((step) => ({
    px: step * theme.spacingPx,
    token: String(step),
  }));

  const named = [...theme.spacing].map(([token, px]) => ({ px, token }));

  return [...steps, ...named];
};

const entryScale = (site: SpacingSite): SpacingStep[] =>
  site.entries.flatMap((entry) => {
    const px = lengthToPx(entry.value);

    if (entry.type !== "dimension" || px === null || px < 0) {
      return [];
    }

    return [{ px, token: entry.path }];
  });

const scaleOf = (site: SpacingSite): SpacingStep[] => {
  const steps = themeScale(site);

  if (steps.length > 0) {
    return steps;
  }

  return entryScale(site);
};

const elementOf = (query: GetQuery): SpacingElement => ({
  rect: EMPTY_RECT,
  styles: {
    gap: query.gap ?? "",
    margin: query.margin ?? "",
    padding: query.padding ?? "",
  },
});

const readBox = async (
  scope: SpacingScope,
  query: GetQuery
): Promise<SpacingBoxReply> => {
  const source = { col: query.col, file: query.file, line: query.line };

  const [info, site] = await Promise.all([
    inspectSpacing(scope, source, elementOf(query)),
    loadSpacingSite(scope, source),
  ]);

  return { ...info, scale: scaleOf(site) };
};

const inputOf = (body: SetBody): SpacingInput => ({
  property: body.spacing.property,
  side: body.spacing.side,
  snap: body.spacing.snap,
  token: body.spacing.token ?? null,
  value: body.spacing.value ?? null,
});

const registerSpacingGet = (app: Hono, deps: SpacingRouteDeps): void => {
  app.get(SPACING_PATH, async (ctx) => {
    const parsed = getQuery.safeParse(ctx.req.query());

    if (!parsed.success) {
      return invalid(ctx, parsed.error);
    }

    const { direction, project } = await deps.loadDirection(
      ctx.req.param("pid"),
      ctx.req.param("did")
    );

    try {
      const scope = { direction, project, workTree: direction.workTree };

      return ctx.json(await readBox(scope, parsed.data));
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      return failed(ctx, error);
    }
  });
};

const writeBox = (
  deps: SpacingRouteDeps,
  body: SetBody,
  ids: { readonly did: string; readonly pid: string }
): Promise<SpacingSetResult> =>
  deps.withDirection(ids.pid, ids.did, async (project, direction) => {
    const scope: SpacingScope = {
      direction,
      project,
      workTree: direction.workTree,
    };

    const done = await applySpacing(deps.editDeps, scope, {
      input: inputOf(body),
      target: {
        selector: body.target.selector ?? null,
        source: body.target.source,
        tag: body.target.tag ?? null,
      },
    });

    return toSpacingResult(done.plan, done.version);
  });

const registerSpacingSet = (app: Hono, deps: SpacingRouteDeps): void => {
  app.post(SPACING_PATH, async (ctx) => {
    const parsed = setBody.safeParse(await deps.readBody(ctx));

    if (!parsed.success) {
      return invalid(ctx, parsed.error);
    }

    try {
      const ids = { did: ctx.req.param("did"), pid: ctx.req.param("pid") };

      return ctx.json(await writeBox(deps, parsed.data, ids));
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      return failed(ctx, error);
    }
  });
};

const registerSpacingRoutes = (app: Hono, deps: SpacingRouteDeps): void => {
  registerSpacingGet(app, deps);
  registerSpacingSet(app, deps);
};

export { registerSpacingRoutes };

export type { SpacingBoxReply, SpacingStep };
