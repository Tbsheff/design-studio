import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { Forbidden } from "../_core/errors/forbidden.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditFailed } from "./errors/direct-edit-failed.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { TweakSetFields, TweakSetResultSchema } from "./schema.js";

const setTweakDirectEdit = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_tweak",
    set: "tweak",
    short:
      "Set one tweak control to a new value. Use list_tweaks first for ids and valid values.",
  },
  confirm: "none",
  description:
    "Set one tweak control to a new value with the same code path as the studio Tweaks panel: it rewrites the CSS variable declaration (or the design token behind it) and saves one version the user can undo. Tweaks are the controls (sliders, colors, toggles, selects) that the studio agent made with define_tweaks. The user sees them in the Tweaks panel. Each control sets one CSS variable. This is a direct edit. It does not start an AI run. Use list_tweaks first for the ids and valid values.",
  errors: [
    Forbidden,
    BadRequest,
    Conflict,
    NotFound,
    DirectEditFailed,
    DirectEditConflict,
    DirectEditNotFound,
  ],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/tweak",
  },
  id: "direct-edit.setTweak",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ...TweakSetFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["direct-edit.getTweaks"],
  mcp: { name: "set_tweak" },
  needs: "project.update",
  output: TweakSetResultSchema,
  scope: "project",
});

export { setTweakDirectEdit };
