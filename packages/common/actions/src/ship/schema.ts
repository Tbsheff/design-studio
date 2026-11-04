import { SHIP_TEXT_MAX } from "@design-studio/contracts/ship";
import { Schema } from "effect";

const SHIP_NOTE =
  "Ship works on an attached app project whose folder is in a git repository. The studio makes a new branch from the repo HEAD in a separate git worktree, so the checked-out branch, the working tree and the index of the user stay as they are. It never force pushes, and it never commits .env files, secrets or node_modules. Repo commit hooks do not run; when the repo has a biome or prettier config, the studio formats the shipped files with it in that worktree first (format says which, and the ship result lists the files it reformatted with their diffs).";

const ShipVersionIdSchema = Schema.String.check(
  Schema.isPattern(/^[0-9a-f]{40,64}$/u)
);

const ShipModeSchema = Schema.Literals(["branch", "push", "pr"]);

const ShipSettingsSchema = Schema.Struct({
  bodyTemplate: Schema.String.check(
    Schema.isMaxLength(SHIP_TEXT_MAX.bodyTemplate)
  ),
  branchTemplate: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(SHIP_TEXT_MAX.branchTemplate)
  ),
  issueId: Schema.String.check(
    Schema.isMaxLength(SHIP_TEXT_MAX.issueId),
    Schema.isPattern(/^[\w.#-]*$/u)
  ),
  user: Schema.String.check(
    Schema.isMaxLength(SHIP_TEXT_MAX.user),
    Schema.isPattern(/^[\w.-]*$/u)
  ),
});

const ShipRecordSchema = Schema.Struct({
  at: Schema.Number,
  baseVersionId: Schema.String,
  branch: Schema.String,
  files: Schema.Number,
  mode: ShipModeSchema,
  prUrl: Schema.NullOr(Schema.String),
  pushed: Schema.Boolean,
  sha: Schema.String,
  versionId: Schema.String,
});

const ShipRepoSchema = Schema.Struct({
  branch: Schema.NullOr(Schema.String),
  gh: Schema.Boolean,
  github: Schema.Boolean,
  head: Schema.String,
  prefix: Schema.String,
  remote: Schema.NullOr(Schema.String),
  remoteUrl: Schema.NullOr(Schema.String),
  root: Schema.String,
});

const ShipBaseSchema = Schema.Struct({
  at: Schema.Number,
  kind: Schema.Literals(["attached", "last-ship", "version"]),
  title: Schema.String,
  versionId: Schema.String,
});

const ShipFileStatusSchema = Schema.Literals(["added", "modified", "deleted"]);

const ShipFileSchema = Schema.Struct({
  additions: Schema.NullOr(Schema.Number),
  conflict: Schema.NullOr(Schema.String),
  deletions: Schema.NullOr(Schema.Number),
  diff: Schema.String,
  diffCut: Schema.Boolean,
  path: Schema.String,
  refused: Schema.NullOr(Schema.String),
  status: ShipFileStatusSchema,
});

const ShipDefaultsSchema = Schema.Struct({
  body: Schema.String,
  branch: Schema.String,
  commitMessage: Schema.String,
  title: Schema.String,
});

const ShipFormatToolSchema = Schema.NullOr(
  Schema.Literals(["biome", "prettier"])
);

const ShipFormatSchema = Schema.Struct({
  command: Schema.NullOr(Schema.String),
  note: Schema.String,
  skipped: Schema.Array(Schema.String),
  tool: ShipFormatToolSchema,
});

const ShipTemplateVarsSchema = Schema.Struct({
  files: Schema.Array(Schema.String),
  issue: Schema.String,
  summary: Schema.String,
  title: Schema.String,
  user: Schema.String,
  versions: Schema.Array(Schema.String),
});

const ShipVersionSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
});

const ShipPrepareSchema = Schema.Struct({
  base: Schema.NullOr(ShipBaseSchema),
  bases: Schema.Array(ShipBaseSchema),
  blocked: Schema.NullOr(Schema.String),
  defaults: ShipDefaultsSchema,
  files: Schema.Array(ShipFileSchema),
  format: Schema.optionalKey(ShipFormatSchema),
  headVersionId: Schema.NullOr(Schema.String),
  history: Schema.Array(ShipRecordSchema),
  projectId: Schema.String,
  repo: Schema.NullOr(ShipRepoSchema),
  settings: ShipSettingsSchema,
  summary: Schema.String,
  vars: ShipTemplateVarsSchema,
  versions: Schema.Array(ShipVersionSchema),
});

const ShipPlanRepoSchema = Schema.Struct({
  checkedOut: Schema.NullOr(Schema.String),
  gh: Schema.Boolean,
  github: Schema.Boolean,
  head: Schema.String,
  remote: Schema.NullOr(Schema.String),
  root: Schema.String,
});

const ShipPlanFileSchema = Schema.Struct({
  additions: Schema.NullOr(Schema.Number),
  conflict: Schema.NullOr(Schema.String),
  deletions: Schema.NullOr(Schema.Number),
  diff: Schema.String,
  path: Schema.String,
  refused: Schema.NullOr(Schema.String),
  status: ShipFileStatusSchema,
});

const ShipPlanBaseSchema = Schema.Struct({
  title: Schema.String,
  versionId: Schema.String,
});

const ShipPlanSchema = Schema.Struct({
  base: Schema.NullOr(ShipBaseSchema),
  blocked: Schema.NullOr(Schema.String),
  defaults: ShipDefaultsSchema,
  files: Schema.Array(ShipPlanFileSchema),
  format: Schema.NullOr(ShipFormatSchema),
  headVersionId: Schema.NullOr(Schema.String),
  note: Schema.String,
  otherBases: Schema.Array(ShipPlanBaseSchema),
  repo: Schema.NullOr(ShipPlanRepoSchema),
  versions: Schema.Array(Schema.String),
});

const ShipFormattedSchema = Schema.Struct({
  diff: Schema.String,
  path: Schema.String,
});

const ShipFormatErrorSchema = Schema.Struct({
  message: Schema.String,
  path: Schema.String,
});

const ShipFormatResultSchema = Schema.Struct({
  errors: Schema.Array(ShipFormatErrorSchema),
  formatted: Schema.Array(ShipFormattedSchema),
  note: Schema.String,
  skipped: Schema.Array(Schema.String),
  tool: ShipFormatToolSchema,
});

const ShipResultSchema = Schema.Struct({
  branch: Schema.String,
  files: Schema.Array(Schema.String),
  format: Schema.optionalKey(ShipFormatResultSchema),
  mode: ShipModeSchema,
  prError: Schema.NullOr(Schema.String),
  prUrl: Schema.NullOr(Schema.String),
  pushed: Schema.Boolean,
  remote: Schema.NullOr(Schema.String),
  sha: Schema.String,
});

const ShipTitleSchema = Schema.String.check(
  Schema.isMaxLength(SHIP_TEXT_MAX.title)
);

type ShipPlan = typeof ShipPlanSchema.Type;

export {
  SHIP_NOTE,
  ShipModeSchema,
  ShipPlanSchema,
  ShipPrepareSchema,
  ShipResultSchema,
  ShipSettingsSchema,
  ShipTitleSchema,
  ShipVersionIdSchema,
};

export type { ShipPlan };
