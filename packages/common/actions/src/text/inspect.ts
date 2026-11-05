import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  TextLimitSchema,
  TextQueryFields,
  TextSearchResultSchema,
  TextTargetFields,
} from "./schema.js";

const inspectText = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "search_text",
    set: "core",
    short:
      "Read only. Find visible text in the pages of this project, with hit ids for update_text.",
  },
  confirm: "none",
  description:
    "Find visible text in the pages of this project: text nodes, the alt, placeholder, title and aria-label attributes, and string literals that are rendered as children, in HTML and JSX files. In an attached app it searches only the route and component files that the canvas frames use, plus the files in glob. Each hit gives its id (file:line:col), the layer source, a context snippet and the canvas frame. Text from a dynamic expression is not found. The limit caps the hits. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/search-text",
  },
  id: "text.inspect",
  input: Schema.Struct({
    ...TextTargetFields,
    ...TextQueryFields,
    limit: TextLimitSchema,
  }),
  invalidates: [],
  mcp: { name: "search_text" },
  needs: "project.read",
  output: TextSearchResultSchema,
  scope: "project",
});

export { inspectText };
