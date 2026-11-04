import { rm } from "node:fs/promises";

import type { Direction, Project } from "@design-studio/contracts";
import { isFrameId } from "@design-studio/contracts/canvas-file";
import type { CanvasFileFrame } from "@design-studio/contracts/canvas-file";
import type { ExportFrame } from "@design-studio/contracts/export";
import { SHARE_MAX_FRAMES, shareUrl } from "@design-studio/contracts/share";
import type {
  ShareLink,
  ShareServerState,
  StudioCursorInput,
} from "@design-studio/contracts/share";

import { findFrame, readProjectCanvas } from "../canvas/index.js";
import { resolveSource } from "../export/source.js";
import type { ExportDeps } from "../export/source.js";
import {
  BadRequestError,
  NotFoundError,
  assertSafeId,
} from "../platform/errors/index.js";
import { canvasFrames, expiryOf } from "./frames.js";
import type { ShareListener as ShareServer } from "./listener.js";
import type { LiveHub } from "./live.js";
import { captureShare } from "./snapshot.js";
import { isLive, toLink } from "./store.js";
import type { ShareRecord, ShareStore as ShareFiles } from "./store.js";

interface ShareLinkDeps extends ExportDeps {
  readonly dataDir: string;
}

interface ShareParts {
  readonly deps: ShareLinkDeps;
  readonly files: ShareFiles;
  readonly hub: LiveHub;
  readonly kick: () => void;
  readonly server: ShareServer;
}

interface CreateRequest {
  readonly directionId?: string | null;
  readonly expiresInHours?: number;
  readonly frames?: readonly string[];
  readonly live?: boolean;
  readonly projectId: string;
  readonly title?: string;
  readonly versionId?: string;
}

interface CursorRequest {
  readonly frameId?: string | null;
  readonly pointX?: number;
  readonly pointY?: number;
}

interface CreatedLink {
  readonly link: ShareLink;
  readonly server: ShareServerState;
  readonly token: string;
  readonly url: string | null;
}

interface RevokedLink {
  readonly link: ShareLink | null;
  readonly server: ShareServerState;
}

interface PickedFrames {
  readonly frames: ExportFrame[];
  readonly ids: string[];
}

const CURSOR_MAX = 100_000;

const HOUR_MS = 3_600_000;

const TITLE_MAX = 120;

const toTitle = (raw: string | null, project: Project): string => {
  const text = (raw ?? "")
    .replaceAll(/[\p{Cc}\s]+/gu, " ")
    .trim()
    .slice(0, TITLE_MAX);

  return text || project.name;
};

const wantedDirection = (raw: string | null): string | null => {
  if (raw === null || raw === "") {
    return null;
  }

  return assertSafeId(raw, "directionId");
};

const toDirection = (project: Project, raw: string | null): Direction => {
  const did = wantedDirection(raw) ?? project.directions[0]?.id;
  const direction = project.directions.find((item) => item.id === did);

  if (!direction) {
    throw new NotFoundError("direction not found");
  }

  return direction;
};

const toExportFrame = (found: CanvasFileFrame): ExportFrame => {
  const frame: ExportFrame = {
    height: found.height,
    name: found.label?.trim() || `${found.width} × ${found.height}`,
    width: found.width,
  };

  if (found.path) {
    frame.path = found.path;
  }

  return frame;
};

const readFrames = async (
  deps: ShareLinkDeps,
  project: Project
): Promise<readonly CanvasFileFrame[]> => {
  try {
    const read = await readProjectCanvas(project, (id) =>
      deps.projects.projectDir(id)
    );

    return read?.canvas?.frames ?? [];
  } catch {
    return [];
  }
};

const pickFrames = async (
  deps: ShareLinkDeps,
  project: Project,
  refs: readonly string[]
): Promise<PickedFrames> => {
  const all = await readFrames(deps, project);

  const picked = refs.map((ref) => {
    const found = findFrame(all, ref);

    if (!found) {
      throw new BadRequestError(
        `No frame ${ref} on the canvas. Call canvas_list for frame ids.`
      );
    }

    return found;
  });

  return {
    frames: picked.map((found) => toExportFrame(found)),
    ids: picked.map((found) => found.id),
  };
};

const pickOrAll = async (
  deps: ShareLinkDeps,
  project: Project,
  direction: Direction,
  refs: readonly string[]
): Promise<PickedFrames> => {
  if (refs.length > 0) {
    return await pickFrames(deps, project, refs);
  }

  return await canvasFrames(deps, project, direction);
};

const framesFor = async (
  deps: ShareLinkDeps,
  project: Project,
  direction: Direction,
  refs: readonly string[]
): Promise<PickedFrames> => {
  const picked = await pickOrAll(deps, project, direction, refs);

  if (picked.frames.length > SHARE_MAX_FRAMES) {
    throw new BadRequestError(`share at most ${SHARE_MAX_FRAMES} frames`);
  }

  return picked;
};

const findLink = async (
  parts: ShareParts,
  projectId: string,
  shareId: string
): Promise<ShareRecord> => {
  const project = await parts.deps.projects.get(
    assertSafeId(projectId, "projectId")
  );

  const id = assertSafeId(shareId, "shareId");
  const records = await parts.files.list(project.id);
  const found = records.find((record) => record.id === id);

  if (!found) {
    throw new NotFoundError("share link not found");
  }

  return found;
};

const urlOf = (server: ShareServerState, token: string): string | null => {
  if (server.localUrl === null) {
    return null;
  }

  return shareUrl(server.localUrl, token);
};

const loadTarget = async (
  parts: ShareParts,
  input: CreateRequest
): Promise<{ readonly direction: Direction; readonly project: Project }> => {
  const project = await parts.deps.projects.get(
    assertSafeId(input.projectId, "projectId")
  );

  return {
    direction: toDirection(project, input.directionId ?? null),
    project,
  };
};

const createLink = async (
  parts: ShareParts,
  input: CreateRequest
): Promise<CreatedLink> => {
  const { deps, files } = parts;
  const { direction, project } = await loadTarget(parts, input);
  const versionId = input.versionId ?? direction.headVersionId;

  if (!versionId) {
    throw new BadRequestError("Save a version before you share it.");
  }

  const endsAt = Date.now() + expiryOf(input.expiresInHours) * HOUR_MS;

  const [source, picked] = await Promise.all([
    resolveSource(deps, project.id, versionId),
    framesFor(deps, project, direction, input.frames ?? []),
  ]);

  const id = files.newId();
  const dir = files.framesDir(id);

  try {
    const shots = await captureShare(
      deps.preview,
      source,
      picked.frames,
      dir,
      picked.ids
    );

    const made = await files.add(id, {
      directionId: direction.id,
      expiresAt: endsAt,
      frames: shots,
      live: input.live === true,
      projectId: project.id,
      title: toTitle(input.title ?? null, project),
      versionId: source.version.id,
    });

    const state = await parts.server.sync();

    parts.kick();

    return {
      link: toLink(made.record),
      server: state,
      token: made.token,
      url: urlOf(state, made.token),
    };
  } catch (error) {
    await rm(dir, { force: true, recursive: true });

    throw error;
  }
};

const toRevokedLink = (record: ShareRecord | null): ShareLink | null => {
  if (record === null) {
    return null;
  }

  return toLink(record);
};

const revokeLink = async (
  parts: ShareParts,
  projectId: string,
  shareId: string
): Promise<RevokedLink> => {
  const found = await findLink(parts, projectId, shareId);
  const revoked = await parts.files.revoke(found.id);

  await parts.hub.close(found.id);

  const state = await parts.server.sync();

  return { link: toRevokedLink(revoked), server: state };
};

const setStudioCursor = async (
  parts: ShareParts,
  projectId: string,
  shareId: string,
  isOn: boolean
): Promise<{ readonly link: ShareLink }> => {
  const found = await findLink(parts, projectId, shareId);

  if (!found.live || !isLive(found)) {
    throw new BadRequestError("Only an active live link can show your cursor.");
  }

  const next = await parts.files.update(found.id, { studioCursor: isOn });

  if (!next) {
    throw new NotFoundError("share link not found");
  }

  parts.hub.setStudioCursor(next);

  return { link: toLink(next, Date.now(), parts.hub.count(next.id)) };
};

const isInRange = (value: number): boolean =>
  Number.isFinite(value) && value >= 0 && value <= CURSOR_MAX;

const toCursor = (input: CursorRequest): StudioCursorInput | null => {
  const frameId = input.frameId ?? null;

  if (frameId === null) {
    return null;
  }

  if (!isFrameId(frameId)) {
    throw new BadRequestError("frameId must be a canvas frame id or null");
  }

  const pointX = Number(input.pointX);
  const pointY = Number(input.pointY);

  if (!isInRange(pointX) || !isInRange(pointY)) {
    throw new BadRequestError("x and y must be numbers from 0 to 100000");
  }

  return { frameId, x: pointX, y: pointY };
};

const setCursor = async (
  parts: ShareParts,
  projectId: string,
  input: CursorRequest
): Promise<Record<string, never>> => {
  const project = await parts.deps.projects.get(
    assertSafeId(projectId, "projectId")
  );

  parts.hub.studioCursor(project.id, toCursor(input));

  return {};
};

export {
  createLink,
  findLink,
  framesFor,
  loadTarget,
  revokeLink,
  setCursor,
  setStudioCursor,
};

export type {
  CreatedLink,
  CreateRequest,
  CursorRequest,
  RevokedLink,
  ShareLinkDeps,
  ShareParts,
};
