import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  TextIdsSchema,
  TextQueryFields,
  TextReplaceSchema,
  TextTargetFields,
  TextUpdateResultSchema,
} from "./schema.js";

const updateText = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "update_text",
    set: "core",
    short:
      "Replace text from search_text hits, chosen ids or all, in every file as one change.",
  },
  confirm: "none",
  description:
    "Replace text found by search_text: pass the same query and options, the new text in replace, and the hit ids to change (leave out ids to change all hits). Only the matched part changes; HTML and JSX entities in the rest of the text stay as they are, and the new text is escaped for its place. A dynamic expression is never changed. With regex, replace can use $1 and $<name>. Ids that no longer match are listed as stale. All changes are one version and one undo step.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/update-text",
  },
  id: "text.update",
  input: Schema.Struct({
    ...TextTargetFields,
    ...TextQueryFields,
    ids: TextIdsSchema,
    replace: TextReplaceSchema,
  }),
  invalidates: ["text.inspect"],
  mcp: { name: "update_text" },
  needs: "project.update",
  output: TextUpdateResultSchema,
  scope: "project",
});

export { updateText };
