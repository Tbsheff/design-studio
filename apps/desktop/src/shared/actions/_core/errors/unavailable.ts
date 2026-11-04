import { Schema } from "effect";

class Unavailable extends Schema.TaggedError<Unavailable>()("Unavailable", {
  message: Schema.String,
}) {}

export { Unavailable };
