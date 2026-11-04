import { frameRef, placeSchema } from "../../canvas/index.js";
import { z } from "../../platform/zod-bridge/index.js";
import { directionId, pagePath, PATH_MAX, projectId } from "../edit-kit.js";

const FRAMES_MAX = 12;
const POINT_SELECTOR_MAX = 400;
const SIDE_MIN = 200;
const SIDE_MAX = 4000;
const LABEL_MAX = 40;

const VIEWPORT_TEXT =
  "desktop 1440x900, tablet 768x1024 or mobile 390x844. Default desktop.";

const FRAME_TEXT = "Frame id or @label.";

const viewport = z.enum(["desktop", "tablet", "mobile"]);

const placeFrames = z.array(placeSchema).min(1).max(FRAMES_MAX);

const canvasListSchema = z.strictObject({ projectId, directionId });

const canvasPlaceSchema = z.strictObject({
  projectId,
  directionId,
  frames: placeFrames,
});

const canvasPointSchema = z.strictObject({
  projectId,
  directionId,
  frame: frameRef.describe(FRAME_TEXT),
  selector: z.string().max(POINT_SELECTOR_MAX).optional(),
});

const addFrameSchema = z.strictObject({
  projectId,
  directionId,
  path: pagePath,
  viewport: viewport.optional().describe(VIEWPORT_TEXT),
  width: z.number().int().min(SIDE_MIN).max(SIDE_MAX).optional(),
  height: z.number().int().min(SIDE_MIN).max(SIDE_MAX).optional(),
  label: z
    .string()
    .max(LABEL_MAX)
    .optional()
    .describe('Short frame name, for example "Empty state".'),
  rightOf: frameRef
    .optional()
    .describe("Put the new frame to the right of this frame (id or @label)."),
  below: frameRef
    .optional()
    .describe("Put the new frame under this frame (id or @label)."),
});

const removeFrameSchema = z.strictObject({
  projectId,
  frame: frameRef.describe(FRAME_TEXT),
});

const addRouteFrameSchema = z.strictObject({
  projectId,
  route: z
    .string()
    .trim()
    .min(1)
    .max(PATH_MAX)
    .describe(
      'App route from list_routes with the dynamic segments filled in, for example "/design-system" or "/patients/123".'
    ),
  viewport: viewport.optional().describe(VIEWPORT_TEXT),
  label: z.string().max(LABEL_MAX).optional(),
  rightOf: frameRef.optional(),
  below: frameRef.optional(),
});

type CanvasPointInput = z.output<typeof canvasPointSchema>;

type AddFrameInput = z.output<typeof addFrameSchema>;

type RemoveFrameInput = z.output<typeof removeFrameSchema>;

type AddRouteFrameInput = z.output<typeof addRouteFrameSchema>;

export {
  addFrameSchema,
  addRouteFrameSchema,
  canvasListSchema,
  canvasPlaceSchema,
  canvasPointSchema,
  removeFrameSchema,
};

export type {
  AddFrameInput,
  AddRouteFrameInput,
  CanvasPointInput,
  RemoveFrameInput,
};
