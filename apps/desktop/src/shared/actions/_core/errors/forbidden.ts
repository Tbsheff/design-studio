import { Schema } from "effect";

class Forbidden extends Schema.TaggedError<Forbidden>()("Forbidden", {
  message: Schema.String,
  perm: Schema.String,
}) {}

export { Forbidden };
