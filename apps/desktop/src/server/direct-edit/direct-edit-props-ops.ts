import type { Input } from "@design-studio/actions/_core/action";
import type { importFigmaDirectEdit } from "@design-studio/actions/direct-edit/import-figma";
import type { inspectPropsInstanceDirectEdit } from "@design-studio/actions/direct-edit/inspect-props-instance";
import type { listPropsComponentsDirectEdit } from "@design-studio/actions/direct-edit/list-props-components";
import type { setPropsDirectEdit } from "@design-studio/actions/direct-edit/set-props";
import type { setVariantClassesDirectEdit } from "@design-studio/actions/direct-edit/set-variant-classes";
import type { Direction, Project, VersionMeta } from "@design-studio/contracts";
import type {
  FigmaImportPreview,
  FigmaImportRequest,
  FigmaImportResult,
} from "@design-studio/contracts/figma-nodes";
import { COMPONENT_LIST_MAX } from "@design-studio/contracts/props";
import type {
  ComponentInstance,
  ComponentListQuery,
  ComponentSchemaList,
  InstanceQuery,
} from "@design-studio/contracts/props";

import { instanceFor, listComponentSchemas } from "../components/index.js";
import {
  fetchFigmaNodes,
  FigmaInputError,
  parseFigmaLink,
  parseFigmaNodes,
  prepareFigmaImport,
} from "../figma/index.js";
import { BadRequestError } from "../platform/errors/index.js";
import { writeAndCommitAll } from "./commit/batch.js";
import { assertCanEdit, publishVersion } from "./commit/index.js";
import { planInsertJsx } from "./commit/jsx-insert.js";
import { applySetProps, applyVariantClasses } from "./commit/props.js";
import type { DirectEditRuntime } from "./direct-edit-core.js";
import type { DirectionRef } from "./direct-edit-ops.js";
import { DirectEditError } from "./engine/errors.js";
import { toPreviewOrigin } from "./preview-origin.js";

type RefKeys = "directionId" | "projectId";

type PropsListBody = Omit<Input<typeof listPropsComponentsDirectEdit>, RefKeys>;

type PropsInstanceBody = Omit<
  Input<typeof inspectPropsInstanceDirectEdit>,
  RefKeys
>;

type SetPropsBody = Omit<Input<typeof setPropsDirectEdit>, RefKeys>;

type VariantClassBody = Omit<
  Input<typeof setVariantClassesDirectEdit>,
  RefKeys
>;

type FigmaImportBody = Omit<Input<typeof importFigmaDirectEdit>, RefKeys>;

type FigmaScope = Parameters<typeof prepareFigmaImport>[0] & {
  readonly previewOrigin: string | null;
};

const TITLE_MAX = 120;

const NOT_FIGMA_LINK =
  "This is not a Figma file link. Copy the link to one frame (right-click the frame > Copy link).";

const NODES_OR_LINK = "Pass nodes or link, not both.";

const PROPS_READ_FAILED = "The props of this element could not be read.";

const toListQuery = (body: PropsListBody): ComponentListQuery => {
  const query: ComponentListQuery = {
    limit: Math.min(body.limit, COMPONENT_LIST_MAX),
    query: body.query.trim(),
    source: body.source,
  };

  if (body.cursor === null) {
    return query;
  }

  return { ...query, cursor: body.cursor };
};

const listPropsComponentsOf = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: PropsListBody
): Promise<ComponentSchemaList> => {
  const { direction, project } = await runtime.loadDirection(
    ref.projectId,
    ref.directionId
  );

  return listComponentSchemas(project, direction.workTree, toListQuery(body));
};

const readInstance = async (
  runtime: DirectEditRuntime,
  target: { readonly direction: Direction; readonly project: Project },
  query: InstanceQuery
): Promise<ComponentInstance | null> => {
  try {
    return await instanceFor(
      runtime.preview,
      target.project,
      target.direction,
      query
    );
  } catch (error) {
    if (error instanceof DirectEditError) {
      throw error;
    }

    throw new Error(PROPS_READ_FAILED, { cause: error });
  }
};

const propsInstanceOf = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: PropsInstanceBody
): Promise<{ readonly instance: ComponentInstance | null }> => {
  const { direction, project } = await runtime.loadDirection(
    ref.projectId,
    ref.directionId
  );

  const query: InstanceQuery = {
    owners: body.owners?.map((owner) => ({ ...owner })) ?? [],
    use: body.use ?? null,
    usedAt: body.usedAt ?? null,
  };

  return {
    instance: await readInstance(runtime, { direction, project }, query),
  };
};

const setPropsIn = (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: SetPropsBody
): ReturnType<typeof applySetProps> =>
  runtime.withDirection(ref.projectId, ref.directionId, (project, direction) =>
    applySetProps(runtime.editDeps, project, direction, body)
  );

const setVariantClassesIn = (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: VariantClassBody
): ReturnType<typeof applyVariantClasses> =>
  runtime.withDirection(ref.projectId, ref.directionId, (project, direction) =>
    applyVariantClasses(runtime.editDeps, project, direction, body)
  );

const toInsertTarget = (
  target: FigmaImportBody["target"]
): FigmaImportRequest["target"] => {
  const owners = target.owners?.map((owner) => ({ ...owner })) ?? [];

  return { ...target, owners };
};

const toFigmaRequest = (body: FigmaImportBody): FigmaImportRequest => {
  const base = {
    dryRun: body.dryRun === true,
    position: body.position,
    target: toInsertTarget(body.target),
  };

  const nodes = body.nodes ?? null;
  const link = body.link ?? null;

  if (nodes !== null && link === null) {
    return { ...base, nodes };
  }

  if (link !== null && nodes === null) {
    return { ...base, link: link.trim() };
  }

  throw new FigmaInputError(NODES_OR_LINK);
};

interface FigmaSource {
  readonly nodeId?: string;
  readonly text: string;
}

const withNodeId = (text: string, nodeId: string | null): FigmaSource => {
  if (nodeId === null) {
    return { text };
  }

  return { nodeId, text };
};

const figmaNodesText = async (
  request: FigmaImportRequest,
  body: FigmaImportBody
): Promise<FigmaSource> => {
  if ("nodes" in request) {
    return withNodeId(request.nodes, body.nodeId ?? null);
  }

  const link = parseFigmaLink(request.link);

  if (!link) {
    throw new FigmaInputError(NOT_FIGMA_LINK);
  }

  const text = await fetchFigmaNodes(link);

  return withNodeId(text, body.nodeId ?? link.nodeId);
};

const versionTitleOf = (frameName: string): string =>
  `Import Figma frame ${frameName}`.slice(0, TITLE_MAX);

type InsertPlan = Awaited<ReturnType<typeof planInsertJsx>>;

interface FigmaCommit {
  readonly title: string;
  readonly version: Awaited<ReturnType<typeof writeAndCommitAll>>;
}

const placeOf = (plan: InsertPlan): string => {
  const [at] = plan.select;

  if (!at) {
    return plan.target.relative;
  }

  return `${at.file}:${at.line}:${at.col}`;
};

const commitFigmaPlan = async (
  runtime: DirectEditRuntime,
  scope: FigmaScope,
  plan: InsertPlan,
  preview: FigmaImportPreview
): Promise<FigmaCommit> => {
  const deps = runtime.editDeps;
  const { direction, project } = scope;
  const title = versionTitleOf(preview.frame.name);
  const place = placeOf(plan);

  const meta: VersionMeta = {
    kind: "manual",
    prompt: `Import Figma frame ${preview.frame.id}: ${place}`,
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

  return { title, version };
};

interface PlannedImport {
  readonly insertPlan: InsertPlan;
  readonly isDryRun: boolean;
  readonly preview: FigmaImportPreview;
}

const finishFigmaImport = async (
  runtime: DirectEditRuntime,
  scope: FigmaScope,
  planned: PlannedImport
): Promise<FigmaImportPreview | FigmaImportResult> => {
  const { insertPlan: plan, preview } = planned;

  if (planned.isDryRun) {
    return preview;
  }

  const done = await commitFigmaPlan(runtime, scope, plan, preview);

  return {
    file: plan.target.relative,
    frame: preview.frame,
    imports: plan.imports,
    select: plan.select,
    stats: preview.stats,
    title: done.title,
    usedAt: plan.usedAt,
    version: done.version,
  };
};

const applyFigmaImport = async (
  runtime: DirectEditRuntime,
  scope: FigmaScope,
  body: FigmaImportBody
): Promise<FigmaImportPreview | FigmaImportResult> => {
  const request = toFigmaRequest(body);
  const source = await figmaNodesText(request, body);
  const doc = parseFigmaNodes(source.text);

  const prepared = await prepareFigmaImport(scope, doc, {
    nodeId: source.nodeId,
    position: request.position,
    target: request.target,
  });

  if (request.dryRun !== true) {
    assertCanEdit(runtime.editDeps, scope.project, scope.direction);
  }

  const insertPlan = await planInsertJsx(scope, prepared.insert);

  const planned: PlannedImport = {
    insertPlan,
    isDryRun: request.dryRun === true,
    preview: prepared.preview,
  };

  return finishFigmaImport(runtime, scope, planned);
};

const importFigmaFor = async (
  runtime: DirectEditRuntime,
  target: { readonly direction: Direction; readonly project: Project },
  body: FigmaImportBody
): Promise<FigmaImportPreview | FigmaImportResult> => {
  const { direction, project } = target;

  const previewOrigin = await toPreviewOrigin(
    runtime.preview,
    project,
    direction
  );

  return applyFigmaImport(
    runtime,
    { direction, previewOrigin, project, workTree: direction.workTree },
    body
  );
};

const runFigmaImport = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: FigmaImportBody
): Promise<FigmaImportPreview | FigmaImportResult> => {
  if (body.dryRun === true) {
    const { direction, project } = await runtime.loadDirection(
      ref.projectId,
      ref.directionId
    );

    return importFigmaFor(runtime, { direction, project }, body);
  }

  return runtime.withDirection(
    ref.projectId,
    ref.directionId,
    (project, direction) =>
      importFigmaFor(runtime, { direction, project }, body)
  );
};

const importFigmaIn = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: FigmaImportBody
): Promise<FigmaImportPreview | FigmaImportResult> => {
  try {
    return await runFigmaImport(runtime, ref, body);
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

export type {
  FigmaImportBody,
  PropsInstanceBody,
  PropsListBody,
  SetPropsBody,
  VariantClassBody,
};
