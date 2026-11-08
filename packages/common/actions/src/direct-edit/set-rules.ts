import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditFailed } from "./errors/direct-edit-failed.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { RulesSaveFields } from "./payload/schema.js";
import { SaveRulesResultSchema } from "./schema.js";

const setRulesDirectEdit = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Replace the design rules of a project, with the same code path as Save in the Rules editor. In a studio project the rules go into a rules block in DESIGN.md as one version the user can undo. In an attached app they are saved in the studio data folder, never in the app repo. The next studio run and review_frame use them.",
  errors: [
    BadRequest,
    Conflict,
    NotFound,
    DirectEditFailed,
    DirectEditConflict,
    DirectEditNotFound,
  ],
  http: {
    method: "PUT",
    path: "/api/projects/:projectId/d/:directionId/rules",
  },
  id: "direct-edit.setRules",
  input: Schema.Struct({
    ...RulesSaveFields,
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["direct-edit.getRules"],
  mcp: { name: "set_design_rules" },
  needs: "project.update",
  output: SaveRulesResultSchema,
  scope: "project",
});

export { setRulesDirectEdit };
