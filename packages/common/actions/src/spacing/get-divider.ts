import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { ElementSourceFields } from "../_core/element-target.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DividerInfoSchema, DividerVariantSchema } from "./divider/schema.js";

const getDividerSpacing = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "get_divider_spacing",
    set: "core",
    short:
      "Read the lines between the items of one stack: axis, width, color and token.",
  },
  confirm: "none",
  description:
    "Read the lines that one element draws between its children, from its Tailwind divide classes. axis is x, y or null when there are no lines. width is in px. color and token name the line color. isReverse is true for divide-y-reverse. variant reads one state or breakpoint prefix such as md:. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/spacing/divider",
  },
  id: "spacing.getDivider",
  input: Schema.Struct({
    ...ElementSourceFields,
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
    variant: DividerVariantSchema,
  }),
  invalidates: [],
  mcp: { name: "get_divider_spacing" },
  needs: "project.read",
  output: DividerInfoSchema,
  scope: "project",
});

export { getDividerSpacing };
