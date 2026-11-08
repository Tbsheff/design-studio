import type { Direction, Project } from "@design-studio/contracts";

import type {
  PreviewResult,
  PreviewTarget,
} from "../../../../shared/component-ports.js";
import {
  listInsertable,
  PreviewTargetError,
} from "../../../components/index.js";
import {
  applyCreateComponent,
  applyInsertComponent,
  applySwap,
  componentFolders,
  swapCandidates,
} from "../../../direct-edit/components-ops/index.js";
import {
  applySetImage,
  applyClearText,
  applyInsertJsx,
  applyVector,
  DirectEditError,
  toPreviewOrigin,
} from "../../../direct-edit/index.js";
import type { DirectEditRuntime } from "../../../direct-edit/index.js";
import {
  BadRequestError,
  NotFoundError,
} from "../../../platform/errors/index.js";
import type { DirectionRef, EditBody } from "./direct-edit-ops.js";

const NAME_RE = /^[A-Z][A-Za-z0-9_$]{0,63}$/u;

const TEXT_MAX = 1000;

const COMPONENT_ID_RE = /^[A-Z][A-Za-z0-9]{0,47}$/u;

const VERSION_KEY_MAX = 40;

const UNPROCESSABLE = 422;

type PreviewResultOk = Extract<PreviewResult, { ok: true }>;

interface SourceUse {
  readonly col: number;
  readonly file: string;
  readonly line: number;
}

type Applier<Value> = (
  deps: DirectEditRuntime["editDeps"],
  scope: {
    direction: Direction;
    previewOrigin: string | null;
    project: Project;
    workTree: string;
  },
  body: EditBody
) => Promise<Value>;

const applyWith = <Value>(
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  apply: Applier<Value>,
  body: EditBody
): Promise<Value> =>
  runtime.withDirection(
    ref.projectId,
    ref.directionId,
    async (project, direction) => {
      const previewOrigin = await toPreviewOrigin(
        runtime.preview,
        project,
        direction
      );

      return apply(
        runtime.editDeps,
        { direction, previewOrigin, project, workTree: direction.workTree },
        body
      );
    }
  );

const insertComponentIn = (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
): ReturnType<typeof applyInsertComponent> =>
  applyWith(runtime, ref, applyInsertComponent, body);

const insertJsxIn = (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
): ReturnType<typeof applyInsertJsx> =>
  applyWith(runtime, ref, applyInsertJsx, body);

const deleteTextIn = (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
): ReturnType<typeof applyClearText> =>
  applyWith(runtime, ref, applyClearText, body);

const setImageIn = (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
): ReturnType<typeof applySetImage> =>
  applyWith(runtime, ref, applySetImage, body);

const setVectorIn = (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
): ReturnType<typeof applyVector> => applyWith(runtime, ref, applyVector, body);

const applySwapIn = (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
): ReturnType<typeof applySwap> => applyWith(runtime, ref, applySwap, body);

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

const DEFAULT_COMPONENT_FOLDER = "src/components";

const toFolderOf = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
): Promise<string> => {
  const { folder } = body as Record<string, string | undefined>;

  if (folder) {
    return folder;
  }

  const list = await listComponentFoldersOf(runtime, ref);

  return (
    list.folders.find((item) => item.kind === "app")?.folder ??
    DEFAULT_COMPONENT_FOLDER
  );
};

const createComponentIn = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
): ReturnType<typeof applyCreateComponent> =>
  applyWith(runtime, ref, applyCreateComponent, {
    ...body,
    folder: await toFolderOf(runtime, ref, body),
  });

const listSwapCandidatesOf = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  use: SourceUse
): Promise<Awaited<ReturnType<typeof swapCandidates>>> => {
  const { direction, project } = await runtime.loadDirection(
    ref.projectId,
    ref.directionId
  );

  return swapCandidates(project, direction.workTree, {
    col: use.col,
    file: use.file,
    line: use.line,
  });
};

const getThumbOf = async (
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
    version.slice(0, VERSION_KEY_MAX)
  );

  if (!png) {
    throw new NotFoundError("no thumbnail for this component");
  }

  return png;
};

const toTargetOf = (body: EditBody): PreviewTarget => {
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

  if (file) {
    return { file, name };
  }

  return { name };
};

const runPreview = async (
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

interface ComponentPreviewBody {
  readonly cached: boolean;
  readonly component: PreviewResultOk["component"];
  readonly hash: string;
  readonly png: string;
  readonly props: PreviewResultOk["props"];
  readonly text: string | null;
}

const getComponentPreviewOf = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
): Promise<ComponentPreviewBody> => {
  const target = toTargetOf(body);

  const { direction, project } = await runtime.loadDirection(
    ref.projectId,
    ref.directionId
  );

  const result = await runPreview(runtime, project, direction, target);

  if (!result.ok) {
    throw new DirectEditError("invalid_request", result.reason, UNPROCESSABLE);
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
  setImageIn,
  setVectorIn,
  getThumbOf,
};

export type { ComponentPreviewBody, SourceUse };
