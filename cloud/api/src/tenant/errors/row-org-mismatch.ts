import { Schema } from "effect";

const WRONG_ORG_MESSAGE = "A row has the wrong org id.";

class RowOrgMismatch extends Schema.TaggedError<RowOrgMismatch>()(
  "RowOrgMismatch",
  {
    message: Schema.String,
    statement: Schema.String,
  }
) {}

export { RowOrgMismatch, WRONG_ORG_MESSAGE };
