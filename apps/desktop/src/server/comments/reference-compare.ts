import type { Stats } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";

import type { ReferenceScoreSchema } from "@design-studio/actions/comment/schema";
import type { Direction, Project } from "@design-studio/contracts";
import type { CanvasFileFrame } from "@design-studio/contracts/canvas-file";

import { REFERENCE_LOW_SCORE } from "../../shared/reference.js";
import type { ReferenceScore } from "../../shared/reference.js";
import type { PreviewService } from "../../shared/server-ports.js";
import type { CompareInput } from "../agent/reference-check.js";
import {
  compareToReference,
  mimeOfPath,
  scoreLines,
} from "../agent/reference-check.js";
import { findFrame } from "../canvas/index.js";
import { BadRequestError, NotFoundError } from "../platform/errors/index.js";
import { withPagePath } from "../project-source/index.js";

type ReferenceView = typeof ReferenceScoreSchema.Type;

interface ReferenceQuery {
  readonly directionId: string | null;
  readonly frame: string | null;
  readonly image: string;
  readonly limit: number | null;
  readonly path: string | null;
  readonly projectId: string;
}

interface ReferenceTarget {
  readonly direction: Direction;
  readonly project: Project;
}

interface ReferenceDeps {
  readonly dataDir: string;
  readonly listFrames: (
    project: Project
  ) => Promise<readonly CanvasFileFrame[]>;
  readonly loadTarget: (
    projectId: string,
    directionId: string | null
  ) => Promise<ReferenceTarget>;
  readonly preview: PreviewService;
}

const MAX_MEGABYTES = 20;

const BYTES_PER_MEGABYTE = 1_048_576;

const MAX_BYTES = MAX_MEGABYTES * BYTES_PER_MEGABYTE;

const STEM_RADIX = 36;

const WORST_LISTED = 4;

type ReferenceFields = Omit<ReferenceView, "frame">;

const toScoreFields = (
  score: ReferenceScore,
  listed: number
): ReferenceFields => ({
  contentScore: score.contentScore,
  diffPath: score.diffPath,
  differsPct: score.differsPct,
  edgeScore: score.edgeScore,
  matches: score.score >= REFERENCE_LOW_SCORE,
  ms: score.ms,
  notes: scoreLines(score, listed),
  renderPath: score.renderPath,
  score: score.score,
  size: `${score.width}x${score.height}`,
  worst: score.regions.slice(0, listed),
});

const toScoreView = (
  score: ReferenceScore,
  listed: number,
  frame: ReferenceView["frame"]
): ReferenceView => ({ ...toScoreFields(score, listed), frame });

const toFileInfo = async (file: string): Promise<Stats | null> => {
  try {
    return await stat(file);
  } catch {
    return null;
  }
};

const inspectImageFile = async (file: string): Promise<string> => {
  if (!path.isAbsolute(file)) {
    throw new BadRequestError("image must be an absolute path.");
  }

  const mime = mimeOfPath(file);

  if (mime === null) {
    throw new BadRequestError(
      "image must be a .png, .jpg, .jpeg, .gif or .webp file."
    );
  }

  const info = await toFileInfo(file);

  if (!info?.isFile()) {
    throw new NotFoundError(`No file at ${file}.`);
  }

  if (info.size > MAX_BYTES) {
    throw new BadRequestError("image is larger than 20 MB.");
  }

  return mime;
};

const getReferenceFrame = async (
  deps: ReferenceDeps,
  target: ReferenceTarget,
  query: ReferenceQuery
): Promise<CanvasFileFrame | null> => {
  const all = await deps.listFrames(target.project);

  if (query.frame !== null) {
    const found = findFrame(all, query.frame);

    if (!found) {
      throw new NotFoundError(
        `No frame ${query.frame} on the canvas. Call canvas_list for frame ids.`
      );
    }

    return found;
  }

  const [first = null] = all
    .filter(
      (frame) =>
        frame.hidden !== true &&
        (!frame.directionId || frame.directionId === target.direction.id)
    )
    .toSorted((left, right) => left.order - right.order);

  return first;
};

const toFrameView = (frame: CanvasFileFrame | null): ReferenceView["frame"] => {
  if (frame === null) {
    return null;
  }

  return { id: frame.id, label: frame.label ?? null, path: frame.path ?? "" };
};

const toFrameStem = (
  projectId: string,
  frame: CanvasFileFrame | null
): string =>
  `${projectId}-${(frame?.id ?? "page").replaceAll(/[^A-Za-z0-9_-]/gu, "")}-${Date.now().toString(STEM_RADIX)}`;

const inspectReferenceFrame = async (
  deps: ReferenceDeps,
  query: ReferenceQuery
): Promise<ReferenceView> => {
  const [imageMime, target] = await Promise.all([
    inspectImageFile(query.image),
    deps.loadTarget(query.projectId, query.directionId),
  ]);

  const [frame, base] = await Promise.all([
    getReferenceFrame(deps, target, query),
    deps.preview.directionUrl(target.project, target.direction),
  ]);

  const pageUrl = withPagePath(base, query.path ?? frame?.path ?? "");

  const input: CompareInput = {
    file: query.image,
    mime: imageMime,
    outDir: path.join(deps.dataDir, "reference"),
    preview: deps.preview,
    stem: toFrameStem(target.project.id, frame),
    url: pageUrl,
  };

  if (frame) {
    input.frameWidth = frame.width;
  }

  const score = await compareToReference(input);

  return toScoreView(score, query.limit ?? WORST_LISTED, toFrameView(frame));
};

export { WORST_LISTED, inspectReferenceFrame, toScoreFields, toScoreView };

export type { ReferenceDeps, ReferenceQuery, ReferenceView };
