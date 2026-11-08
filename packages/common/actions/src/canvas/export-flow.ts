import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { Unavailable } from "../_core/errors/unavailable.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { FlowVideoFields, FlowVideoResultSchema } from "./schema.js";

const exportFlowCanvas = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "export_flow_canvas",
    set: "app",
    short:
      "Record a click-through video (webm, mp4 or gif) of the prototype flow by following saved links from the start frame.",
  },
  confirm: "none",
  description:
    "Record a click-through video of the prototype flow. Starts at the start frame, moves a cursor to each linked element, clicks it and shows the target frame. Writes a webm, mp4 or gif file in the project exports folder. Returns the steps and the path. Changes no design file.",
  errors: [BadRequest, Conflict, NotFound, Unavailable],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/flow/export",
  },
  id: "canvas.exportFlow",
  input: Schema.Struct({
    ...FlowVideoFields,
    directionId: Schema.NullOr(DirectionIdSchema).annotate({
      description: "Direction id. Leave null for the main direction.",
    }),
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
  }),
  invalidates: ["canvas.listLinks"],
  mcp: { name: "export_flow_canvas" },
  needs: "project.read",
  output: FlowVideoResultSchema,
  scope: "project",
});

export { exportFlowCanvas };
