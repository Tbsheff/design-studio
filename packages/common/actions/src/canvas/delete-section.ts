import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { FrameDirectionField } from "./frame/schema.js";
import { SectionIdSchema, SectionRemovedSchema } from "./section/schema.js";

const deleteSectionCanvas = defineAction({
  access: "destructive",
  agent: {
    lean: false,
    name: "delete_section_canvas",
    set: "core",
    short: "Remove one canvas section. The frames inside it stay.",
  },
  confirm: "user",
  description:
    "Remove one canvas section. The frames inside it stay on the canvas. Undo brings the section back.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "DELETE", path: "/api/projects/:projectId/canvas/sections" },
  id: "canvas.deleteSection",
  input: Schema.Struct({
    ...FrameDirectionField,
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects.",
    }),
    section: SectionIdSchema.annotate({ description: "Section id to remove." }),
  }),
  invalidates: ["canvas.inspect"],
  mcp: { name: "delete_section_canvas" },
  needs: "studio.write",
  output: SectionRemovedSchema,
  scope: "project",
});

export { deleteSectionCanvas };
