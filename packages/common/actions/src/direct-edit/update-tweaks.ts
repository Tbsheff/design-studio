import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditFailed } from "./errors/direct-edit-failed.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { CommitTweaksResultSchema, TweakValuesFields } from "./schema.js";

const updateTweaksDirectEdit = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Commit new tweak values for a direction. Writes the token source and saves a version.",
  errors: [
    BadRequest,
    Conflict,
    NotFound,
    DirectEditFailed,
    DirectEditConflict,
    DirectEditNotFound,
  ],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/tweaks/commit",
  },
  id: "direct-edit.updateTweaks",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ...TweakValuesFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["direct-edit.getTweaks"],
  mcp: { off: "legacy-mcp" },
  needs: "project.update",
  output: CommitTweaksResultSchema,
  scope: "project",
});

export { updateTweaksDirectEdit };
