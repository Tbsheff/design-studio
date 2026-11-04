import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  DirectionIdSchema,
  PackIdSchema,
  ProjectIdSchema,
} from "../_core/ids.js";
import { CheckFailed } from "./errors/check-failed.js";
import { PackExists } from "./errors/pack-exists.js";
import { ApplyResultSchema } from "./schema.js";

const applyPackPack = defineAction({
  access: "destructive",
  agent: { off: "legacy-agent" },
  confirm: "user",
  description:
    "Apply a design system to a direction. This writes over the tokens, tokens.css and DESIGN.md (project notes stay) as one new version. An attached app keeps its own design system.",
  errors: [BadRequest, CheckFailed, Conflict, NotFound, PackExists],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/design-system/apply",
  },
  id: "pack.applyPack",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    packId: PackIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["pack.getDraft", "pack.inspectDraft"],
  mcp: { off: "legacy-mcp" },
  needs: "project.update",
  output: ApplyResultSchema,
  scope: "project",
});

export { applyPackPack };
