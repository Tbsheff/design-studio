import { z } from "zod";

import type {
  Direction,
  Project,
  Version,
  WorkTreeStatus,
} from "../../shared/contracts.js";
import {
  cleanExportPath,
  EXPORT_FRAME_MAX_SIDE,
  EXPORT_MAX_FRAMES,
  EXPORT_SCALES,
} from "../../shared/export.js";
import type { ExportFrame, ExportScale } from "../../shared/export.js";
import {
  BadRequestError,
  NotFoundError,
  assertSafeId,
} from "../platform/errors/index.js";

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

const sideOf = (label: string): z.ZodNumber => {
  const error = `${label} must be 1 to ${EXPORT_FRAME_MAX_SIDE}`;

  return z
    .number({ error })
    .int({ error })
    .min(1, { error })
    .max(EXPORT_FRAME_MAX_SIDE, { error });
};

const FrameInput = z.object(
  {
    height: sideOf("height"),
    name: z
      .union([
        z
          .string()
          .trim()
          .min(1)
          .transform((name) => name.slice(0, FRAME_NAME_MAX)),
        z.unknown().transform(() => "Frame"),
      ])
      .optional(),
    path: z.string({ error: "path must be a string" }).nullish(),
    width: sideOf("width"),
  },
  { error: "frame must be an object" }
);

const FrameDecoder = z.unknown().pipe(FrameInput);

const NoFrames = z.unknown().transform((): unknown[] => []);

const FrameList = z.union([z.array(z.unknown()), NoFrames]);

const FrameListInput = z.unknown().pipe(FrameList);

const ScaleInput = z
  .unknown()
  .pipe(
    z.literal(EXPORT_SCALES, { error: "scale must be 1, 2 or 3" }).optional()
  );

const decode = <Schema extends z.ZodType>(
  schema: Schema,
  raw: z.input<Schema>
): z.output<Schema> => {
  const result = schema.safeParse(raw);

  if (!result.success) {
    throw new BadRequestError(
      result.error.issues.at(0)?.message ?? "bad input"
    );
  }

  return result.data;
};

const parseFrame = (raw: z.input<typeof FrameDecoder>): ExportFrame => {
  const input = decode(FrameDecoder, raw);

  const frame: ExportFrame = {
    height: input.height,
    name: input.name ?? "Frame",
    width: input.width,
  };

  if (!input.path) {
    return frame;
  }

  const cleaned = cleanExportPath(input.path);

  if (cleaned === null) {
    throw new BadRequestError("path is not a page in this project");
  }

  if (cleaned) {
    frame.path = cleaned;
  }

  return frame;
};

const parseFrames = (raw: z.input<typeof FrameListInput>): ExportFrame[] => {
  const list = decode(FrameListInput, raw);

  if (list.length === 0) {
    return [{ ...DEFAULT_FRAME }];
  }

  if (list.length > EXPORT_MAX_FRAMES) {
    throw new BadRequestError(`at most ${EXPORT_MAX_FRAMES} frames`);
  }

  return list.map((item) => parseFrame(item));
};

const parseScale = (raw: z.input<typeof ScaleInput>): ExportScale =>
  decode(ScaleInput, raw) ?? 1;

export { parseFrame, parseFrames, parseScale, resolveSource, withPagePath };

export type { ExportSource, SourceDeps };
