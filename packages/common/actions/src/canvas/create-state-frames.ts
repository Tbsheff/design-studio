import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import {
  StateBoardFields,
  StateFramesCreatedSchema,
} from "./state-frames/schema.js";

const createStateFramesCanvas = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "create_state_frames_canvas",
    set: "app",
    short:
      "Show one page in every state side by side: one frame per state (loading, empty, error, signed in) in a row below it.",
  },
  confirm: "none",
  description:
    "Make a state board for one page. The tool places one frame per frame state in a row below the frame, in a section named after the page, and pins each new frame to its state: loading, empty, error, session and the custom states of the project, at most 8. A second call on the same page keeps the earlier board frames and adds only the missing states. Undo removes the whole board in one step. States change only calls from the browser, so on an HTML page or a page with no client fetch the frames look the same. Use get_screenshot with frameId to see each state.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/canvas/state-frames",
  },
  id: "canvas.createStateFrames",
  input: Schema.Struct({
    ...StateBoardFields,
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects.",
    }),
  }),
  invalidates: ["canvas.getDoc", "canvas.inspect", "canvas.listFrameStates"],
  mcp: { name: "create_state_frames_canvas" },
  needs: "project.update",
  output: StateFramesCreatedSchema,
  scope: "project",
});

export { createStateFramesCanvas };
