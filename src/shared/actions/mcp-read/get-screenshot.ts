import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { PathTextSchema, ScreenshotSchema } from "./schema.js";

const ProjectFieldSchema = ProjectIdSchema.annotate({
  description: "Project id from list_projects",
});

const DirectionFieldSchema = DirectionIdSchema.annotate({
  description: "Direction id. Leave out for the main direction.",
});

const TEXT_MAX = 300;

const PageFieldSchema = PathTextSchema.annotate({
  description:
    'Page path inside the project, for example "about.html". Leave out for the entry page.',
});

const ShotVersionFieldSchema = Schema.String.annotate({
  description:
    "Version id. Leave out to shoot the current files of the direction, unsaved edits included. Pass the head version id for the saved state.",
});

const FrameFieldSchema = Schema.String.check(
  Schema.isMaxLength(TEXT_MAX)
).annotate({
  description:
    "Canvas frame id or @label from canvas_list. It sets the page, the direction, the frame state (signed in, empty …) and the size; width or height given with it render that frame at the other size, for example width 390 for a mobile shot. Leave out to use path, width and height.",
});

const WidthFieldSchema = Schema.Int.check(
  Schema.isBetween({ maximum: 2560, minimum: 320 })
).annotate({
  description:
    "Viewport width in px. Default 1440, or the frame width with frameId.",
});

const HeightFieldSchema = Schema.Int.check(
  Schema.isBetween({ maximum: 2000, minimum: 320 })
).annotate({
  description:
    "Viewport height in px. Default 900, or the frame height with frameId.",
});

const FullPageFieldSchema = Schema.Boolean.annotate({
  description: "Capture the full page height, up to 6000 px. Default false.",
});

const ElementFieldSchema = Schema.String.check(
  Schema.isMaxLength(TEXT_MAX)
).annotate({
  description:
    'Layer id from get_layers (such as "e0k3pz") or a CSS selector: crop the shot to this element plus padding.',
});

const PaddingFieldSchema = Schema.Int.check(
  Schema.isBetween({ maximum: 200, minimum: 0 })
).annotate({ description: "Space around the element crop in px. Default 16." });

const getScreenshotMcpRead = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Get a PNG screenshot of a page at a viewport size, or of one canvas frame (frameId sets the page, the direction, the frame state and the size; pass width to shoot that frame at another width), or of one element on it (element: layer id or CSS selector). Returns the PNG as base64 data with its media type and a note. Over MCP the PNG comes back as an image. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/screenshot" },
  id: "mcp-read.getScreenshot",
  input: Schema.Struct({
    directionId: Schema.optionalKey(DirectionFieldSchema),
    element: Schema.optionalKey(ElementFieldSchema),
    frameId: Schema.optionalKey(FrameFieldSchema),
    fullPage: Schema.optionalKey(FullPageFieldSchema),
    height: Schema.optionalKey(HeightFieldSchema),
    padding: Schema.optionalKey(PaddingFieldSchema),
    path: Schema.optionalKey(PageFieldSchema),
    projectId: ProjectFieldSchema,
    versionId: Schema.optionalKey(ShotVersionFieldSchema),
    width: Schema.optionalKey(WidthFieldSchema),
  }),
  invalidates: [],
  mcp: { name: "get_screenshot" },
  needs: "project.read",
  output: ScreenshotSchema,
  scope: "project",
});

export { getScreenshotMcpRead };
