import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { StateCheckFields, StateCheckSchema } from "./state-frames/schema.js";

const inspectStateFramesCanvas = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "inspect_state_frames_canvas",
    set: "app",
    short:
      "Read only. Compare each state frame of a state board with the default frame and find the states that look like the default.",
  },
  confirm: "none",
  description:
    "Compare each frame of the state board of one page with the default frame of that page. The tool takes a screenshot of each frame in its state and gives the similarity to the default. A state at or above the threshold looks like the default, so the page has no UI of its own for that state. Captures run one at a time. To design the missing states, call start_run once per item with isSameAsDefault true, with canvas set to its frame, and wait with get_run before the next run.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/canvas/state-frames" },
  id: "canvas.inspectStateFrames",
  input: Schema.Struct({
    ...StateCheckFields,
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects.",
    }),
  }),
  invalidates: [],
  mcp: { name: "inspect_state_frames_canvas" },
  needs: "project.read",
  output: StateCheckSchema,
  scope: "project",
});

export { inspectStateFramesCanvas };
