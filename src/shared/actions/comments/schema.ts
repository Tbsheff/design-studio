import { Schema } from "effect";

const COMMENT_STATUS_VALUES = [
  "draft",
  "queued",
  "sent",
  "resolved",
  "orphaned",
] as const;

const COMMENT_FILTER_VALUES = [
  "open",
  "all",
  ...COMMENT_STATUS_VALUES,
] as const;

const CommentStatusSchema = Schema.Literals(COMMENT_STATUS_VALUES);

const CommentFilterSchema = Schema.Literals(COMMENT_FILTER_VALUES);

const RectSchema = Schema.Struct({
  height: Schema.Number,
  width: Schema.Number,
  x: Schema.Number,
  y: Schema.Number,
});

const SourceLocSchema = Schema.Struct({
  col: Schema.Number,
  file: Schema.String,
  line: Schema.Number,
});

const CommentTargetSchema = Schema.Struct({
  offset: Schema.optionalKey(
    Schema.Struct({ x: Schema.Number, y: Schema.Number })
  ),
  rectHint: RectSchema,
  selector: Schema.String,
  sourceLoc: Schema.optionalKey(Schema.NullOr(SourceLocSchema)),
  tag: Schema.String,
  textSnippet: Schema.String,
});

const CommentReplySchema = Schema.Struct({
  author: Schema.optionalKey(Schema.String),
  createdAt: Schema.Number,
  id: Schema.String,
  text: Schema.String,
});

const CommentFrameSchema = Schema.Struct({
  id: Schema.optionalKey(Schema.String),
  label: Schema.optionalKey(Schema.String),
  path: Schema.String,
});

const DrawStrokeSchema = Schema.Struct({
  color: Schema.String,
  points: Schema.Array(Schema.Number),
  width: Schema.Number,
});

const CommentDrawingSchema = Schema.Struct({
  box: RectSchema,
  frame: Schema.Struct({ height: Schema.Number, width: Schema.Number }),
  strokes: Schema.Array(DrawStrokeSchema),
});

const FileMentionSchema = Schema.Struct({
  kind: Schema.Literal("file"),
  path: Schema.String,
});

const TokenMentionSchema = Schema.Struct({
  kind: Schema.Literal("token"),
  name: Schema.String,
  value: Schema.String,
});

const ComponentMentionSchema = Schema.Struct({
  file: Schema.NullOr(Schema.String),
  kind: Schema.Literal("component"),
  name: Schema.String,
  selector: Schema.NullOr(Schema.String),
});

const RunMentionSchema = Schema.Union([
  FileMentionSchema,
  TokenMentionSchema,
  ComponentMentionSchema,
]);

const CommentSchema = Schema.Struct({
  attachmentIds: Schema.optionalKey(Schema.Array(Schema.String)),
  author: Schema.optionalKey(Schema.String),
  context: Schema.optionalKey(Schema.Unknown),
  createdAt: Schema.Number,
  drawing: Schema.optionalKey(CommentDrawingSchema),
  frame: Schema.optionalKey(CommentFrameSchema),
  from: Schema.optionalKey(Schema.Literal("viewer")),
  id: Schema.String,
  mentions: Schema.optionalKey(Schema.Array(RunMentionSchema)),
  n: Schema.Number,
  replies: Schema.optionalKey(Schema.Array(CommentReplySchema)),
  runId: Schema.optionalKey(Schema.String),
  status: CommentStatusSchema,
  target: CommentTargetSchema,
  text: Schema.String,
  updatedAt: Schema.Number,
  versionId: Schema.optionalKey(Schema.NullOr(Schema.String)),
});

const MentionFilesSchema = Schema.Struct({
  files: Schema.Array(Schema.String),
  truncated: Schema.Boolean,
});

type Comment = typeof CommentSchema.Type;

type CommentWire = typeof CommentSchema.Encoded;

type CommentFilter = typeof CommentFilterSchema.Type;

type MentionFiles = typeof MentionFilesSchema.Type;

export {
  COMMENT_FILTER_VALUES,
  CommentFilterSchema,
  CommentFrameSchema,
  CommentSchema,
  CommentStatusSchema,
  MentionFilesSchema,
  RunMentionSchema,
};

export type { Comment, CommentFilter, CommentWire, MentionFiles };
