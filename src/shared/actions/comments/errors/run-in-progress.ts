import { Schema } from "effect";

class RunInProgress extends Schema.TaggedError<RunInProgress>()(
  "RunInProgress",
  {
    message: Schema.String,
  }
) {}

export { RunInProgress };
