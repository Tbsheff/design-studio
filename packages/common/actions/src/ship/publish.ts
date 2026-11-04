import { Schema } from "effect";

import { SHIP_TEXT_MAX } from "../_core/ship.js";
import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import {
  ShipModeSchema,
  ShipResultSchema,
  ShipTitleSchema,
  ShipVersionIdSchema,
} from "./schema.js";

const BaseFieldSchema = ShipVersionIdSchema.annotate({
  description:
    "Base version id from prepare_ship. Leave out for the default base.",
});

const HeadFieldSchema = ShipVersionIdSchema.annotate({
  description:
    "Head version id from prepare_ship. Leave out for the head version of the plan.",
});

const PATH_MAX = 1000;

const FILES_MAX = 500;

const ShipPathSchema = Schema.String.check(Schema.isMaxLength(PATH_MAX));

const FilesFieldSchema = Schema.Array(ShipPathSchema)
  .check(Schema.isMaxLength(FILES_MAX))
  .annotate({
    description:
      "Repo-relative paths from prepare_ship. Leave out for every file that is not refused and has no conflict.",
  });

const BranchFieldSchema = Schema.String.check(
  Schema.isMaxLength(SHIP_TEXT_MAX.branch)
).annotate({
  description:
    "Branch name. Leave out for the name from the project branch template.",
});

const CommitFieldSchema = Schema.String.check(
  Schema.isMaxLength(SHIP_TEXT_MAX.commitMessage)
);

const TitleFieldSchema = ShipTitleSchema.annotate({
  description:
    "Name of the change and pull request title. When branch, commitMessage or body are left out, their defaults come from this title. Leave out for a name made from all versions since the base.",
});

const BodyFieldSchema = Schema.String.check(
  Schema.isMaxLength(SHIP_TEXT_MAX.body)
).annotate({
  description: "Pull request body. Leave out for the project body template.",
});

const ModeFieldSchema = ShipModeSchema.annotate({
  description:
    "branch: commit on a new local branch only. push: also push it to the remote. pr: push and open a pull request with gh. Default branch.",
});

const publishShip = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "user",
  description: `Commit studio changes to a new branch in the user's repo and, if asked, push it and open a pull request. The user must click Allow in Design Studio first; without the window open it is refused. Call prepare_ship first. Ship works on an attached app project in a git repository. It uses a new branch in a separate git worktree, so the checked-out branch and files of the user do not change. It never force pushes and never commits .env files, secrets or node_modules.`,
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/ship" },
  id: "ship.publish",
  input: Schema.Struct({
    baseVersionId: Schema.optionalKey(BaseFieldSchema),
    body: Schema.optionalKey(BodyFieldSchema),
    branch: Schema.optionalKey(BranchFieldSchema),
    commitMessage: Schema.optionalKey(CommitFieldSchema),
    files: Schema.optionalKey(FilesFieldSchema),
    headVersionId: Schema.optionalKey(HeadFieldSchema),
    mode: Schema.optionalKey(ModeFieldSchema),
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects.",
    }),
    title: Schema.optionalKey(TitleFieldSchema),
  }),
  invalidates: ["ship.getPlan", "ship.inspect"],
  mcp: { name: "ship" },
  needs: "project.publish",
  output: ShipResultSchema,
  scope: "project",
});

export { publishShip };
