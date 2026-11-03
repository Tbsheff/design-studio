import { Schema } from "effect";

import { DirectEditCodeSchema } from "../schema.js";

class DirectEditFailed extends Schema.TaggedError<DirectEditFailed>()(
  "DirectEditFailed",
  {
    code: DirectEditCodeSchema,
    data: Schema.Struct({}),
    message: Schema.String,
  }
) {}

export { DirectEditFailed };
