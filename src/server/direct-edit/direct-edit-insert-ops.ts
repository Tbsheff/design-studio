import { z } from "zod";

import type { Direction, Project } from "../../shared/contracts.js";
import {
  applyCreateComponent,
  componentFolders,
} from "../components/extract.js";
import { listInsertable } from "../components/insert-list.js";
import { applyInsertComponent } from "../components/insert.js";
import {
  PreviewTargetError,
  type PreviewResult,
  type PreviewTarget,
} from "../components/preview.js";
import { applySwap, swapCandidates } from "../components/swap.js";
import { BadRequestError, NotFoundError } from "../store/errors.js";
import type { PreviewService } from "../types.js";
import type { DirectEditRuntime } from "./direct-edit-core.js";
import type { DirectionRef, EditBody } from "./direct-edit-ops.js";
import { DirectEditError } from "./engine/errors.js";
import { applySetImage } from "./image.js";
import { applyClearText, applyInsertJsx } from "./jsx-insert.js";
import { applyVector } from "./vector-ops.js";

const NAME_RE = /^[A-Z][A-Za-z0-9_$]{0,63}$/;

const TEXT_MAX = 1000;

const COMPONENT_ID_RE = /^[A-Z][A-Za-z0-9]{0,47}$/;

const useSchema = z
  .object({
    use: z
      .object({
        file: z.string().min(1).max(1000),
        line: z.number().int().min(1),
        col: z.number().int().min(1),
      })
      .strict(),
  })
  .strict();

type Applier<Value> = (
  deps: DirectEditRuntime["editDeps"],
  scope: {
    direction: Direction;
    previewOrigin: string | null;
    project: Project;
    workTree: string;
  },
  body: unknown
) => Promise<Value>;

const previewOriginOf = async (
  preview: PreviewService,
  project: Project,
  direction: Direction
): Promise<string | null> => {
  if (project.kind !== "react") {
    return null;
  }

  try {
    return new URL(await preview.directionUrl(project, direction)).origin;
  } catch {
    return null;
  }
};

const applyWith = <Value>(
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  apply: Applier<Value>,
  body: EditBody
): Promise<Value> =>
  runtime.withDirection(
    ref.projectId,
    ref.directionId,
    async (project, direction) =>
      apply(
        runtime.editDeps,
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
      )
  );

const insertComponentIn = (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
) => applyWith(runtime, ref, applyInsertComponent, body);

const insertJsxIn = (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
) => applyWith(runtime, ref, applyInsertJsx, body);

const deleteTextIn = (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
) => applyWith(runtime, ref, applyClearText, body);

const setImageIn = (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
) => applyWith(runtime, ref, applySetImage, body);

const setVectorIn = (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
) => applyWith(runtime, ref, applyVector, body);

const createComponentIn = (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
) => applyWith(runtime, ref, applyCreateComponent, body);

const applySwapIn = (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
) => applyWith(runtime, ref, applySwap, body);

const listInsertableOf = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef
): Promise<Awaited<ReturnType<typeof listInsertable>>> => {
  const { direction, project } = await runtime.loadDirection(
    ref.projectId,
    ref.directionId
  );

  return listInsertable(project, direction.workTree);
};

const listComponentsOf = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef
): Promise<{ components: unknown[] }> => {
  const { direction, project } = await runtime.loadDirection(
    ref.projectId,
    ref.directionId
  );

  return { components: await runtime.components.list(project, direction) };
};

const listComponentFoldersOf = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef
): Promise<Awaited<ReturnType<typeof componentFolders>>> => {
  const { direction, project } = await runtime.loadDirection(
    ref.projectId,
    ref.directionId
  );

  return componentFolders(project, direction.workTree);
};

const listSwapCandidatesOf = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
): Promise<Awaited<ReturnType<typeof swapCandidates>>> => {
  const parsed = useSchema.safeParse(body);

  if (!parsed.success) {
    throw new BadRequestError("use must be { file, line, col }");
  }

  const { direction, project } = await runtime.loadDirection(
    ref.projectId,
    ref.directionId
  );

  return swapCandidates(project, direction.workTree, parsed.data.use);
};

const thumbOf = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  componentId: string,
  version: string
): Promise<Buffer> => {
  if (!COMPONENT_ID_RE.test(componentId)) {
    throw new BadRequestError("invalid component id");
  }

  const { direction, project } = await runtime.loadDirection(
    ref.projectId,
    ref.directionId
  );

  const png = await runtime.components.thumb(
    project,
    direction,
    componentId,
    version.slice(0, 40)
  );

  if (!png) {
    throw new NotFoundError("no thumbnail for this component");
  }

  return png;
};

const targetOf = (body: EditBody): PreviewTarget => {
  const { file, id, name } = body as Record<string, string | undefined>;

  if (id) {
    if (id.length > TEXT_MAX || id.includes("\0")) {
      throw new BadRequestError("invalid component id");
    }

    return { id };
  }

  if (!name || !NAME_RE.test(name)) {
    throw new BadRequestError("pass id, or name (and file)");
  }

  if (file && (file.length > TEXT_MAX || file.includes("\0"))) {
    throw new BadRequestError("invalid file");
  }

  return { name, ...(file ? { file } : {}) };
};

const renderPreview = async (
  runtime: DirectEditRuntime,
  project: Project,
  direction: Direction,
  target: PreviewTarget
): Promise<PreviewResult> => {
  try {
    return await runtime.previews.render(project, direction, target);
  } catch (error) {
    if (error instanceof PreviewTargetError) {
      throw new NotFoundError(error.message);
    }

    throw error;
  }
};

const getComponentPreviewOf = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
) => {
  const target = targetOf(body);

  const { direction, project } = await runtime.loadDirection(
    ref.projectId,
    ref.directionId
  );

  const result = await renderPreview(runtime, project, direction, target);

  if (!result.ok) {
    throw new DirectEditError("invalid_request", result.reason, 422);
  }

  return {
    cached: result.cached,
    component: result.component,
    hash: result.hash,
    png: result.png.toString("base64"),
    props: result.props,
    text: result.text,
  };
};

export {
  applySwapIn,
  createComponentIn,
  deleteTextIn,
  getComponentPreviewOf,
  insertComponentIn,
  insertJsxIn,
  listComponentFoldersOf,
  listComponentsOf,
  listInsertableOf,
  listSwapCandidatesOf,
  previewOriginOf,
  setImageIn,
  setVectorIn,
  thumbOf,
};
