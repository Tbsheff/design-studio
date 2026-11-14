import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { ElementTargetSchema } from "../_core/element-target.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import {
  DividerChangeSchema,
  DividerInputSchema,
  DividerVariantSchema,
} from "./divider/schema.js";

const setDividerSpacing = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_divider_spacing",
    set: "core",
    short:
      "Draw lines between the items of one stack, or remove them, with a width and a color.",
  },
  confirm: "none",
  description:
    "Set the lines that one element draws between its children. axis is y for a vertical stack, x for a horizontal stack, or null to remove the lines. width is 1, 2, 4 or 8 px. Pass color or token for the line color. In Tailwind it writes divide-y or divide-x classes with divide-<color>. variant is a state or breakpoint prefix such as md:, and the default is the base style. Saves one version.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/spacing/divider",
  },
  id: "spacing.setDivider",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    divider: DividerInputSchema,
    projectId: ProjectIdSchema,
    target: ElementTargetSchema,
    variant: DividerVariantSchema,
  }),
  invalidates: ["spacing.getDivider"],
  mcp: { name: "set_divider_spacing" },
  needs: "project.update",
  output: DividerChangeSchema,
  scope: "project",
});

export { setDividerSpacing };
