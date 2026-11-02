import { Schema } from "effect";

class RateLimited extends Schema.TaggedError<RateLimited>()("RateLimited", {
  message: Schema.String,
  retryAfter: Schema.Number,
}) {}

export { RateLimited };
