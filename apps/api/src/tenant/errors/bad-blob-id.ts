import { Schema } from "effect";

class BadBlobId extends Schema.TaggedError<BadBlobId>()("BadBlobId", {
  kind: Schema.String,
  message: Schema.String,
}) {}

export { BadBlobId };
