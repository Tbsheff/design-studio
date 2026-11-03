import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { FrameRefSchema, LinkFileSchema } from "./schema.js";

const setStartLinkCanvas = defineAction({
  access: "edit",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Set the frame where Play starts in the prototype. Each change is one step in the edit history.",
  errors: [BadRequest, NotFound],
  http: { method: "PUT", path: "/api/projects/:projectId/links/start" },
  id: "canvas.setStartLink",
  input: Schema.Struct({
    frame: FrameRefSchema.annotate({
      description: "Frame id or @label where Play starts.",
    }),
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
  }),
  invalidates: ["canvas.listImplicitLinks", "canvas.listLinks"],
  mcp: { name: "set_start_frame" },
  needs: "project.update",
  output: LinkFileSchema,
  scope: "project",
});

export { setStartLinkCanvas };
