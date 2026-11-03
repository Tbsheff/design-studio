import { z } from "zod";

import type { VersionMeta } from "../../shared/contracts.js";
import {
  FIGMA_NODES_MAX_BYTES,
  type FigmaImportPreview,
  type FigmaImportRequest,
  type FigmaImportResult,
} from "../../shared/figma-nodes.js";
import { JSX_INSERT_POSITIONS } from "../../shared/insert.js";
import {
  COMPONENT_LIST_MAX,
  COMPONENT_SOURCES,
  OWNERS_MAX,
  OWNER_STACK_MAX,
  type InstanceQuery,
} from "../../shared/props.js";
import {
  instanceFor,
  listComponentSchemas,
} from "../components/props-service.js";
import {
  fetchFigmaNodes,
  FigmaInputError,
  parseFigmaLink,
  parseFigmaNodes,
} from "../figma/nodes.js";
import { prepareFigmaImport } from "../figma/to-markup.js";
import { BadRequestError } from "../store/errors.js";
import { writeAndCommitAll } from "./batch.js";
import { assertCanEdit, publishVersion } from "./commit/index.js";
import type { DirectEditRuntime } from "./direct-edit-core.js";
import { previewOriginOf } from "./direct-edit-insert-ops.js";
import type { DirectionRef, EditBody } from "./direct-edit-ops.js";
import { DirectEditError } from "./engine/errors.js";
import { planInsertJsx } from "./jsx-insert.js";
import { applySetProps, applyVariantClasses } from "./props.js";

const location = z.object({
  col: z.number().int().min(1),
  file: z.string().min(1).max(1000),
  line: z.number().int().min(1),
});

const listQuery = z.object({
  cursor: z
    .string()
    .regex(/^\d{1,6}$/u)
    .optional(),
  limit: z.coerce.number().int().min(1).max(COMPONENT_LIST_MAX).optional(),
  query: z.string().trim().max(100).optional(),
  source: z.enum(COMPONENT_SOURCES).optional(),
});

const instanceSchema = z.object({
  owners: z
    .array(
      z.object({
        name: z.string().max(64),
        stack: z.string().max(OWNER_STACK_MAX),
      })
    )
    .max(OWNERS_MAX)
    .optional(),
  use: location.nullable().optional(),
  usedAt: location.nullable().optional(),
});

const strictLocation = location.strict();

const figmaTarget = z
  .object({
    owners: z
      .array(
        z.object({
          name: z.string().max(64),
          stack: z.string().max(OWNER_STACK_MAX),
        })
      )
      .max(OWNERS_MAX)
      .optional(),
    selector: z.string().max(2000).optional(),
    source: strictLocation.nullable(),
    tag: z.string().max(100).optional(),
  })
  .strict();

const figmaRequest = z
  .object({
    dryRun: z.boolean().optional(),
    link: z.string().trim().url().max(2000).optional(),
    nodeId: z.string().trim().min(1).max(200).optional(),
    nodes: z.string().min(2).max(FIGMA_NODES_MAX_BYTES).optional(),
    position: z
      .enum(JSX_INSERT_POSITIONS as ["inside", "before", "after", "replace"])
      .default("inside"),
    target: figmaTarget,
  })
  .strict()
  .refine(
    (input) => (input.nodes === undefined) !== (input.link === undefined),
    "pass nodes or link, not both"
  );

const listPropsComponentsOf = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
) => {
  const parsed = listQuery.safeParse(body);

  if (!parsed.success) {
    throw new BadRequestError("query, source, limit or cursor is not valid");
  }

  const { direction, project } = await runtime.loadDirection(
    ref.projectId,
    ref.directionId
  );

  return listComponentSchemas(project, direction.workTree, parsed.data);
};

const propsInstanceOf = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
) => {
  const parsed = instanceSchema.safeParse(body);

  if (!parsed.success) {
    throw new BadRequestError("owners, usedAt or use is not valid");
  }

  const { direction, project } = await runtime.loadDirection(
    ref.projectId,
    ref.directionId
  );

  try {
    return {
      instance: await instanceFor(
        runtime.preview,
        project,
        direction,
        parsed.data as InstanceQuery
      ),
    };
  } catch (error) {
    if (error instanceof DirectEditError) {
      throw error;
    }

    console.error(
      `props instance: ${error instanceof Error ? error.message : String(error)}`
    );
    throw new Error("The props of this element could not be read.", {
      cause: error,
    });
  }
};

const setPropsIn = (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
) =>
  runtime.withDirection(ref.projectId, ref.directionId, (project, direction) =>
    applySetProps(runtime.editDeps, project, direction, body)
  );

const setVariantClassesIn = (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
) =>
  runtime.withDirection(ref.projectId, ref.directionId, (project, direction) =>
    applyVariantClasses(runtime.editDeps, project, direction, body)
  );

const figmaNodesText = async (request: FigmaImportRequest): Promise<string> => {
  if ("nodes" in request && typeof request.nodes === "string") {
    return request.nodes;
  }

  const link = "link" in request ? parseFigmaLink(request.link) : null;

  if (!link) {
    throw new FigmaInputError(
      "This is not a Figma file link. Copy the link to one frame (right-click the frame > Copy link)."
    );
  }

  const text = await fetchFigmaNodes(link);

  if (!request.nodeId && link.nodeId) {
    request.nodeId = link.nodeId;
  }

  return text;
};

const parseFigmaImportRequest = (raw: unknown): FigmaImportRequest => {
  const parsed = figmaRequest.safeParse(raw);

  if (!parsed.success) {
    const [issue] = parsed.error.issues;

    throw new FigmaInputError(
      issue
        ? `${issue.path.join(".") || "request"}: ${issue.message}`
        : "The Figma import request is not valid"
    );
  }

  return parsed.data as FigmaImportRequest;
};

const applyFigmaImport = async (
  runtime: DirectEditRuntime,
  scope: Parameters<typeof prepareFigmaImport>[0] & {
    previewOrigin: string | null;
  },
  raw: unknown
): Promise<FigmaImportPreview | FigmaImportResult> => {
  const deps = runtime.editDeps;
  const request = parseFigmaImportRequest(raw);
  const doc = parseFigmaNodes(await figmaNodesText(request));

  const prepared = await prepareFigmaImport(scope, doc, {
    nodeId: request.nodeId,
    position: request.position,
    target: request.target,
  });

  if (!request.dryRun) {
    assertCanEdit(deps, scope.project, scope.direction);
  }

  const plan = await planInsertJsx(scope, prepared.insert);

  if (request.dryRun) {
    return prepared.preview;
  }

  const { direction, project } = scope;

  const title = `Import Figma frame ${prepared.preview.frame.name}`.slice(
    0,
    120
  );

  const at = plan.select[0];

  const meta: VersionMeta = {
    kind: "manual",
    prompt: `Import Figma frame ${prepared.preview.frame.id}: ${request.position} ${at ? `${at.file}:${at.line}:${at.col}` : plan.target.relative}`,
  };

  const version = await writeAndCommitAll(
    deps,
    project,
    direction,
    [plan],
    title,
    meta
  );

  deps.history?.record({
    directionId: direction.id,
    files: [
      {
        after: plan.code,
        before: plan.original,
        file: plan.target.file,
        relative: plan.target.relative,
      },
    ],
    label: version.title,
    projectId: project.id,
    versionId: version.id,
  });
  await publishVersion(deps, project, direction, version);

  return {
    file: plan.target.relative,
    frame: prepared.preview.frame,
    imports: plan.imports,
    select: plan.select,
    stats: prepared.preview.stats,
    title,
    usedAt: plan.usedAt,
    version,
  };
};

const importFigmaIn = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
) => {
  const run = async (
    project: Parameters<typeof previewOriginOf>[1],
    direction: Parameters<typeof previewOriginOf>[2]
  ) =>
    applyFigmaImport(
      runtime,
      {
        direction,
        previewOrigin: await previewOriginOf(
          runtime.preview,
          project,
          direction
        ),
        project,
        workTree: direction.workTree,
      },
      body
    );

  try {
    if (body["dryRun"] === true) {
      const { direction, project } = await runtime.loadDirection(
        ref.projectId,
        ref.directionId
      );

      return await run(project, direction);
    }

    return await runtime.withDirection(ref.projectId, ref.directionId, run);
  } catch (error) {
    if (error instanceof FigmaInputError) {
      throw new BadRequestError(error.message);
    }

    throw error;
  }
};

export {
  importFigmaIn,
  listPropsComponentsOf,
  propsInstanceOf,
  setPropsIn,
  setVariantClassesIn,
};
