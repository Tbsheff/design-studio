import { Schema } from "effect";

import { DirectEditCodeSchema } from "../../_core/errors/direct-edit-code.js";

class DirectEditConflict extends Schema.TaggedError<DirectEditConflict>()(
  "DirectEditConflict",
  {
    code: DirectEditCodeSchema,
    data: Schema.Struct({}),
    message: Schema.String,
  }
) {}

export { DirectEditConflict };
