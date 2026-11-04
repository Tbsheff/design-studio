import { Schema } from "effect";

class Unauthenticated extends Schema.TaggedError<Unauthenticated>()(
  "Unauthenticated",
  {
    message: Schema.String,
  }
) {}

export { Unauthenticated };
