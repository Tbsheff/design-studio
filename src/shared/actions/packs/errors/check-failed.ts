import { Schema } from "effect";

class CheckFailed extends Schema.TaggedError<CheckFailed>()("CheckFailed", {
  code: Schema.Literal("check_failed"),
  data: Schema.Struct({ problems: Schema.Number }),
  message: Schema.String,
}) {}

export { CheckFailed };
