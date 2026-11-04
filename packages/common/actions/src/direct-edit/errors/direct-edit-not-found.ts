import { Schema } from "effect";

import { DirectEditCodeSchema } from "../schema.js";

class DirectEditNotFound extends Schema.TaggedError<DirectEditNotFound>()(
  "DirectEditNotFound",
  {
    code: DirectEditCodeSchema,
    data: Schema.Struct({}),
    message: Schema.String,
  }
) {}

export { DirectEditNotFound };
