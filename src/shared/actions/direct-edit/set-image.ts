import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { DirectEditError } from "../_core/errors/direct-edit-error.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { InsertResultSchema } from "./schema.js";

const setImageDirectEdit = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Set or replace the image of an img element or a CSS background. Takes a URL or uploaded data. Saves one version.",
  errors: [
    BadRequest,
    Conflict,
    NotFound,
    DirectEditError,
    DirectEditConflict,
    DirectEditNotFound,
  ],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/image",
  },
  id: "direct-edit.setImage",
  input: Schema.Struct({
    alt: Schema.optionalKey(Schema.Unknown),
    directionId: DirectionIdSchema,
    fit: Schema.optionalKey(Schema.Unknown),
    focal: Schema.optionalKey(Schema.Unknown),
    image: Schema.optionalKey(Schema.Unknown),
    mode: Schema.optionalKey(Schema.Unknown),
    position: Schema.optionalKey(Schema.Unknown),
    projectId: ProjectIdSchema,
    target: Schema.optionalKey(Schema.Unknown),
    url: Schema.optionalKey(Schema.Unknown),
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.update",
  output: InsertResultSchema,
  scope: "project",
});

export { setImageDirectEdit };
