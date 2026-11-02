import { Schema } from "effect";

class RowOrgMismatch extends Schema.TaggedError<RowOrgMismatch>()(
  "RowOrgMismatch",
  {
    message: Schema.String,
    statement: Schema.String,
  }
) {}

export { RowOrgMismatch };
