import { Schema } from "effect";

class CfFailed extends Schema.TaggedError<CfFailed>()("CfFailed", {
  message: Schema.String,
}) {}

export { CfFailed };
