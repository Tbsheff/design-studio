import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { FrameDirectionField, FrameNameSchema } from "./frame/schema.js";

const FIT_FRAME_MAX = 20;

const FitFrameListSchema = Schema.Array(FrameNameSchema).check(
  Schema.isMinLength(1),
  Schema.isMaxLength(FIT_FRAME_MAX)
);

const FittedFrameSchema = Schema.Struct({
  id: Schema.String,
  label: Schema.NullOr(Schema.String),
  newHeight: Schema.Int,
  oldHeight: Schema.Int,
  warning: Schema.NullOr(Schema.String),
});

const FramesFittedSchema = Schema.Struct({
  frames: Schema.Array(FittedFrameSchema),
  note: Schema.String,
  warnings: Schema.Array(Schema.String),
});

const setFrameHeightsCanvas = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_frame_heights_canvas",
    set: "core",
    short:
      "Fit canvas frames to their page height. The width stays; undo restores the old heights.",
  },
  confirm: "none",
  description:
    "Set the height of canvas frames to fit their page. The server renders each frame page at the frame width and a fixed device height, and reads the page height. The frame width does not change. A page with sections sized to the screen height keeps its height at the device size and gives a warning. Undo restores the old heights.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "PUT",
    path: "/api/projects/:projectId/canvas/frames/heights",
  },
  id: "canvas.setFrameHeights",
  input: Schema.Struct({
    ...FrameDirectionField,
    frames: FitFrameListSchema.annotate({
      description:
        "Frame ids or @labels to fit, 1 to 20. Call canvas_list for the ids.",
    }),
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects.",
    }),
  }),
  invalidates: ["canvas.inspect"],
  mcp: { name: "set_frame_heights_canvas" },
  needs: "project.update",
  output: FramesFittedSchema,
  scope: "project",
});

export { setFrameHeightsCanvas };
