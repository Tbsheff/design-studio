import type { Context, Hono } from "hono";
import { z } from "zod";

import type { Direction, Project } from "../../shared/contracts.js";
import {
  ICON_COLOR,
  ICON_LIST_DEFAULT,
  ICON_LIST_MAX,
  ICON_NAME,
  ICON_POSITIONS,
  ICON_QUERY_MAX,
  ICON_SIZE_DEFAULT,
  ICON_SIZE_MAX,
  ICON_SIZE_MIN,
  ICON_SOURCES,
  ICON_TARGET_MAX,
} from "../../shared/icons.js";
import { DirectEditError } from "../direct-edit/index.js";
import type { DirectEditDeps } from "../direct-edit/index.js";
import { applyIconInsert } from "../icons/apply.js";
import type { IconInsertResult } from "../icons/apply.js";
import { listIcons } from "../icons/list.js";
import { IconError } from "../icons/set.js";
import type { PreviewService } from "../types.js";
import { previewOriginOf } from "./insert-routes.js";

interface IconRouteDeps {
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

interface IconInsertReply {
  file: string;
  icon: string;
  importAdded: boolean;
  select: IconInsertResult["plan"]["select"];
  swapped: boolean;
  title: string;
  versionId: string;
}

const ICONS_PATH = "/api/projects/:pid/d/:did/icons";
const BAD_REQUEST = 400;
const FILE_MAX = 1000;
const OWNER_NAME_MAX = 64;
const OWNERS_MAX = 16;
const TAG_MAX = 100;

const listQuery = z.strictObject({
  library: z.enum(ICON_SOURCES).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(ICON_LIST_MAX)
    .default(ICON_LIST_DEFAULT),
  query: z.string().trim().max(ICON_QUERY_MAX).optional(),
});

const loc = z.strictObject({
  col: z.number().int().min(1),
  file: z.string().min(1).max(FILE_MAX),
  line: z.number().int().min(1),
});

const ownerName = z.string().max(OWNER_NAME_MAX);
const ownerStack = z.string().max(ICON_TARGET_MAX);
const owner = z.strictObject({ name: ownerName, stack: ownerStack });

const targetSchema = z.strictObject({
  owners: z.array(owner).max(OWNERS_MAX).optional(),
  selector: z.string().max(ICON_TARGET_MAX).optional(),
  source: loc.nullable(),
  tag: z.string().max(TAG_MAX).optional(),
});

const iconSize = z
  .number()
  .int()
  .min(ICON_SIZE_MIN)
  .max(ICON_SIZE_MAX)
  .default(ICON_SIZE_DEFAULT);

const insertBody = z.strictObject({
  color: z.string().trim().regex(ICON_COLOR).optional(),
  library: z.enum(ICON_SOURCES).optional(),
  name: z.string().trim().regex(ICON_NAME),
  position: z.enum(ICON_POSITIONS).default("inside"),
  size: iconSize,
  target: targetSchema,
});

const invalid = (ctx: Context, error: z.ZodError): Response => {
  const [issue] = error.issues;
  const where = issue?.path.join(".") || "request";
  const message = `${where}: ${issue?.message ?? "not valid"}`;

  return ctx.json({ error: "invalid_request", message }, BAD_REQUEST);
};

const failed = (ctx: Context, error: Error): Response => {
  if (error instanceof IconError) {
    return ctx.json(
      { error: "icon_error", message: error.message },
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

const replyOf = (done: IconInsertResult): IconInsertReply => ({
  file: done.plan.target.relative,
  icon: done.plan.icon,
  importAdded: done.plan.importAdded,
  select: done.plan.select,
  swapped: done.plan.swapped,
  title: done.version.title,
  versionId: done.version.id,
});

const registerIconList = (app: Hono, deps: IconRouteDeps): void => {
  app.get(ICONS_PATH, async (ctx) => {
    const parsed = listQuery.safeParse(ctx.req.query());

    if (!parsed.success) {
      return invalid(ctx, parsed.error);
    }

    const { project, direction } = await deps.loadDirection(
      ctx.req.param("pid"),
      ctx.req.param("did")
    );

    try {
      const list = await listIcons(
        { project, workTree: direction.workTree },
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

const registerIconInsert = (app: Hono, deps: IconRouteDeps): void => {
  app.post(`${ICONS_PATH}/insert`, async (ctx) => {
    const parsed = insertBody.safeParse(await deps.readBody(ctx));

    if (!parsed.success) {
      return invalid(ctx, parsed.error);
    }

    try {
      const done = await deps.withDirection(
        ctx.req.param("pid"),
        ctx.req.param("did"),
        async (project, direction) => {
          const previewOrigin = await previewOriginOf(
            deps.preview,
            project,
            direction
          );

          return applyIconInsert(
            deps.editDeps,
            {
              direction,
              previewOrigin,
              project,
              workTree: direction.workTree,
            },
            parsed.data
          );
        }
      );

      return ctx.json(replyOf(done));
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      return failed(ctx, error);
    }
  });
};

const registerIconRoutes = (app: Hono, deps: IconRouteDeps): void => {
  registerIconList(app, deps);
  registerIconInsert(app, deps);
};

export { registerIconRoutes };
