import { Schema } from "effect";

const NOTE_MAX = 500;

const DevStatusValueSchema = Schema.Literals([
  "draft",
  "in-review",
  "ready",
  "built",
]).annotate({
  description: "The dev status: draft, in-review, ready or built.",
});

const NoteTextSchema = Schema.String.check(Schema.isMaxLength(NOTE_MAX));

const NoteFieldSchema = Schema.NullOr(NoteTextSchema).annotate({
  description: "A note for the developer, at most 500 chars, or null.",
});

const StatusFilterFieldSchema = Schema.NullOr(DevStatusValueSchema).annotate({
  description: "Return only frames with this status, or null for all.",
});

const DevStatusEntrySchema = Schema.Struct({
  changedFiles: Schema.Array(Schema.String),
  frameId: Schema.String,
  isChangedSince: Schema.Boolean,
  markedAt: Schema.Number,
  markedVersionId: Schema.NullOr(Schema.String),
  note: Schema.NullOr(Schema.String),
  page: Schema.NullOr(Schema.String),
  route: Schema.NullOr(Schema.String),
  status: DevStatusValueSchema,
});

const StampedFileSchema = Schema.Struct({
  hash: Schema.String,
  path: Schema.String,
});

const DevStatusRecordSchema = Schema.Struct({
  directionId: Schema.String,
  files: Schema.Array(StampedFileSchema),
  frameId: Schema.String,
  markedAt: Schema.Number,
  markedVersionId: Schema.NullOr(Schema.String),
  note: Schema.NullOr(Schema.String),
  page: Schema.NullOr(Schema.String),
  route: Schema.NullOr(Schema.String),
  status: DevStatusValueSchema,
});

const DevStatusFileSchema = Schema.Struct({
  entries: Schema.Array(DevStatusRecordSchema),
});

export {
  DevStatusEntrySchema,
  DevStatusFileSchema,
  DevStatusValueSchema,
  NOTE_MAX,
  NoteFieldSchema,
  StatusFilterFieldSchema,
};
