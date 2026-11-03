import { Schema } from "effect";

import { DirectEditCodeSchema } from "../../_core/errors/direct-edit-code.js";

class DirectEditNotFound extends Schema.TaggedError<DirectEditNotFound>()(
  "DirectEditNotFound",
  {
    code: DirectEditCodeSchema,
    data: Schema.Struct({}),
    message: Schema.String,
  }
) {}

export { DirectEditNotFound };
