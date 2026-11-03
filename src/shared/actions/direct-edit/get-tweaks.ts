import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { TweaksStateSchema } from "./schema.js";

const getTweaksDirectEdit = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Read the tweak controls of a direction: controls, current values, token paths and problems.",
  errors: [BadRequest, NotFound],
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
  mcp: { off: "ui-bootstrap" },
  needs: "project.read",
  output: TweaksStateSchema,
  scope: "project",
});

export { getTweaksDirectEdit };
