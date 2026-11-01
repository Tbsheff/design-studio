import { Schema } from "effect";

class CfFailed extends Schema.TaggedError<CfFailed>()("CfFailed", {
  message: Schema.String,
  timedOut: Schema.Boolean,
}) {}

export { CfFailed };
