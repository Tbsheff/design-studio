import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  TextStyleCreatedSchema,
  TextStyleNameSchema,
  TextStyleProbeFields,
  TextStyleTargetFields,
} from "./schema.js";

const createTextStyle = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "create_text_style",
    set: "core",
    short:
      "Add the computed text props of an element as a new text style token in the project token source.",
  },
  confirm: "none",
  description:
    "Add a new text style token to the project token source: the Tailwind @theme block (--text-<name> with pairs), tokens.json typography or :root CSS vars. Pass styles, the computed font size, weight, line-height, letter-spacing and family; or pass selector (and path) to read them from the live element on the page. One version and one undo step.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/text-styles/create",
  },
  id: "text-style.create",
  input: Schema.Struct({
    ...TextStyleTargetFields,
    ...TextStyleProbeFields,
    name: TextStyleNameSchema,
  }),
  invalidates: ["text-style.inspect"],
  mcp: { name: "create_text_style" },
  needs: "project.update",
  output: TextStyleCreatedSchema,
  scope: "project",
});

export { createTextStyle };
