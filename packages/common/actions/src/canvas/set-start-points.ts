import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import {
  StartPointListInputSchema,
  StartPointsOutputSchema,
} from "./start/schema.js";

const setStartPointsCanvas = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_start_points_canvas",
    set: "core",
    short: "Set the named frames where Play mode can start.",
  },
  confirm: "none",
  description:
    "Set the named start points where Play can start in the prototype. Send the whole list. An empty list removes all start points. Each change is one step in the edit history.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "PUT", path: "/api/projects/:projectId/links/starts" },
  id: "canvas.setStartPoints",
  input: Schema.Struct({
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
    starts: StartPointListInputSchema,
  }),
  invalidates: [
    "canvas.listImplicitLinks",
    "canvas.listLinks",
    "canvas.listFlowLinks",
  ],
  mcp: { name: "set_start_points_canvas" },
  needs: "project.update",
  output: StartPointsOutputSchema,
  scope: "project",
});

export { setStartPointsCanvas };
