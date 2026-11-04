import type { PublishInput } from "../../shared/actions/publish/schema.js";
import type { Project } from "../../shared/contracts.js";
import type { ExportFrame } from "../../shared/export.js";
import type { PublishPlanInput } from "../../shared/publish.js";
import { findFrame, readProjectCanvas } from "../canvas/index.js";
import { BadRequestError } from "../platform/errors/index.js";
import type { LegacyLink } from "./legacy-link.js";

type CanvasFrame = NonNullable<ReturnType<typeof findFrame>>;

const readFrames = async (
  link: LegacyLink,
  project: Project
): Promise<readonly CanvasFrame[]> => {
  try {
    const read = await readProjectCanvas(project, (pid) =>
      link.deps.projects.projectDir(pid)
    );

    return read.canvas?.frames ?? [];
  } catch {
    return [];
  }
};

const toFrameName = (frame: CanvasFrame): string => {
  const label = frame.label?.trim() ?? "";

  if (label !== "") {
    return label;
  }

  return `${frame.width} × ${frame.height}`;
};

const toExportFrame = (frame: CanvasFrame): ExportFrame => {
  const out: ExportFrame = {
    height: frame.height,
    name: toFrameName(frame),
    width: frame.width,
  };

  if (frame.path) {
    out.path = frame.path;
  }

  return out;
};

const pickFrames = async (
  link: LegacyLink,
  projectId: string,
  refs: readonly string[]
): Promise<readonly CanvasFrame[]> => {
  const project = await link.deps.projects.get(projectId);
  const all = await readFrames(link, project);

  return refs.map((ref) => {
    const found = findFrame(all, ref.trim());

    if (!found) {
      throw new BadRequestError(
        `No frame ${ref} on the canvas. Call canvas_list for frame ids.`
      );
    }

    return found;
  });
};

const COPIED_KEYS = [
  "comments",
  "directionId",
  "expiresInDays",
  "noindex",
  "password",
  "publicationId",
  "versionId",
  "viewerComments",
] as const;

const copyFields = (input: PublishInput): PublishPlanInput => {
  const out: PublishPlanInput = {};

  for (const key of COPIED_KEYS) {
    if (Object.hasOwn(input, key)) {
      Object.assign(out, { [key]: input[key] });
    }
  }

  if (input.title) {
    out.title = input.title.trim();
  }

  return out;
};

const toPlanInput = async (
  link: LegacyLink,
  input: PublishInput
): Promise<PublishPlanInput> => {
  const out = copyFields(input);

  if (!input.frames) {
    return out;
  }

  const picked = await pickFrames(link, input.projectId, input.frames);

  out.frames = picked.map((frame) => toExportFrame(frame));
  out.frameIds = picked.map((frame) => frame.id);

  return out;
};

export { toPlanInput };
