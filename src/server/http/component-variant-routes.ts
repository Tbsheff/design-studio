import type { Context, Hono } from "hono";

import {
  VARIANT_CLASSES,
  VARIANT_KEY,
  VARIANT_VALUE,
} from "../../shared/component-variant.js";
import type {
  ComponentVariantChange,
  ComponentVariantRequest,
  ComponentVariantResult,
} from "../../shared/component-variant.js";
import type { Direction, Project } from "../../shared/contracts.js";
import { componentPreviewsFor } from "../components/preview.js";
import type { PreviewTarget } from "../components/preview.js";
import { ComponentVariantError } from "../components/variant-write/errors.js";
import type { VariantScope } from "../components/variant-write/locate.js";
import {
  previewVariant,
  toVariantResult,
  writeVariant,
} from "../components/variant-write/write.js";
import { DirectEditError } from "../direct-edit/engine/errors.js";
import type { DirectEditDeps } from "../direct-edit/index.js";
import { z } from "../platform/zod-bridge/index.js";
import type { PreviewService } from "../types.js";

interface ComponentVariantRouteDeps {
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

interface ComponentVariantReply extends ComponentVariantResult {
  readonly png: string | null;
}

const VARIANT_PATH = "/api/projects/:pid/d/:did/component-variant";
const PREVIEW_PATH = `${VARIANT_PATH}/preview`;
const BAD_REQUEST = 400;
const NO_PREVIEW = 422;
const OK = 200;
const FILE_MAX = 1000;
const NAME = /^[A-Z][A-Za-z0-9_$]{0,63}$/u;
const CVA_NAME = /^[A-Za-z_$][\w$]{0,63}$/u;

const keyField = z.string().regex(VARIANT_KEY);
const valueField = z.string().regex(VARIANT_VALUE);
const classes = z.string().trim().min(1).regex(VARIANT_CLASSES);

const target = z.strictObject({
  cva: z.string().trim().regex(CVA_NAME).nullable().default(null),
  file: z.string().trim().max(FILE_MAX).nullable().default(null),
  name: z.string().regex(NAME).nullable().default(null),
});

const createChange = z.strictObject({
  classes: classes.nullable().default(null),
  copyFrom: valueField.nullable().default(null),
  key: keyField,
  kind: z.literal("create"),
  newKey: z.boolean().default(false),
  setDefault: z.boolean().default(false),
  value: valueField,
});

const updateChange = z.strictObject({
  classes: classes.nullable().default(null),
  key: keyField,
  kind: z.literal("update"),
  rename: valueField.nullable().default(null),
  setDefault: z.boolean().default(false),
  value: valueField,
});

const writeBody = z.strictObject({
  change: z.discriminatedUnion("kind", [createChange, updateChange]),
  target,
});

const previewQuery = z.strictObject({
  className: z.string().trim().regex(VARIANT_CLASSES).optional(),
  file: z.string().trim().min(1).max(FILE_MAX),
  key: keyField,
  name: z.string().regex(NAME),
  value: valueField,
});

type PreviewQuery = z.output<typeof previewQuery>;

const invalid = (ctx: Context, error: z.ZodError): Response => {
  const [issue] = error.issues;
  const where = issue?.path.join(".") || "request";
  const message = `${where}: ${issue?.message ?? "not valid"}`;

  return ctx.json({ error: "invalid_request", message }, BAD_REQUEST);
};

const failed = (ctx: Context, error: Error): Response => {
  if (error instanceof ComponentVariantError) {
    return ctx.json(
      { error: "component_variant_error", message: error.message },
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

const scopeOf = (project: Project, direction: Direction): VariantScope => {
  if (project.kind !== "react") {
    throw new ComponentVariantError(
      "This is an HTML project. It has no component kit."
    );
  }

  return { direction, project, workTree: direction.workTree };
};

const writeOne = (
  deps: ComponentVariantRouteDeps,
  request: ComponentVariantRequest,
  ids: { readonly did: string; readonly pid: string }
): Promise<ComponentVariantReply> =>
  deps.withDirection(ids.pid, ids.did, async (project, direction) => {
    const scope = scopeOf(project, direction);

    const { plan, version } = await writeVariant(deps.editDeps, scope, request);

    const preview = await previewVariant(deps.preview, scope, plan);

    const result = toVariantResult(plan, version, preview);

    if (!preview.ok) {
      return { ...result, png: null };
    }

    return { ...result, png: preview.png.toString("base64") };
  });

const registerVariantWrite = (
  app: Hono,
  deps: ComponentVariantRouteDeps
): void => {
  app.post(VARIANT_PATH, async (ctx) => {
    const parsed = writeBody.safeParse(await deps.readBody(ctx));

    if (!parsed.success) {
      return invalid(ctx, parsed.error);
    }

    const change: ComponentVariantChange = parsed.data.change;
    const ids = { did: ctx.req.param("did"), pid: ctx.req.param("pid") };

    try {
      return ctx.json(
        await writeOne(deps, { change, target: parsed.data.target }, ids)
      );
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      return failed(ctx, error);
    }
  });
};

const propsOf = (query: PreviewQuery): PreviewTarget["props"] => {
  if (query.className) {
    return { [query.key]: query.value, className: query.className };
  }

  return { [query.key]: query.value };
};

const renderOne = async (
  ctx: Context,
  deps: ComponentVariantRouteDeps,
  query: PreviewQuery
): Promise<Response> => {
  const { direction, project } = await deps.loadDirection(
    ctx.req.param("pid") ?? "",
    ctx.req.param("did") ?? ""
  );

  const result = await componentPreviewsFor(deps.preview).render(
    project,
    direction,
    { file: query.file, name: query.name, props: propsOf(query) }
  );

  if (!result.ok) {
    return ctx.json(
      { error: "no-preview", message: result.reason },
      NO_PREVIEW
    );
  }

  return ctx.body(new Uint8Array(result.png), OK, {
    "cache-control": "private, no-cache",
    "content-type": "image/png",
    etag: `"${result.hash}"`,
  });
};

const registerVariantPreview = (
  app: Hono,
  deps: ComponentVariantRouteDeps
): void => {
  app.get(PREVIEW_PATH, async (ctx) => {
    const parsed = previewQuery.safeParse(ctx.req.query());

    if (!parsed.success) {
      return invalid(ctx, parsed.error);
    }

    try {
      return await renderOne(ctx, deps, parsed.data);
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      return ctx.json(
        { error: "no-preview", message: error.message },
        NO_PREVIEW
      );
    }
  });
};

const registerComponentVariantRoutes = (
  app: Hono,
  deps: ComponentVariantRouteDeps
): void => {
  registerVariantPreview(app, deps);
  registerVariantWrite(app, deps);
};

export { registerComponentVariantRoutes };

export type { ComponentVariantReply, ComponentVariantRouteDeps };
