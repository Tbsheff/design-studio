import type { Context, Hono } from "hono";

import type { Direction, Project } from "@design-studio/actions/_core/contracts";
import type { PageImportResult } from "../../shared/page-import.js";
import type { CanvasService } from "../canvas/index.js";
import type { DirectEditDeps } from "../direct-edit/index.js";
import { PageImportError } from "../page-import/errors.js";
import { importPage } from "../page-import/import-page.js";
import { toImportRequest } from "../page-import/input.js";
import { importPageFields } from "../page-import/tool-fields.js";
import { z } from "../platform/zod-bridge/index.js";

interface PageImportRouteDeps {
  readonly canvas: CanvasService;
  readonly editDeps: DirectEditDeps;
  readonly readBody: (ctx: Context) => Promise<object>;
  readonly withDirection: <Result>(
    projectId: string,
    directionId: string,
    task: (project: Project, direction: Direction) => Promise<Result>
  ) => Promise<Result>;
}

const IMPORT_PATH = "/api/projects/:pid/d/:did/import-page";

const BAD_REQUEST = 400;

const CONFLICT = 409;

const CLIENT = "ui";

const RUN_BUSY =
  "An agent run is working on this direction. Wait for it to end, then import the page.";

const importBody = z.strictObject(importPageFields);

const invalid = (ctx: Context, error: z.ZodError): Response => {
  const [issue] = error.issues;
  const where = issue?.path.join(".") || "request";
  const message = `${where}: ${issue?.message ?? "not valid"}`;

  return ctx.json({ error: "invalid_request", message }, BAD_REQUEST);
};

const runImport = (
  deps: PageImportRouteDeps,
  ids: { readonly did: string; readonly pid: string },
  body: z.output<typeof importBody>
): Promise<PageImportResult | null> =>
  deps.withDirection(ids.pid, ids.did, async (project, direction) => {
    if (deps.editDeps.runner.isRunning(project.id, direction.id)) {
      return null;
    }

    const done = await importPage(
      { canvas: deps.canvas, direction, project },
      toImportRequest(body),
      {
        client: CLIENT,
        deps: deps.editDeps,
        history: deps.editDeps.history ?? null,
      }
    );

    return done.result;
  });

const registerPageImportRoutes = (
  app: Hono,
  deps: PageImportRouteDeps
): void => {
  app.post(IMPORT_PATH, async (ctx) => {
    const parsed = importBody.safeParse(await deps.readBody(ctx));

    if (!parsed.success) {
      return invalid(ctx, parsed.error);
    }

    const ids = { did: ctx.req.param("did"), pid: ctx.req.param("pid") };

    try {
      const result = await runImport(deps, ids, parsed.data);

      if (result === null) {
        return ctx.json({ error: "run_busy", message: RUN_BUSY }, CONFLICT);
      }

      return ctx.json(result);
    } catch (error) {
      if (error instanceof PageImportError) {
        return ctx.json(
          { error: "page_import", message: error.message },
          BAD_REQUEST
        );
      }

      throw error;
    }
  });
};

export { registerPageImportRoutes };

export type { PageImportRouteDeps };
