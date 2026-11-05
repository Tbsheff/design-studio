import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  TextStyleInspectFields,
  TextStyleListSchema,
  TextStyleTargetFields,
} from "./schema.js";

const inspectTextStyle = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "list_text_styles",
    set: "core",
    short:
      "Read only. The project type scale: Tailwind @theme, tokens.json, CSS vars, DESIGN.md. Name, size, weight, line-height, letter-spacing, family, source.",
  },
  confirm: "none",
  description:
    "List the project type scale that apply_text_style can use, read in this order: Tailwind v4 @theme --text-* (with --line-height, --font-weight and --letter-spacing pairs) and --font-* vars, tokens.json typography, CSS vars in :root, then the DESIGN.md typography section. Returns name, size, weight, line-height, letter-spacing, family and source. The limit caps the styles. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/text-styles",
  },
  id: "text-style.inspect",
  input: Schema.Struct({
    ...TextStyleTargetFields,
    ...TextStyleInspectFields,
  }),
  invalidates: [],
  mcp: { name: "list_text_styles" },
  needs: "project.read",
  output: TextStyleListSchema,
  scope: "project",
});

export { inspectTextStyle };
