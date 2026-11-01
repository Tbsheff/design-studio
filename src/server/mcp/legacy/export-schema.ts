import { z } from "zod";

import {
  EXPORT_FRAME_MAX_SIDE,
  EXPORT_MAX_FRAMES,
} from "../../../shared/export.js";
import { directionId, id, projectId } from "../edit-kit.js";

const FRAME_NAME_MAX = 60;
const FRAME_PATH_MAX = 200;
const FOLDER_MAX = 4096;
const SCALE_MAX = 3;

const exportFrame = z.strictObject({
  name: z.string().max(FRAME_NAME_MAX).optional(),
  width: z.number().int().min(1).max(EXPORT_FRAME_MAX_SIDE),
  height: z.number().int().min(1).max(EXPORT_FRAME_MAX_SIDE),
  path: z.string().max(FRAME_PATH_MAX).optional(),
});

const exportFrames = z
  .array(exportFrame)
  .min(1)
  .max(EXPORT_MAX_FRAMES)
  .optional()
  .describe(
    "Frames to capture. Default one 1440x900 frame (handoff: desktop and mobile)."
  );

const scales = [z.literal(1), z.literal(2), z.literal(SCALE_MAX)] as const;

const exportSchema = z.strictObject({
  projectId,
  directionId,
  versionId: id(
    "Version id. Leave out for the newest version of the direction."
  ).optional(),
  format: z
    .enum(["png", "html", "pdf", "handoff", "zip"])
    .describe(
      "png, html, pdf, handoff (folder for a coding agent, as a zip) or zip (source files)."
    ),
  scale: z.union(scales).default(1).describe("PNG pixel scale."),
  frames: exportFrames,
  folder: z
    .string()
    .min(1)
    .max(FOLDER_MAX)
    .optional()
    .describe(
      "Absolute path of an existing folder. Leave out for the Design Studio data folder (exports/<projectId>). Another folder outside the projects folder waits for the user to approve it in Design Studio."
    ),
});

type ExportInput = z.output<typeof exportSchema>;

export { exportSchema };

export type { ExportInput };
