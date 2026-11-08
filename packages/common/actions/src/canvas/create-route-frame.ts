import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { FrameRouteFields, FramesPlacedSchema } from "./frame/schema.js";

const createRouteFrameCanvas = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "add_route_frame",
    set: "app",
    short:
      "Attached apps only. Add a canvas frame that shows one route of the app at a viewport.",
  },
  confirm: "none",
  description:
    "Add a canvas frame that shows one route of an attached app at a viewport. get_screenshot with the returned frame id renders it. On a canvas with no saved frames, the first route frame is f1 and replaces the default entry-page frame.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/canvas/route-frames",
  },
  id: "canvas.createRouteFrame",
  input: Schema.Struct({
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects.",
    }),
    ...FrameRouteFields,
  }),
  invalidates: ["canvas.inspect"],
  mcp: { name: "add_route_frame" },
  needs: "project.update",
  output: FramesPlacedSchema,
  scope: "project",
});

export { createRouteFrameCanvas };
