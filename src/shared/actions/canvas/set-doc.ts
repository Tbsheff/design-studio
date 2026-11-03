import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { BaseHashSchema, CanvasDocSchema, WriterIdSchema } from "./schema.js";

const setDocCanvas = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Write the canvas document of a project. Pass baseHash from getDoc to refuse a write over a newer canvas. Set migrate to mark a layout migration.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "PUT", path: "/api/projects/:projectId/canvas" },
  id: "canvas.setDoc",
  input: Schema.Struct({
    baseHash: Schema.optionalKey(BaseHashSchema),
    canvas: Schema.Unknown,
    migrate: Schema.optionalKey(Schema.Boolean),
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
    writer: Schema.optionalKey(WriterIdSchema),
  }),
  invalidates: ["canvas.getDoc"],
  mcp: { off: "ui-bootstrap" },
  needs: "project.update",
  output: CanvasDocSchema,
  scope: "project",
});

export { setDocCanvas };
