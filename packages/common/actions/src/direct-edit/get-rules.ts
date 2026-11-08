import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditFailed } from "./errors/direct-edit-failed.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { RulesStateSchema } from "./schema.js";

const getRulesDirectEdit = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "get_design_rules",
    set: "core",
    short:
      "Read only. The design rules of a project, the same list as the Rules editor. Each rule has a kind.",
  },
  confirm: "none",
  description:
    "Read the design rules of a project, the same list as the Rules editor in the Design system panel. Each rule has a kind. Class, token, font and component rules are checked by review_frame. Text rules go only to the studio agent and the critic. The origin says where the rules come from. Imported rules come from the DESIGN.md and AGENTS.md of the app. Save them with set_design_rules.",
  errors: [
    BadRequest,
    Conflict,
    NotFound,
    DirectEditFailed,
    DirectEditConflict,
    DirectEditNotFound,
  ],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/rules",
  },
  id: "direct-edit.getRules",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "get_design_rules" },
  needs: "project.read",
  output: RulesStateSchema,
  scope: "project",
});

export { getRulesDirectEdit };
