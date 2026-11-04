import { Schema } from "effect";

class RunInProgress extends Schema.TaggedError<RunInProgress>()(
  "RunInProgress",
  {
    code: Schema.Literal("run_in_progress"),
    data: Schema.Struct({}),
    message: Schema.String,
  }
) {}

export { RunInProgress };
