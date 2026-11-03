import { stat } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import {
  COMPARE_TO_REFERENCE_TEXT,
  REFERENCE_LOW_SCORE,
} from "../../shared/reference.js";
import type { ReferenceScore } from "../../shared/reference.js";
import { compareToReference, mimeOfPath, scoreLines } from "../agent/index.js";
import { findFrame, frameRef } from "../canvas/tools.js";
import { EditError, loadTarget } from "./edit-guards.js";
import type { EditDeps } from "./edit-guards.js";
import {
  defineTool,
  directionId,
  ok,
  pagePath,
  pageUrl,
  projectId,
} from "./edit-kit.js";
import type { Done } from "./edit-kit.js";

const MAX_BYTES = 20 * 1024 * 1024;

const schema = z
  .object({
    projectId,
    directionId,
    image: z
      .string()
      .trim()
      .min(1)
      .max(4096)
      .describe("Absolute path of the reference picture on this computer."),
    frame: frameRef
      .optional()
      .describe(
        "Frame id or @label from canvas_list. Leave out for the first frame of the direction."
      ),
    path: pagePath,
  })
  .strict();

type Input = z.output<typeof schema>;

export function scoreOutput(score: ReferenceScore) {
  return {
    score: score.score,
    contentScore: score.contentScore,
    edgeScore: score.edgeScore,
    matches: score.score >= REFERENCE_LOW_SCORE,
    size: `${score.width}x${score.height}`,
    differsPct: score.differsPct,
    worst: score.regions.slice(0, 4),
    diffPath: score.diffPath,
    renderPath: score.renderPath,
    ms: score.ms,
    notes: scoreLines(score),
  };
}

async function checkImage(file: string): Promise<string> {
  if (!path.isAbsolute(file)) {
    throw new EditError("image must be an absolute path.");
  }

  const mime = mimeOfPath(file);

  if (!mime) {
    throw new EditError(
      "image must be a .png, .jpg, .jpeg, .gif or .webp file."
    );
  }

  const info = await stat(file).catch(() => null);

  if (!info?.isFile()) {
    throw new EditError(`No file at ${file}.`);
  }

  if (info.size > MAX_BYTES) {
    throw new EditError("image is larger than 20 MB.");
  }

  return mime;
}

async function frameOf(
  deps: EditDeps,
  target: Awaited<ReturnType<typeof loadTarget>>,
  input: Input
) {
  const all = (await deps.canvas.read(target.project)).canvas?.frames ?? [];

  if (input.frame) {
    const found = findFrame(all, input.frame);

    if (!found) {
      throw new EditError(
        `No frame ${input.frame} on the canvas. Call canvas_list for frame ids.`
      );
    }

    return found;
  }

  return (
    all
      .filter(
        (frame) =>
          !frame.hidden &&
          (!frame.directionId || frame.directionId === target.direction.id)
      )
      .sort((a, b) => a.order - b.order)[0] ?? null
  );
}

const compareTool = defineTool(
  "compare_to_reference",
  schema,
  {
    title: "Compare to a reference picture",
    description: COMPARE_TO_REFERENCE_TEXT,
    readOnly: true,
    idempotent: true,
  },
  async (deps, input): Promise<Done> => {
    const mime = await checkImage(input.image);
    const target = await loadTarget(deps, input.projectId, input.directionId);
    const frame = await frameOf(deps, target, input);
    const page = input.path ?? frame?.path;
    const url = await pageUrl(deps, target.project, target.direction, page);
    const stem = `${target.project.id}-${(frame?.id ?? "page").replaceAll(/[^A-Za-z0-9_-]/g, "")}-${Date.now().toString(36)}`;

    const score = await compareToReference({
      preview: deps.preview,
      url,
      file: input.image,
      mime,
      ...(frame ? { frameWidth: frame.width } : {}),
      outDir: path.join(deps.dataDir, "reference"),
      stem,
    });

    return {
      result: ok({
        frame: frame
          ? { id: frame.id, label: frame.label ?? null, path: frame.path ?? "" }
          : null,
        ...scoreOutput(score),
      }),
    };
  }
);

export const REFERENCE_TOOLS = [compareTool];
