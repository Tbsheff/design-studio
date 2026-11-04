import type { Direction, Project, Version } from "../../shared/actions/_core/contracts.js";
import { cleanExportPath } from "../../shared/actions/_core/export.js";
import {
  firstVersionState,
  firstVersionWaitText,
} from "../app/first-version.js";
import { BadRequestError, NotFoundError } from "../platform/errors/index.js";
import { resolveSource } from "../project-source/index.js";
import type { ExportSource, SourceDeps } from "../project-source/index.js";
import type { StudioProjectStore } from "../store/projects.js";
import type { PreviewService, VersionStore } from "../types.js";

const LIVE_VERSION_ID = "live";

interface FrameSourceQuery {
  readonly directionId: string | null;
  readonly projectId: string;
  readonly versionId: string | null;
}

interface FrameHtmlQuery extends FrameSourceQuery {
  readonly path: string | null;
}

interface FrameHtml {
  readonly html: string;
}

interface ShotQuery {
  readonly directionId: string | null;
  readonly element: string | null;
  readonly frameId: string | null;
  readonly height: number | null;
  readonly isFullPage: boolean;
  readonly padding: number | null;
  readonly path: string | null;
  readonly projectId: string;
  readonly versionId: string | null;
  readonly width: number | null;
}

interface ScreenshotView {
  readonly data: string;
  readonly mimeType: string;
  readonly text: string;
}

interface FrameDeps {
  readonly preview: PreviewService | null;
  readonly projects: StudioProjectStore;
  readonly versions: VersionStore;
}

const NO_RENDER = "rendering is not available";

const NO_PREVIEW = {
  directionUrl: (): Promise<string> => Promise.reject(new Error(NO_RENDER)),
  snapshotUrl: (): Promise<string> => Promise.reject(new Error(NO_RENDER)),
};

const toSourceDeps = (deps: FrameDeps): SourceDeps => ({
  preview: deps.preview ?? NO_PREVIEW,
  projects: deps.projects,
  versions: deps.versions,
});

const toPagePath = (raw: string | null): string | null => {
  if (raw === null) {
    return null;
  }

  const cleaned = cleanExportPath(raw);

  if (cleaned === null) {
    throw new BadRequestError("path is not a page in this project");
  }

  return cleaned || null;
};

const noRelease = (): Promise<void> => Promise.resolve();

const liveAppSource = (
  deps: FrameDeps,
  project: Project,
  direction: Direction
): ExportSource => {
  const version: Version = {
    changedFiles: [],
    createdAt: Date.now(),
    directionId: direction.id,
    id: LIVE_VERSION_ID,
    meta: { kind: "init" },
    parentId: null,
    title: "Live app",
  };

  const { workTree: root } = direction;
  const files = (): Promise<string> => Promise.resolve(root);

  const open = async (): Promise<{
    release: () => Promise<void>;
    url: string;
  }> => ({
    release: noRelease,
    url: await toSourceDeps(deps).preview.directionUrl(project, direction),
  });

  return { direction, files, open, project, root, version };
};

const workTreeSource = async (
  deps: FrameDeps,
  project: Project,
  direction: Direction,
  headVersionId: string
): Promise<ExportSource> => {
  const version = await deps.versions.get(project, headVersionId);

  return { ...liveAppSource(deps, project, direction), version };
};

const pickDirection = (
  project: Project,
  directionId: string | null
): Direction => {
  const direction = project.directions.find(
    (item, index) =>
      item.id === directionId || (directionId === null && index === 0)
  );

  if (!direction) {
    throw new NotFoundError("direction not found");
  }

  return direction;
};

const resolveFrameSource = async (
  deps: FrameDeps,
  query: FrameSourceQuery,
  isWorkTree: boolean
): Promise<ExportSource> => {
  const project = await deps.projects.get(query.projectId);

  if (query.versionId !== null && query.versionId !== LIVE_VERSION_ID) {
    return resolveSource(toSourceDeps(deps), project.id, query.versionId);
  }

  const direction = pickDirection(project, query.directionId);
  const head = direction.headVersionId;

  if (!head && project.app) {
    return liveAppSource(deps, project, direction);
  }

  if (!head) {
    throw new Error(firstVersionWaitText(project.id));
  }

  if (isWorkTree) {
    return workTreeSource(deps, project, direction, head);
  }

  return resolveSource(toSourceDeps(deps), project.id, head);
};

const versionLabel = (src: ExportSource): string => {
  if (src.version.id === LIVE_VERSION_ID) {
    const state = firstVersionState(src.project.id);

    if (state?.pending) {
      return `the live app (the first version is still being saved, about ${state.etaSeconds} s left)`;
    }

    return "the live app";
  }

  if (src.root === src.direction.workTree) {
    return `the work tree at version ${src.version.id}`;
  }

  return `version ${src.version.id}`;
};

export {
  LIVE_VERSION_ID,
  NO_RENDER,
  resolveFrameSource,
  toPagePath,
  versionLabel,
};

export type {
  FrameDeps,
  FrameHtml,
  FrameHtmlQuery,
  FrameSourceQuery,
  ScreenshotView,
  ShotQuery,
};
