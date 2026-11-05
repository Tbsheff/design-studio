import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { ElementTargetSchema } from "../_core/element-target.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  SpacingChangeSchema,
  SpacingInputSchema,
  SpacingTargetFields,
} from "./schema.js";

const setSpacing = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_spacing",
    set: "core",
    short:
      "Set one padding, margin or gap value on one element, as a scale class or a token.",
  },
  confirm: "none",
  description:
    "Set one spacing value of one element. property is padding, margin, gap, row-gap or column-gap. side is all, x, y, top, right, bottom or left. Pass value in px or a token name. snap moves a px value to the nearest scale step. It writes Tailwind scale classes such as p-4, px-6, gap-3 and -mt-2, or CSS with var() for tokens. Saves one version.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/spacing",
  },
  id: "spacing.set",
  input: Schema.Struct({
    ...SpacingTargetFields,
    spacing: SpacingInputSchema,
    target: ElementTargetSchema,
  }),
  invalidates: ["spacing.get"],
  mcp: { name: "set_spacing" },
  needs: "project.update",
  output: SpacingChangeSchema,
  scope: "project",
});

export { setSpacing };
