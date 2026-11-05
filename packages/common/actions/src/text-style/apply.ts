import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { ElementTargetSchema } from "../_core/element-target.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  TextStyleAppliedSchema,
  TextStyleNameSchema,
  TextStyleTargetFields,
} from "./schema.js";

const applyTextStyle = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "apply_text_style",
    set: "core",
    short:
      "Apply a text style to an element: Tailwind classes that replace text size, font, leading and tracking classes, or CSS var references.",
  },
  confirm: "none",
  description:
    "Apply a text style from list_text_styles to one element. In a Tailwind file it writes the classes (text-xl, font-semibold, leading-*, tracking-*) and removes the text size, font, leading and tracking classes they replace; otherwise it writes font-size, font-weight, line-height, letter-spacing and font-family as CSS var references in the rule or inline style. One version and one undo step.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/text-styles/apply",
  },
  id: "text-style.apply",
  input: Schema.Struct({
    ...TextStyleTargetFields,
    style: TextStyleNameSchema,
    target: ElementTargetSchema,
  }),
  invalidates: ["text-style.inspect"],
  mcp: { name: "apply_text_style" },
  needs: "project.update",
  output: TextStyleAppliedSchema,
  scope: "project",
});

export { applyTextStyle };
