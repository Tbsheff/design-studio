import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { RenderCheckListSchema } from "./schema.js";

const runDirectEdit = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Run a render check on a direction. Returns one result for each viewport, with layout findings and errors.",
  errors: [BadRequest, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/check",
  },
  id: "direct-edit.run",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.update",
  output: RenderCheckListSchema,
  scope: "project",
});

export { runDirectEdit };
