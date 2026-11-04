import { isFrameId } from "../../shared/canvas-file.js";
import type { Direction, Project } from "../../shared/contracts.js";
import type { ExportFrame } from "../../shared/export.js";
import {
  SHARE_DEFAULT_EXPIRY_HOURS,
  SHARE_EXPIRY_HOURS,
  SHARE_MAX_FRAMES,
} from "../../shared/share.js";
import type { ShareExpiryHours } from "../../shared/share.js";
import { readProjectCanvas } from "../canvas/index.js";
import { parseFrames } from "../export/source.js";
import type { ExportDeps } from "../export/source.js";
import { BadRequestError } from "../platform/errors/index.js";

interface FrameSource {
  readonly deps: ExportDeps;
  readonly direction: Direction;
  readonly project: Project;
}

interface FramePick {
  readonly frames: ExportFrame[];
  readonly ids: (string | null)[];
}

type CanvasFile = Awaited<ReturnType<typeof readProjectCanvas>>;

type CanvasFrame = NonNullable<CanvasFile["canvas"]>["frames"][number];

const toFrameId = <Raw>(raw: Raw): string | null => {
  if (isFrameId(raw)) {
    return raw;
  }

  return null;
};

const toFrameIds = <Raw>(raw: Raw, count: number): (string | null)[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.slice(0, count).map((item) => toFrameId(item));
};

const isExpiryHours = <Raw>(raw: Raw): raw is Raw & ShareExpiryHours =>
  SHARE_EXPIRY_HOURS.some((hours) => hours === raw);

const expiryOf = <Raw>(raw: Raw): ShareExpiryHours => {
  if ((raw ?? null) === null) {
    return SHARE_DEFAULT_EXPIRY_HOURS;
  }

  if (!isExpiryHours(raw)) {
    throw new BadRequestError(
      `expiresInHours must be one of ${SHARE_EXPIRY_HOURS.join(", ")}`
    );
  }

  return raw;
};

const toCanvasFile = async (
  deps: ExportDeps,
  project: Project
): Promise<CanvasFile | null> => {
  try {
    return await readProjectCanvas(project, (id) =>
      deps.projects.projectDir(id)
    );
  } catch {
    return null;
  }
};

const isOwnFrame = (frame: CanvasFrame, direction: Direction): boolean => {
  if (frame.hidden) {
    return false;
  }

  return !frame.directionId || frame.directionId === direction.id;
};

const toExportFrame = (frame: CanvasFrame): ExportFrame => {
  const base = {
    height: frame.height,
    name: frame.label?.trim() || `${frame.width} × ${frame.height}`,
    width: frame.width,
  };

  if (frame.path) {
    return { ...base, path: frame.path };
  }

  return base;
};

const canvasFrames = async (
  deps: ExportDeps,
  project: Project,
  direction: Direction
): Promise<{ frames: ExportFrame[]; ids: string[] }> => {
  const file = await toCanvasFile(deps, project);
  const frames = file?.canvas?.frames ?? [];

  const own = frames
    .filter((frame) => isOwnFrame(frame, direction))
    .toSorted((left, right) => left.order - right.order);

  return {
    frames: own.map((frame) => toExportFrame(frame)),
    ids: own.map((frame) => frame.id),
  };
};

const toFramesOrDefault = (picked: readonly ExportFrame[]): ExportFrame[] => {
  if (picked.length > 0) {
    return [...picked];
  }

  return parseFrames([]);
};

const toCheckedFrames = (picked: readonly ExportFrame[]): ExportFrame[] => {
  const frames = toFramesOrDefault(picked);

  if (frames.length > SHARE_MAX_FRAMES) {
    throw new BadRequestError(`share at most ${SHARE_MAX_FRAMES} frames`);
  }

  return frames;
};

const framesOf = async <Raw, RawIds>(
  source: FrameSource,
  raw: Raw,
  rawIds: RawIds
): Promise<FramePick> => {
  if (Array.isArray(raw) && raw.length > 0) {
    const frames = toCheckedFrames(parseFrames(raw));

    return { frames, ids: toFrameIds(rawIds, frames.length) };
  }

  const { deps, direction, project } = source;
  const picked = await canvasFrames(deps, project, direction);
  const frames = toCheckedFrames(picked.frames);

  return { frames, ids: picked.ids.slice(0, frames.length) };
};

export { canvasFrames, expiryOf, framesOf };
