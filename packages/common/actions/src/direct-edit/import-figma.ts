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
import { FigmaImportFields } from "./payload/schema.js";
import { FigmaImportOutputSchema } from "./schema.js";

const importFigmaDirectEdit = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Turn a Figma frame into editable markup on a page. dryRun returns the markup and stats without a write. Saves one version otherwise.",
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
    path: "/api/projects/:projectId/d/:directionId/figma/import",
  },
  id: "direct-edit.importFigma",
  input: Schema.Struct({
    ...FigmaImportFields,
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["version.list", "version.get"],
  mcp: { off: "legacy-mcp" },
  needs: "project.update",
  output: FigmaImportOutputSchema,
  scope: "project",
});

export { importFigmaDirectEdit };
