import { Schema } from "effect";

const ACTION_DONE = "action.done";

const MAX_WATCH = 64;

const AfterSeqSchema = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));

const StreamWatchSchema = Schema.Struct({
  unwatch: Schema.optionalKey(Schema.Array(Schema.String)),
  watch: Schema.optionalKey(Schema.Record(Schema.String, AfterSeqSchema)),
});

const StreamHelloSchema = Schema.Struct({
  sid: Schema.String,
});

const ActionDoneSchema = Schema.Struct({
  actionId: Schema.String,
  invalidates: Schema.Array(Schema.String),
  projectId: Schema.NullOr(Schema.String),
});

type StreamWatch = typeof StreamWatchSchema.Type;

type StreamHello = typeof StreamHelloSchema.Type;

type ActionDone = typeof ActionDoneSchema.Type;

export {
  ACTION_DONE,
  ActionDoneSchema,
  MAX_WATCH,
  StreamHelloSchema,
  StreamWatchSchema,
};

export type { ActionDone, StreamHello, StreamWatch };
