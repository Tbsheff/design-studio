import type { Context, Hono } from "hono";

import type { AccessibilitySetResult } from "../../shared/accessibility.js";
import type { CanvasFileFrame } from "../../shared/actions/_core/canvas-file.js";
import type { Direction, Project } from "../../shared/actions/_core/contracts.js";
import { AccessibilityError } from "../accessibility/errors.js";
import { frameOf } from "../accessibility/frame.js";
import type { AccessibilityFrame } from "../accessibility/frame.js";
import {
  NO_ACCESSIBILITY_CHANGE,
  toAccessibilityChanges,
} from "../accessibility/input.js";
import { inspectAccessibility } from "../accessibility/inspect.js";
import {
  setAccessibility,
  toAccessibilityResult,
} from "../accessibility/set.js";
import { setAccessibilityFields } from "../accessibility/tool-fields.js";
import type { CanvasService } from "../canvas/index.js";
import { readDesignSystemState } from "../design-system/state.js";
import { DirectEditError } from "../direct-edit/engine/index.js";
import type { DirectEditDeps } from "../direct-edit/index.js";
import { z } from "../platform/zod-bridge/index.js";
import { withPagePath } from "../project-source/source.js";
import type { PreviewService } from "../types.js";

interface AccessibilityRouteDeps {
  canvas: CanvasService;
  editDeps: DirectEditDeps;
  preview: PreviewService;
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

const ACCESSIBILITY_PATH = "/api/projects/:pid/d/:did/accessibility";

const BAD_REQUEST = 400;

const FILE_MAX = 1000;

const SELECTOR_MAX = 2000;

const TAG_MAX = 100;

const FRAME_MAX = 60;

const loc = z.strictObject({
  col: z.number().int().min(1),
  file: z.string().min(1).max(FILE_MAX),
  line: z.number().int().min(1),
});

const getQuery = z.strictObject({
  frame: z.string().trim().min(1).max(FRAME_MAX).optional(),
  includePassing: z.enum(["true", "false"]).optional(),
  selector: z.string().trim().min(1).max(SELECTOR_MAX).optional(),
});

const target = z.strictObject({
  selector: z.string().max(SELECTOR_MAX).nullable().optional(),
  source: loc,
  tag: z.string().max(TAG_MAX).nullable().optional(),
  usedAt: loc.nullable().optional(),
});

const setBody = z.strictObject({ ...setAccessibilityFields, target });

const invalid = (ctx: Context, message: string): Response =>
  ctx.json({ error: "invalid_request", message }, BAD_REQUEST);

const zodInvalid = (ctx: Context, error: z.ZodError): Response => {
  const [issue] = error.issues;
  const where = issue?.path.join(".") || "request";

  return invalid(ctx, `${where}: ${issue?.message ?? "not valid"}`);
};

const failed = (ctx: Context, error: Error): Response => {
  if (error instanceof AccessibilityError) {
    return ctx.json(
      { error: "accessibility_error", message: error.message },
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

const liveFrameRef = (
  deps: AccessibilityRouteDeps,
  project: Project,
  direction: Direction,
  frames: readonly CanvasFileFrame[]
): string | null => {
  const mine = frames.filter(
    (frame) => (frame.directionId ?? direction.id) === direction.id
  );

  const presence = deps.canvas.presence(project.id);

  if (presence?.directionId === direction.id) {
    const live = mine.find((frame) => frame.id === presence.activeFrameId);

    if (live) {
      return live.id;
    }
  }

  return mine.find((frame) => !frame.hidden)?.id ?? null;
};

const resolveFrame = async (
  deps: AccessibilityRouteDeps,
  project: Project,
  direction: Direction,
  ref: string | null
): Promise<AccessibilityFrame> => {
  const snapshot = await deps.canvas.read(project);
  const frames = snapshot.canvas?.frames ?? [];

  if (ref !== null) {
    return frameOf(frames, ref);
  }

  return frameOf(frames, liveFrameRef(deps, project, direction, frames));
};

const runInspect = async (
  deps: AccessibilityRouteDeps,
  ids: { directionId: string; projectId: string },
  query: z.output<typeof getQuery>
): Promise<object> => {
  const { direction, project } = await deps.loadDirection(
    ids.projectId,
    ids.directionId
  );

  const frame = await resolveFrame(
    deps,
    project,
    direction,
    query.frame ?? null
  );

  const page = frame.page ?? "";

  const [base, state] = await Promise.all([
    deps.preview.directionUrl(project, direction),
    readDesignSystemState(project, direction),
  ]);

  return inspectAccessibility(deps.preview, state.entries, {
    frame: frame.id,
    page: page || "/",
    passing: query.includePassing === "true",
    root: query.selector ?? null,
    url: withPagePath(base, page),
    viewport: frame.viewport,
  });
};

const registerAccessibilityGet = (
  app: Hono,
  deps: AccessibilityRouteDeps
): void => {
  app.get(ACCESSIBILITY_PATH, async (ctx) => {
    const parsed = getQuery.safeParse(ctx.req.query());

    if (!parsed.success) {
      return zodInvalid(ctx, parsed.error);
    }

    try {
      const report = await runInspect(
        deps,
        { directionId: ctx.req.param("did"), projectId: ctx.req.param("pid") },
        parsed.data
      );

      return ctx.json(report);
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      return failed(ctx, error);
    }
  });
};

const registerAccessibilitySet = (
  app: Hono,
  deps: AccessibilityRouteDeps
): void => {
  app.post(ACCESSIBILITY_PATH, async (ctx) => {
    const parsed = setBody.safeParse(await deps.readBody(ctx));

    if (!parsed.success) {
      return zodInvalid(ctx, parsed.error);
    }

    const { target: where, ...fields } = parsed.data;
    const changes = toAccessibilityChanges(fields);

    if (changes === null) {
      return invalid(ctx, NO_ACCESSIBILITY_CHANGE);
    }

    try {
      const result = await deps.withDirection(
        ctx.req.param("pid"),
        ctx.req.param("did"),
        async (project, direction): Promise<AccessibilitySetResult> => {
          const done = await setAccessibility(
            deps.editDeps,
            { direction, project, workTree: direction.workTree },
            {
              changes,
              target: {
                source: where.source,
                tag: where.tag ?? null,
                usedAt: where.usedAt ?? null,
              },
            }
          );

          return toAccessibilityResult(done.plan, done.version);
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

const registerAccessibilityRoutes = (
  app: Hono,
  deps: AccessibilityRouteDeps
): void => {
  registerAccessibilityGet(app, deps);
  registerAccessibilitySet(app, deps);
};

export { registerAccessibilityRoutes };
