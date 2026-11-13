import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { FrameDirectionField } from "./frame/schema.js";
import { FramesTidiedSchema, TidyFields } from "./tidy/schema.js";

const moveFramesCanvas = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "move_frames_canvas",
    set: "core",
    short:
      "Tidy up canvas frames: line them up in rows, one row or a near-square grid, with an even gap.",
  },
  confirm: "none",
  description:
    "Move canvas frames into a tidy layout with an even gap. Layout tidy keeps the rows it finds, row puts all frames in one line, and grid makes a near-square grid. Give a section id to tidy only the frames in that section and fit the section to them; frames and section together are refused. Hidden frames stay. Links keep their frames. Undo restores the old places.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/canvas/frames/tidy" },
  id: "canvas.moveFrames",
  input: Schema.Struct({
    ...FrameDirectionField,
    ...TidyFields,
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects.",
    }),
  }),
  invalidates: ["canvas.getDoc", "canvas.inspect"],
  mcp: { name: "move_frames_canvas" },
  needs: "studio.write",
  output: FramesTidiedSchema,
  scope: "project",
});

export { moveFramesCanvas };
