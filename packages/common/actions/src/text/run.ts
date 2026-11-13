import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { Forbidden } from "../_core/errors/forbidden.js";
import { NotFound } from "../_core/errors/not-found.js";
import { Unavailable } from "../_core/errors/unavailable.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "../direct-edit/errors/direct-edit-conflict.js";
import { DirectEditFailed } from "../direct-edit/errors/direct-edit-failed.js";
import { DirectEditNotFound } from "../direct-edit/errors/direct-edit-not-found.js";
import {
  TextRewriteLanguageSchema,
  TextRewriteLayerSchema,
  TextRewriteModeSchema,
  TextRewriteResultSchema,
  TextRewriteShouldApplySchema,
} from "./schema.js";

const runText = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "run_text",
    set: "core",
    short:
      "Rewrite or translate one text layer with AI. Returns 3 options. With shouldApply, writes option 1 as one version.",
  },
  confirm: "none",
  description:
    "Rewrite or translate the text of one layer. The mode is shorten, lengthen, clarify, voice (match docs/voice.md), fix (spelling and grammar) or translate (needs a BCP 47 language). Returns 3 options based on the layer text and the project DESIGN.md. With shouldApply true, option 1 is written to the source through the inline text edit, as one version with one undo step. Text that comes from a translation file is refused.",
  errors: [
    Forbidden,
    BadRequest,
    Conflict,
    NotFound,
    Unavailable,
    DirectEditConflict,
    DirectEditFailed,
    DirectEditNotFound,
  ],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/run-text",
  },
  id: "text.run",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    language: TextRewriteLanguageSchema,
    layer: TextRewriteLayerSchema,
    mode: TextRewriteModeSchema,
    projectId: ProjectIdSchema,
    shouldApply: TextRewriteShouldApplySchema,
  }),
  invalidates: [
    "text.inspect",
    "direct-edit.getTree",
    "version.list",
    "version.listHistory",
  ],
  mcp: { name: "run_text" },
  needs: "project.update",
  output: TextRewriteResultSchema,
  scope: "project",
});

export { runText };
