import { Schema } from "effect";

const VersionMetaSchema = Schema.Struct({
  client: Schema.optionalKey(Schema.String),
  directionId: Schema.optionalKey(Schema.String),
  kind: Schema.Literals([
    "init",
    "run",
    "undo",
    "restore",
    "keep",
    "fork",
    "manual",
  ]),
  level: Schema.optionalKey(
    Schema.Literals(["wireframe", "prototype", "polish"])
  ),
  origin: Schema.optionalKey(Schema.Literal("mcp")),
  prompt: Schema.optionalKey(Schema.String),
  restoredFrom: Schema.optionalKey(Schema.String),
  runId: Schema.optionalKey(Schema.String),
});

const VersionFileDiffSchema = Schema.Struct({
  additions: Schema.Number,
  binary: Schema.Boolean,
  deletions: Schema.Number,
  oldPath: Schema.optionalKey(Schema.String),
  patch: Schema.String,
  path: Schema.String,
  status: Schema.Literals(["added", "removed", "modified", "renamed"]),
  truncated: Schema.Boolean,
});

const VersionThumbsSchema = Schema.Struct({
  changedPct: Schema.NullOr(Schema.Number),
  from: Schema.NullOr(Schema.String),
  mask: Schema.NullOr(Schema.String),
  to: Schema.NullOr(Schema.String),
});

const EditHistoryEntrySchema = Schema.Struct({
  files: Schema.Array(Schema.String),
  label: Schema.String,
  versionId: Schema.String,
});

const HunkLineSchema = Schema.Struct({
  noEol: Schema.Boolean,
  sign: Schema.Literals(["+", "-", " "]),
  text: Schema.String,
});

const PatchHunkSchema = Schema.Struct({
  complete: Schema.Boolean,
  header: Schema.String,
  index: Schema.Number,
  lines: Schema.Array(HunkLineSchema),
  newStart: Schema.Number,
  oldStart: Schema.Number,
});

const VersionSchema = Schema.Struct({
  changedFiles: Schema.Array(Schema.String),
  changedFilesTotal: Schema.optionalKey(Schema.Number),
  createdAt: Schema.Number,
  directionId: Schema.String,
  id: Schema.String,
  meta: VersionMetaSchema,
  name: Schema.optionalKey(Schema.String),
  parentId: Schema.NullOr(Schema.String),
  title: Schema.String,
});

const VersionChangesSchema = Schema.Struct({
  files: Schema.Array(VersionFileDiffSchema),
  from: Schema.String,
  thumbs: Schema.optionalKey(VersionThumbsSchema),
  to: Schema.String,
  totalFiles: Schema.Number,
  truncated: Schema.Boolean,
});

const EditHistoryViewSchema = Schema.Struct({
  canRedo: Schema.Boolean,
  canUndo: Schema.Boolean,
  redo: Schema.Array(EditHistoryEntrySchema),
  redoLabel: Schema.NullOr(Schema.String),
  undo: Schema.Array(EditHistoryEntrySchema),
  undoLabel: Schema.NullOr(Schema.String),
});

const HunkListSchema = Schema.Struct({
  file: Schema.String,
  from: Schema.String,
  hunks: Schema.Array(PatchHunkSchema),
  to: Schema.String,
});

const VersionRenamedSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.NullOr(Schema.String),
});

const EditStepSchema = Schema.Struct({
  label: Schema.String,
  state: Schema.Struct({
    canRedo: Schema.Boolean,
    canUndo: Schema.Boolean,
    redoLabel: Schema.NullOr(Schema.String),
    undoLabel: Schema.NullOr(Schema.String),
  }),
  version: VersionSchema,
});

const HunkRevertedSchema = Schema.Struct({
  file: Schema.String,
  from: Schema.String,
  hunk: Schema.Number,
  label: Schema.String,
  to: Schema.String,
  version: VersionSchema,
});

const SessionEndSchema = Schema.Struct({
  headVersionId: Schema.String,
  version: Schema.NullOr(VersionSchema),
});

const WorkTreeStatusSchema = Schema.Struct({
  changed: Schema.Array(Schema.String),
  dirty: Schema.Boolean,
});

const VersionPreviewSchema = Schema.Struct({
  url: Schema.String,
});

const VersionExportSchema = Schema.Struct({
  base64: Schema.String,
  fileName: Schema.String,
});

export {
  EditHistoryViewSchema,
  EditStepSchema,
  HunkListSchema,
  HunkRevertedSchema,
  SessionEndSchema,
  VersionRenamedSchema,
  VersionChangesSchema,
  VersionExportSchema,
  VersionPreviewSchema,
  VersionSchema,
  WorkTreeStatusSchema,
};
