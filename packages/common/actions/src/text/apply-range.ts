import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import {
  TextRangeClassSchema,
  TextRangeHrefSchema,
  TextRangeIsRemoveSchema,
  TextRangeOffsetSchema,
  TextRangeRenderedSchema,
  TextRangeResultSchema,
  TextRangeStyleSchema,
  TextRewriteLayerSchema,
} from "./schema.js";

const applyRangeText = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "apply_range_text",
    set: "core",
    short:
      "Bold, italic, underline, strike, link or color part of one text layer by character range, as one version.",
  },
  confirm: "none",
  description:
    "Wrap or unwrap a character range of the text of one layer in strong, em, u, s, a with href, or span with a token class. In Tailwind JSX, underline and strike write a span with the underline or line-through class. Set start and end as character offsets in the rendered text of the layer. A range that crosses a dynamic expression or the end of a text part is refused. Works in HTML and JSX files. One version, one undo step.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/apply-range-text",
  },
  id: "text.applyRange",
  input: Schema.Struct({
    className: TextRangeClassSchema,
    directionId: DirectionIdSchema,
    end: TextRangeOffsetSchema,
    href: TextRangeHrefSchema,
    isRemove: TextRangeIsRemoveSchema,
    layer: TextRewriteLayerSchema,
    projectId: ProjectIdSchema,
    start: TextRangeOffsetSchema,
    style: TextRangeStyleSchema,
    text: TextRangeRenderedSchema,
  }),
  invalidates: ["text.inspect"],
  mcp: { name: "apply_range_text" },
  needs: "project.update",
  output: TextRangeResultSchema,
  scope: "project",
});

export { applyRangeText };
