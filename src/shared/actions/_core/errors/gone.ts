import { Schema } from "effect";

class Gone extends Schema.TaggedError<Gone>()("Gone", {
  message: Schema.String,
}) {}

export { Gone };
