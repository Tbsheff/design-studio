import type {
  Direction,
  Project,
  Version,
  WorkTreeStatus,
} from "@design-studio/contracts";
import {
  cleanExportPath,
  EXPORT_FRAME_MAX_HEIGHT,
  EXPORT_FRAME_MAX_SIDE,
  EXPORT_MAX_FRAMES,
  EXPORT_SCALES,
  isPngScaleAllowed,
} from "@design-studio/contracts/export";
import type { ExportFrame, ExportScale } from "@design-studio/contracts/export";
import { Result, Schema } from "effect";

import { toDecoder } from "../platform/decode/index.js";
import {
  BadRequestError,
  NotFoundError,
  assertSafeId,
} from "../platform/errors/index.js";

type ExportFrameInput = ExportFrame;

interface OpenedPreview {
  url: string;
  release: () => Promise<void>;
}

interface SourceProjects {
  get: (projectId: string) => Promise<Project>;
}

interface SourceVersions {
  get: (project: Project, versionId: string) => Promise<Version>;
  status: (project: Project, direction: Direction) => Promise<WorkTreeStatus>;
  snapshot: (project: Project, versionId: string) => Promise<string>;
}

interface SourcePreview {
  directionUrl: (project: Project, direction: Direction) => Promise<string>;
  snapshotUrl: (
    project: Project,
    versionId: string,
    snapshotDir: string
  ) => Promise<string>;
  snapshotShot?: (
    project: Project,
    versionId: string,
    snapshotDir: string
  ) => Promise<OpenedPreview>;
}

interface SourceRunner {
  isRunning: (projectId: string, directionId: string) => boolean;
}

interface SourceDeps {
  projects: SourceProjects;
  versions: SourceVersions;
  preview: SourcePreview;
  runner?: SourceRunner;
}

interface ExportSource {
  project: Project;
  direction: Direction;
  version: Version;
  root: string;
  files: () => Promise<string>;
  open: () => Promise<OpenedPreview>;
}

interface SourcePick {
  project: Project;
  direction: Direction;
  version: Version;
}

const FRAME_NAME_MAX = 60;

const DEFAULT_FRAME: ExportFrame = {
  height: 900,
  name: "Desktop",
  width: 1440,
};

const LEADING_SLASHES = /^\/+/u;

const noRelease = (): Promise<void> => Promise.resolve();

const pickSource = async (
  deps: SourceDeps,
  projectId: string,
  versionId: string
): Promise<SourcePick> => {
  const project = await deps.projects.get(assertSafeId(projectId, "projectId"));

  const version = await deps.versions.get(
    project,
    assertSafeId(versionId, "versionId")
  );

  const direction =
    project.directions.find((item) => item.id === version.directionId) ??
    project.directions.at(0);

  if (!direction) {
    throw new NotFoundError("project has no direction");
  }

  return { direction, project, version };
};

const isLive = async (deps: SourceDeps, pick: SourcePick): Promise<boolean> => {
  const { project, direction, version } = pick;

  if (project.app) {
    return true;
  }

  if (direction.headVersionId !== version.id) {
    return false;
  }

  const status = await deps.versions.status(project, direction);

  return !status.dirty;
};

const liveSource = (deps: SourceDeps, pick: SourcePick): ExportSource => {
  const { project, direction, version } = pick;

  const files = (): Promise<string> => {
    if (project.app) {
      return Promise.resolve(direction.workTree);
    }

    return deps.versions.snapshot(project, version.id);
  };

  const open = async (): Promise<OpenedPreview> => ({
    release: noRelease,
    url: await deps.preview.directionUrl(project, direction),
  });

  return { ...pick, files, open, root: direction.workTree };
};

const snapshotSource = async (
  deps: SourceDeps,
  pick: SourcePick
): Promise<ExportSource> => {
  const { project, version } = pick;
  const root = await deps.versions.snapshot(project, version.id);

  const files = (): Promise<string> => Promise.resolve(root);

  const open = async (): Promise<OpenedPreview> => {
    if (deps.preview.snapshotShot) {
      return deps.preview.snapshotShot(project, version.id, root);
    }

    return {
      release: noRelease,
      url: await deps.preview.snapshotUrl(project, version.id, root),
    };
  };

  return { ...pick, files, open, root };
};

const resolveSource = async (
  deps: SourceDeps,
  projectId: string,
  versionId: string
): Promise<ExportSource> => {
  const pick = await pickSource(deps, projectId, versionId);

  if (await isLive(deps, pick)) {
    return liveSource(deps, pick);
  }

  return snapshotSource(deps, pick);
};

const withPagePath = (url: string, pagePath?: string): string => {
  const page = pagePath?.replace(LEADING_SLASHES, "");

  if (!page) {
    return url;
  }

  const base = new URL(url);

  if (!base.pathname.endsWith("/")) {
    base.pathname = base.pathname.slice(0, base.pathname.lastIndexOf("/") + 1);
  }

  const next = new URL(page, base);

  next.search = base.search;

  return next.toString();
};

const toBadRequestFailure = (message: string): never => {
  throw new BadRequestError(message);
};

const WidthSchema = Schema.Int.check(
  Schema.isBetween({ maximum: EXPORT_FRAME_MAX_SIDE, minimum: 1 })
);

const HeightSchema = Schema.Int.check(
  Schema.isBetween({ maximum: EXPORT_FRAME_MAX_HEIGHT, minimum: 1 })
);

const FrameFieldsSchema = Schema.Struct({
  height: Schema.optionalKey(Schema.Unknown),
  name: Schema.optionalKey(Schema.Unknown),
  path: Schema.optionalKey(Schema.Unknown),
  width: Schema.optionalKey(Schema.Unknown),
});

const NameSchema = Schema.Trim.check(Schema.isMinLength(1));

const FramePathSchema = Schema.UndefinedOr(Schema.NullOr(Schema.String));

const FrameScaleSchema = Schema.UndefinedOr(Schema.Literals(EXPORT_SCALES));

const toFrameFields = toDecoder(FrameFieldsSchema, "ignore");

const toFrameList = toDecoder(Schema.Array(Schema.Unknown), "error");

const toWidthResult = toDecoder(WidthSchema, "error");

const toHeightResult = toDecoder(HeightSchema, "error");

const toNameResult = toDecoder(NameSchema, "error");

const toPathResult = toDecoder(FramePathSchema, "error");

const toScaleResult = toDecoder(FrameScaleSchema, "error");

const toSide = (
  label: string,
  max: number,
  result: Result.Result<number, unknown>
): number => {
  if (Result.isFailure(result)) {
    return toBadRequestFailure(`${label} must be 1 to ${max}`);
  }

  return result.success;
};

const toFrameName = (result: Result.Result<string, unknown>): string => {
  if (Result.isFailure(result)) {
    return "Frame";
  }

  return result.success.slice(0, FRAME_NAME_MAX);
};

const toFramePath = (
  result: Result.Result<string | null | undefined, unknown>
): string | null => {
  if (Result.isFailure(result)) {
    return toBadRequestFailure("path must be a string");
  }

  return result.success ?? null;
};

type FrameFields = Result.Result<typeof FrameFieldsSchema.Type, unknown>;

const toFrame = (fields: FrameFields): ExportFrame => {
  if (Result.isFailure(fields)) {
    return toBadRequestFailure("frame must be an object");
  }

  const height = toSide(
    "height",
    EXPORT_FRAME_MAX_HEIGHT,
    toHeightResult(fields.success.height)
  );

  const framePath = toFramePath(toPathResult(fields.success.path));

  const width = toSide(
    "width",
    EXPORT_FRAME_MAX_SIDE,
    toWidthResult(fields.success.width)
  );

  const name = toFrameName(toNameResult(fields.success.name));
  const frame: ExportFrame = { height, name, width };

  if (!framePath) {
    return frame;
  }

  const cleaned = cleanExportPath(framePath);

  if (cleaned === null) {
    return toBadRequestFailure("path is not a page in this project");
  }

  if (cleaned) {
    frame.path = cleaned;
  }

  return frame;
};

const parseFrame = (raw: ExportFrameInput): ExportFrame =>
  toFrame(toFrameFields(raw));

const parseFrames = (raw: readonly ExportFrameInput[]): ExportFrame[] => {
  const decoded = toFrameList(raw);
  let list: readonly unknown[] = [];

  if (Result.isSuccess(decoded)) {
    list = decoded.success;
  }

  if (list.length === 0) {
    return [{ ...DEFAULT_FRAME }];
  }

  if (list.length > EXPORT_MAX_FRAMES) {
    return toBadRequestFailure(`at most ${EXPORT_MAX_FRAMES} frames`);
  }

  return list.map((item) => toFrame(toFrameFields(item)));
};

const parseScale = (raw: ExportScale): ExportScale => {
  const scale = toScaleResult(raw);

  if (Result.isFailure(scale)) {
    return toBadRequestFailure("scale must be 1, 2 or 3");
  }

  return scale.success ?? 1;
};

const toPngScaleText = (height: number): string => {
  const allowed: string[] = [];

  for (const scale of EXPORT_SCALES) {
    if (isPngScaleAllowed(height, scale)) {
      allowed.push(`${scale}x`);
    }
  }

  const last = allowed.at(-1) ?? "1x";
  let scales = last;

  if (allowed.length > 1) {
    scales = `${allowed.slice(0, -1).join(", ")} or ${last}`;
  }

  return `This frame is ${height.toLocaleString("en-US")} px tall. Export it at ${scales}.`;
};

const toPngFrames = (
  frames: readonly ExportFrame[],
  scale: ExportScale
): ExportFrame[] => {
  const tall = frames.find((frame) => !isPngScaleAllowed(frame.height, scale));

  if (tall) {
    return toBadRequestFailure(toPngScaleText(tall.height));
  }

  return [...frames];
};

export {
  parseFrame,
  parseFrames,
  parseScale,
  resolveSource,
  toPngFrames,
  withPagePath,
};

export type { ExportSource, SourceDeps };
