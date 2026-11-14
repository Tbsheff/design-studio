import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { ElementTargetSchema } from "../_core/element-target.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  FillChangeSchema,
  FillInputSchema,
  FillTargetFields,
  FillVariantSchema,
} from "./schema.js";

const setFill = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_fill",
    set: "core",
    short:
      "Set the fill of one element: solid, linear or radial, with an optional blend mode.",
  },
  confirm: "none",
  description:
    "Set the fill of one element. type solid takes color or token. type linear takes angle and 2 to 6 stops. type radial takes form, at and 2 to 6 stops. Each stop is color or token with a position in percent. Optional blendMode with blendProperty. In Tailwind it writes bg-linear or bg-radial classes with from, via and to classes. Otherwise it writes background-image with a gradient. variant is a state or breakpoint prefix such as hover:, md:hover: or data-[state=open]:, and the default is the base style. Saves one version.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/fill",
  },
  id: "fill.set",
  input: Schema.Struct({
    ...FillTargetFields,
    fill: FillInputSchema,
    target: ElementTargetSchema,
    variant: FillVariantSchema,
  }),
  invalidates: ["fill.get"],
  mcp: { name: "set_fill" },
  needs: "project.update",
  output: FillChangeSchema,
  scope: "project",
});

export { setFill };
