import { isFrameId } from "../../shared/canvas-file.js";
import type { Direction, Project } from "../../shared/contracts.js";
import type { ExportFrame } from "../../shared/export.js";
import {
  SHARE_DEFAULT_EXPIRY_HOURS,
  SHARE_EXPIRY_HOURS,
  SHARE_MAX_FRAMES,
  type ShareExpiryHours,
} from "../../shared/share.js";
import { readProjectCanvas } from "../canvas/service.js";
import { parseFrames, type ExportDeps } from "../export/source.js";
import { BadRequestError } from "../store/errors.js";

function frameIdsOf(raw: unknown, count: number): (string | undefined)[] {
  if (!Array.isArray(raw)) return [];
  return Array.from({ length: count }, (_, i) =>
    isFrameId(raw[i]) ? (raw[i] as string) : undefined
  );
}

function sharePort(studioPort: number): number {
  const raw = Number(process.env.STUDIO_SHARE_PORT);
  return Number.isInteger(raw) && raw > 0 && raw < 65_536
    ? raw
    : studioPort + 5;
}

function expiryOf(raw: unknown): ShareExpiryHours {
  if (raw === undefined || raw === null) return SHARE_DEFAULT_EXPIRY_HOURS;
  if (!SHARE_EXPIRY_HOURS.includes(raw as ShareExpiryHours))
    throw new BadRequestError(
      `expiresInHours must be one of ${SHARE_EXPIRY_HOURS.join(", ")}`
    );
  return raw as ShareExpiryHours;
}

async function canvasFrames(
  deps: ExportDeps,
  project: Project,
  direction: Direction
): Promise<{ frames: ExportFrame[]; ids: string[] }> {
  const frames =
    (
      await readProjectCanvas(project, (id) =>
        deps.projects.projectDir(id)
      ).catch(() => null)
    )?.canvas?.frames ?? [];
  const own = frames
    .filter(
      (f) => !f.hidden && (!f.directionId || f.directionId === direction.id)
    )
    .sort((a, b) => a.order - b.order);
  return {
    frames: own.map((f) => ({
      name: f.label?.trim() || `${f.width} × ${f.height}`,
      width: f.width,
      height: f.height,
      ...(f.path ? { path: f.path } : {}),
    })),
    ids: own.map((f) => f.id),
  };
}

async function framesOf(
  deps: ExportDeps,
  project: Project,
  direction: Direction,
  raw: unknown,
  rawIds: unknown
): Promise<{ frames: ExportFrame[]; ids: (string | undefined)[] }> {
  const given = Array.isArray(raw) && raw.length > 0;
  const picked = given
    ? { frames: parseFrames(raw), ids: [] as string[] }
    : await canvasFrames(deps, project, direction);
  const frames =
    picked.frames.length > 0 ? picked.frames : parseFrames(undefined);
  if (frames.length > SHARE_MAX_FRAMES)
    throw new BadRequestError(`share at most ${SHARE_MAX_FRAMES} frames`);
  return {
    frames,
    ids: given
      ? frameIdsOf(rawIds, frames.length)
      : picked.ids.slice(0, frames.length),
  };
}

export { canvasFrames, expiryOf, framesOf, sharePort };
