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

const RunDetailSchema = Schema.Struct({
  events: Schema.Array(Schema.Json),
  sent: Schema.Array(Schema.Json),
  summary: Schema.NullOr(Schema.Json),
});

const RunPageSchema = Schema.Struct({
  nextBefore: Schema.NullOr(Schema.Number),
  runs: Schema.Array(Schema.Json),
});

const RunSummarySchema = Schema.Struct({
  id: Schema.String,
  status: Schema.String,
});

export {
  AckSchema,
  AlwaysSchema,
  NoteSchema,
  QueueItemsSchema,
  RequestIdSchema,
  RunDetailSchema,
  RunPageSchema,
  RunStartedSchema,
  RunSummarySchema,
  TextSchema,
};
