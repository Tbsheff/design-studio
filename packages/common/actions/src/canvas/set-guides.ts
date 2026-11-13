import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { GuideListSchema, GuidesSetSchema } from "./guide/schema.js";

const setGuidesCanvas = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_guides_canvas",
    set: "core",
    short:
      "Set the ruler guides on the canvas. Send the whole list; an empty list removes all guides.",
  },
  confirm: "none",
  description:
    "Set the ruler guides on the canvas of a project. Send the whole list. An empty list removes all guides. Frames snap to guides when the user drags them. Undo reverses each change.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/canvas/guides" },
  id: "canvas.setGuides",
  input: Schema.Struct({
    guides: GuideListSchema,
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects.",
    }),
  }),
  invalidates: ["canvas.inspect"],
  mcp: { name: "set_guides_canvas" },
  needs: "project.update",
  output: GuidesSetSchema,
  scope: "project",
});

export { setGuidesCanvas };
