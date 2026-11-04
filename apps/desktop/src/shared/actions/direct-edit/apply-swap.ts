import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditFailed } from "./errors/direct-edit-failed.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { SwapResultSchema } from "./schema.js";

const applySwapDirectEdit = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Swap the component used at a source location for another library component. Keeps the props that fit and saves one version.",
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
    path: "/api/projects/:projectId/d/:directionId/components/swap",
  },
  id: "direct-edit.applySwap",
  input: Schema.Struct({
    component: Schema.Unknown,
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
    use: Schema.Unknown,
  }),
  invalidates: ["direct-edit.getTree", "version.list", "version.listHistory"],
  mcp: { off: "legacy-mcp" },
  needs: "project.update",
  output: SwapResultSchema,
  scope: "project",
});

export { applySwapDirectEdit };
