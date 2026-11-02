import type { CopyCodeResult } from "../../shared/actions/export/schema.js";
import type { Direction, Project } from "../../shared/contracts.js";
import type { CopyCodeFormat, ExportFrame } from "../../shared/export.js";
import { NotFoundError } from "../store/errors.js";
import { COPY_FRAME, copyCode } from "./copy-handler.js";
import type { ExportRuntime } from "./export-core.js";
import { resolveSource } from "./source.js";

interface CopyQuery {
  readonly directionId?: string | null;
  readonly format?: CopyCodeFormat;
  readonly height?: number;
  readonly path?: string;
  readonly projectId: string;
  readonly targetSelector: string;
  readonly versionId?: string | null;
  readonly width?: number;
}

interface OpenedCopy {
  readonly release: () => Promise<void>;
  readonly url: string;
}

const MAIN_DIRECTION = "main";

const toPagePath = (raw: string | undefined): string | null => {
  const page = (raw ?? "").trim().replace(/^\/+/u, "");

  if (page === "") {
    return null;
  }

  return page;
};

const toFrame = (query: CopyQuery): ExportFrame => {
  const page = toPagePath(query.path);

  const frame: ExportFrame = {
    height: query.height ?? COPY_FRAME.height,
    name: COPY_FRAME.name,
    width: query.width ?? COPY_FRAME.width,
  };

  if (page === null) {
    return frame;
  }

  return { ...frame, path: page };
};

const pickDirection = (
  project: Project,
  directionId: string | null
): Direction => {
  const wanted = directionId ?? MAIN_DIRECTION;

  let found = project.directions.find((item) => item.id === wanted);

  if (!found && directionId === null) {
    [found] = project.directions;
  }

  if (!found) {
    throw new NotFoundError(
      `direction ${directionId ?? MAIN_DIRECTION} not found in project ${project.id}`
    );
  }

  return found;
};

const loadProject = async (
  runtime: ExportRuntime,
  projectId: string
): Promise<Project> => {
  const project = await runtime.projects.get(projectId);

  if (project.designSystemFor && project.designSystemDeleted) {
    throw new NotFoundError("project not found");
  }

  return project;
};

const releaseNothing = async (): Promise<void> => {
  await Promise.resolve();
};

const releaseQuietly = async (opened: OpenedCopy): Promise<void> => {
  try {
    await opened.release();
  } catch {
    await releaseNothing();
  }
};

const openCopy = async (
  runtime: ExportRuntime,
  project: Project,
  direction: Direction,
  query: CopyQuery
): Promise<OpenedCopy> => {
  const versionId = query.versionId ?? null;

  if (versionId === null || (query.directionId ?? null) !== null) {
    return {
      release: releaseNothing,
      url: await runtime.preview.directionUrl(project, direction),
    };
  }

  const source = await resolveSource(runtime, project.id, versionId);

  return await source.open();
};

const readCode = async (
  runtime: ExportRuntime,
  query: CopyQuery
): Promise<CopyCodeResult> => {
  const project = await loadProject(runtime, query.projectId);
  const direction = pickDirection(project, query.directionId ?? null);
  const format = query.format ?? "html";
  const opened = await openCopy(runtime, project, direction, query);

  try {
    const code = await copyCode(
      runtime.preview,
      { project, url: opened.url, workTree: direction.workTree },
      { format, frame: toFrame(query), selector: query.targetSelector }
    );

    return { code, format };
  } finally {
    await releaseQuietly(opened);
  }
};

export { readCode };

export type { CopyQuery };
