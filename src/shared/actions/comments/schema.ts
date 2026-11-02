import { Schema } from "effect";

import {
  CommentIdSchema,
  DirectionIdSchema,
  ProjectIdSchema,
} from "../_core/ids.js";

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

const TEXT_MAX = 2000;
const AUTHOR_MAX = 60;
const SELECTOR_MAX = 2000;
const TAG_MAX = 64;
const SNIPPET_MAX = 200;
const ATTACHMENTS_MAX = 4;
const MENTIONS_MAX = 10;
const PREFILL_IDS_MAX = 20;
const REORDER_IDS_MAX = 500;
const LABEL_MAX = 80;
const PATH_MAX = 300;

const SafeIdTextSchema = Schema.String.check(
  Schema.isPattern(/^[\w-]{1,64}$/u)
);

const CommentTextSchema = Schema.Trim.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(TEXT_MAX)
);

const AuthorSchema = Schema.Trim.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(AUTHOR_MAX)
);

const SelectorSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(SELECTOR_MAX)
);

const TargetInputSchema = Schema.Struct({
  offset: Schema.optionalKey(
    Schema.Struct({ x: Schema.Number, y: Schema.Number })
  ),
  rectHint: RectSchema,
  selector: SelectorSchema,
  sourceLoc: Schema.optionalKey(Schema.NullOr(SourceLocSchema)),
  tag: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(TAG_MAX)),
  textSnippet: Schema.String.check(Schema.isMaxLength(SNIPPET_MAX)),
});

const SelectionContextSchema = Schema.Record(Schema.String, Schema.Unknown);

const FrameLabelSchema = Schema.Trim.check(Schema.isMaxLength(LABEL_MAX));

const FrameInputSchema = Schema.Struct({
  id: Schema.optionalKey(SafeIdTextSchema),
  label: Schema.optionalKey(FrameLabelSchema),
  path: Schema.String.check(Schema.isMaxLength(PATH_MAX)),
});

const AttachmentIdsSchema = Schema.Array(SafeIdTextSchema).check(
  Schema.isMinLength(1),
  Schema.isMaxLength(ATTACHMENTS_MAX)
);

const MentionsInputSchema = Schema.Array(RunMentionSchema).check(
  Schema.isMaxLength(MENTIONS_MAX)
);

const PrefillIdsSchema = Schema.Array(SafeIdTextSchema).check(
  Schema.isMinLength(1),
  Schema.isMaxLength(PREFILL_IDS_MAX)
);

const ReorderIdsSchema = Schema.Array(SafeIdTextSchema).check(
  Schema.isMinLength(1),
  Schema.isMaxLength(REORDER_IDS_MAX)
);

const ElementSelectorSchema = SelectorSchema.annotate({
  description:
    "CSS selector of the element. Leave out for a comment on the whole frame.",
});

const DraftStatusSchema = Schema.Literals(["draft", "queued"]);

const CommentRemovedSchema = Schema.Struct({ ok: Schema.Boolean });

const CommentOrderSchema = Schema.Struct({
  comments: Schema.Array(CommentSchema),
});

const CommentPrefillSchema = Schema.Struct({
  attachments: Schema.Array(
    Schema.Struct({
      dataUrl: Schema.String,
      id: Schema.String,
      name: Schema.String,
    })
  ),
  commentIds: Schema.Array(Schema.String),
  text: Schema.String,
});

const CommentAddedSchema = Schema.Struct({
  author: Schema.String,
  commentId: Schema.String,
  frameLevel: Schema.Boolean,
  number: Schema.Number,
});

const CommentRepliedSchema = Schema.Struct({
  commentId: Schema.String,
  replies: Schema.Number,
});

const CommentResolvedSchema = Schema.Struct({
  commentId: Schema.String,
  status: CommentStatusSchema,
});

const ProjectFieldSchema = ProjectIdSchema.annotate({
  description: "Project id from list_projects.",
});

const DirectionFieldSchema = DirectionIdSchema.annotate({
  description: "Direction id. Leave out for the main direction.",
});

const CommentFieldSchema = CommentIdSchema.annotate({
  description: "Comment id from add_comment.",
});

const PagePathFieldSchema = Schema.String.check(
  Schema.isMaxLength(PATH_MAX)
).annotate({
  description:
    'Page path in the project, for example "about.html". Leave out for the entry page.',
});

type Comment = typeof CommentSchema.Type;

type CommentWire = typeof CommentSchema.Encoded;

type CommentFilter = typeof CommentFilterSchema.Type;

type MentionFiles = typeof MentionFilesSchema.Type;

type CommentPrefillResult = typeof CommentPrefillSchema.Type;

type CommentAdded = typeof CommentAddedSchema.Type;

export {
  AttachmentIdsSchema,
  AuthorSchema,
  COMMENT_FILTER_VALUES,
  CommentAddedSchema,
  CommentDrawingSchema,
  CommentFieldSchema,
  CommentFilterSchema,
  CommentFrameSchema,
  CommentOrderSchema,
  CommentPrefillSchema,
  CommentRemovedSchema,
  CommentRepliedSchema,
  CommentResolvedSchema,
  CommentSchema,
  CommentStatusSchema,
  CommentTextSchema,
  DirectionFieldSchema,
  DraftStatusSchema,
  ElementSelectorSchema,
  FrameInputSchema,
  MentionFilesSchema,
  MentionsInputSchema,
  PagePathFieldSchema,
  PrefillIdsSchema,
  ProjectFieldSchema,
  ReorderIdsSchema,
  RunMentionSchema,
  SafeIdTextSchema,
  SelectionContextSchema,
  SelectorSchema,
  TargetInputSchema,
};

export type {
  Comment,
  CommentAdded,
  CommentFilter,
  CommentPrefillResult,
  CommentWire,
  MentionFiles,
};
