import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { FrameDirectionField } from "./frame/schema.js";
import {
  SectionCoordSchema,
  SectionFrameListSchema,
  SectionIdSchema,
  SectionLabelSchema,
  SectionSetSchema,
  SectionSideSchema,
} from "./section/schema.js";

const setSectionCanvas = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_section_canvas",
    set: "core",
    short:
      "Create or change a canvas section: label, position, size and the frames that move with it.",
  },
  confirm: "none",
  description:
    "Create or change one canvas section: a labeled box that groups frames. Leave section null to create. Frames in frameIds move with the section. Undo reverses it.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "PUT", path: "/api/projects/:projectId/canvas/sections" },
  id: "canvas.setSection",
  input: Schema.Struct({
    ...FrameDirectionField,
    frameIds: Schema.NullOr(SectionFrameListSchema).annotate({
      description:
        "Frame ids or @labels that move with the section by the same x and y change. Null moves none.",
    }),
    height: SectionSideSchema,
    label: SectionLabelSchema,
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects.",
    }),
    section: Schema.NullOr(SectionIdSchema).annotate({
      description: "Section id to change. Null creates a new section.",
    }),
    width: SectionSideSchema,
    x: SectionCoordSchema,
    y: SectionCoordSchema,
  }),
  invalidates: ["canvas.inspect"],
  mcp: { name: "set_section_canvas" },
  needs: "studio.write",
  output: SectionSetSchema,
  scope: "project",
});

export { setSectionCanvas };
