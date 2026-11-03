import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { FrameStatesViewSchema } from "./schema.js";

const listFrameStatesCanvas = defineAction({
  access: "read",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "List the preview states of an attached app (signed in, empty, loading, error and mock states), which frame shows which state, and the session in use.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/frame-states" },
  id: "canvas.listFrameStates",
  input: Schema.Struct({
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
  }),
  invalidates: [],
  mcp: { name: "list_frame_states" },
  needs: "project.read",
  output: FrameStatesViewSchema,
  scope: "project",
});

export { listFrameStatesCanvas };
