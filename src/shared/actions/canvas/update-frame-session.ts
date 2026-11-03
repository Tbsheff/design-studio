import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { FrameStatesViewSchema, MockUserSchema } from "./schema.js";

const updateFrameSessionCanvas = defineAction({
  access: "edit",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Change the session that signed-in frame states use: the mock user, or forget the cookies kept from a real sign-in.",
  errors: [BadRequest, NotFound],
  http: {
    method: "PATCH",
    path: "/api/projects/:projectId/frame-states/session",
  },
  id: "canvas.updateFrameSession",
  input: Schema.Struct({
    forget: Schema.optionalKey(Schema.Boolean),
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
    user: Schema.optionalKey(MockUserSchema),
  }),
  invalidates: ["canvas.listFrameStates"],
  mcp: { name: "set_frame_session" },
  needs: "project.update",
  output: FrameStatesViewSchema,
  scope: "project",
});

export { updateFrameSessionCanvas };
