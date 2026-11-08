import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditFailed } from "./errors/direct-edit-failed.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { TweaksStateSchema } from "./schema.js";

const getTweaksDirectEdit = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "list_tweaks",
    set: "tweak",
    short:
      "List the tweak controls of a direction with their type, limits and current value.",
  },
  confirm: "none",
  description:
    "List the tweak controls of a direction with their type, CSS variable, limits or options, default and current value, token paths and problems. Tweaks are the controls (sliders, colors, toggles, selects) that the studio agent made with define_tweaks. The user sees them in the Tweaks panel. Each control sets one CSS variable. An empty list means the agent has not made tweaks for this design. Read only.",
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
    path: "/api/projects/:projectId/d/:directionId/tweaks",
  },
  id: "direct-edit.getTweaks",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "list_tweaks" },
  needs: "project.read",
  output: TweaksStateSchema,
  scope: "project",
});

export { getTweaksDirectEdit };
