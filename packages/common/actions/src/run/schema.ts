import { Schema } from "effect";

const QUEUE_MAX = 20;

const TEXT_MAX = 20_000;

const NOTE_MAX = 2000;

const RULE_MAX = 2000;

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/u;

const REQUEST_PATTERN = /^[A-Za-z0-9_-]{1,120}$/u;

const TextSchema = Schema.String.check(Schema.isMaxLength(TEXT_MAX));

const AlwaysSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(RULE_MAX)
);

const NoteSchema = Schema.String.check(Schema.isMaxLength(NOTE_MAX));

const QueueItemSchema = Schema.Struct({
  id: Schema.String.check(Schema.isPattern(ID_PATTERN)),
  text: TextSchema,
});

const QueueItemsSchema = Schema.Array(QueueItemSchema).check(
  Schema.isMaxLength(QUEUE_MAX)
);

const RequestIdSchema = Schema.String.check(Schema.isPattern(REQUEST_PATTERN));

const AckSchema = Schema.Struct({ ok: Schema.Boolean });

const RunStartedSchema = Schema.Struct({ runId: Schema.String });

const RunRequestSummarySchema = Schema.Struct({
  canvas: Schema.optionalKey(Schema.Struct({ path: Schema.String })),
  prompt: Schema.String,
});

const RunSummarySchema = Schema.Struct({
  directionId: Schema.String,
  finishedAt: Schema.NullOr(Schema.Number),
  id: Schema.String,
  projectId: Schema.String,
  request: RunRequestSummarySchema,
  startedAt: Schema.Number,
  status: Schema.String,
  title: Schema.optionalKey(Schema.String),
});

const RunEventSchema = Schema.Struct({
  seq: Schema.Number,
  ts: Schema.Number,
  type: Schema.String,
});

const RunSentSchema = Schema.Struct({
  directionId: Schema.String,
  projectId: Schema.String,
  runId: Schema.String,
  text: Schema.String,
  ts: Schema.Number,
  type: Schema.Literal("run.sent"),
});

const RunDetailSchema = Schema.Struct({
  events: Schema.Array(RunEventSchema),
  sent: Schema.Array(RunSentSchema),
  summary: Schema.NullOr(RunSummarySchema),
});

const RepoContextFileSchema = Schema.Struct({
  bytes: Schema.Number,
  droppedLines: Schema.Number,
  path: Schema.String,
  scope: Schema.String,
  sentBytes: Schema.Number,
  use: Schema.String,
});

const RepoContextSchema = Schema.Struct({
  appDir: Schema.NullOr(Schema.String),
  bytes: Schema.Number,
  files: Schema.Array(RepoContextFileSchema),
  text: Schema.NullOr(Schema.String),
  workspaceRoot: Schema.NullOr(Schema.String),
});

export {
  AckSchema,
  AlwaysSchema,
  NoteSchema,
  QueueItemsSchema,
  RequestIdSchema,
  RepoContextSchema,
  RunDetailSchema,
  RunStartedSchema,
  RunSummarySchema,
  TextSchema,
};
