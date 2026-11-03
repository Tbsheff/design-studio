import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import {
  ShipPlanSchema,
  ShipTitleSchema,
  ShipVersionIdSchema,
} from "./schema.js";

const BaseFieldSchema = ShipVersionIdSchema.annotate({
  description:
    "Base version id. Leave out for the last ship, or the version made when the app was attached.",
});

const TitleFieldSchema = ShipTitleSchema.annotate({
  description:
    'Name of the change, for example "Add Recent F2F documents card". The default branch name, commit message and pull request text come from it. Leave out for a name made from all versions since the base.',
});

const inspectShip = defineAction({
  access: "read",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description: `List the files the studio changed since a base version, with diffs, refused files, conflicts with the user's own changes, and the default branch name, commit message and pull request text. Read only. Ship works on an attached app project in a git repository. It uses a new branch in a separate git worktree, so the checked-out branch and files of the user do not change. It never force pushes and never commits .env files, secrets or node_modules.`,
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/ship/plan" },
  id: "ship.inspect",
  input: Schema.Struct({
    baseVersionId: Schema.optionalKey(BaseFieldSchema),
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects.",
    }),
    title: Schema.optionalKey(TitleFieldSchema),
  }),
  invalidates: [],
  mcp: { name: "prepare_ship" },
  needs: "project.read",
  output: ShipPlanSchema,
  scope: "project",
});

export { inspectShip };
