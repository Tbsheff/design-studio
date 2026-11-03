import { Schema } from "effect";

const VersionSchema = Schema.Struct({
  changedFiles: Schema.Array(Schema.String),
  changedFilesTotal: Schema.optionalKey(Schema.Number),
  createdAt: Schema.Number,
  directionId: Schema.String,
  id: Schema.String,
  meta: Schema.Unknown,
  name: Schema.optionalKey(Schema.String),
  parentId: Schema.NullOr(Schema.String),
  title: Schema.String,
});

const VersionListSchema = Schema.Struct({
  items: Schema.Array(VersionSchema),
});

const VersionChangesSchema = Schema.Struct({
  files: Schema.Array(Schema.Unknown),
  from: Schema.String,
  thumbs: Schema.optionalKey(Schema.Unknown),
  to: Schema.String,
  totalFiles: Schema.Number,
  truncated: Schema.Boolean,
});

const EditHistoryViewSchema = Schema.Struct({
  canRedo: Schema.Boolean,
  canUndo: Schema.Boolean,
  redo: Schema.Array(Schema.Unknown),
  redoLabel: Schema.NullOr(Schema.String),
  undo: Schema.Array(Schema.Unknown),
  undoLabel: Schema.NullOr(Schema.String),
});

const HunkListSchema = Schema.Struct({
  file: Schema.String,
  from: Schema.String,
  hunks: Schema.Array(Schema.Unknown),
  to: Schema.String,
});

export {
  EditHistoryViewSchema,
  HunkListSchema,
  VersionChangesSchema,
  VersionListSchema,
  VersionSchema,
};
