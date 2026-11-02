import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import {
  ShipPrepareSchema,
  ShipTitleSchema,
  ShipVersionIdSchema,
} from "./schema.js";

const getPlanShip = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Read the ship plan of an attached app project for the Ship dialog: changed files with diffs, bases, defaults, settings, template values and ship history.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/ship" },
  id: "ship.getPlan",
  input: Schema.Struct({
    baseVersionId: Schema.optionalKey(ShipVersionIdSchema),
    projectId: ProjectIdSchema,
    title: Schema.optionalKey(ShipTitleSchema),
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.read",
  output: ShipPrepareSchema,
  scope: "project",
});

export { getPlanShip };
