import { Schema } from "effect";

class NotImplemented extends Schema.TaggedError<NotImplemented>()(
  "NotImplemented",
  {
    message: Schema.String,
  }
) {}

export { NotImplemented };
