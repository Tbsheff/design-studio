import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { ElementTargetSchema } from "../_core/element-target.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  TextStyleDetachedSchema,
  TextStyleProbeFields,
  TextStyleTargetFields,
} from "./schema.js";

const updateTextStyle = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "detach_text_style",
    set: "core",
    short:
      "Detach an element from its text style: write its computed text props as literal values on the element.",
  },
  confirm: "none",
  description:
    "Detach one text element from its text style: write its computed font size, weight, line-height, letter-spacing and family as literal values on the element, so a later change to the style no longer reaches it. Pass styles and target, or pass selector (and path) to read both from the live element on the page. One version and one undo step.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/text-styles/detach",
  },
  id: "text-style.update",
  input: Schema.Struct({
    ...TextStyleTargetFields,
    ...TextStyleProbeFields,
    target: Schema.optionalKey(ElementTargetSchema),
  }),
  invalidates: ["text-style.inspect"],
  mcp: { name: "detach_text_style" },
  needs: "project.update",
  output: TextStyleDetachedSchema,
  scope: "project",
});

export { updateTextStyle };
