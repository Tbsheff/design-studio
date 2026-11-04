import { Schema } from "effect";

import { DirectEditCodeSchema } from "../schema.js";

class DirectEditConflict extends Schema.TaggedError<DirectEditConflict>()(
  "DirectEditConflict",
  {
    code: DirectEditCodeSchema,
    data: Schema.Struct({}),
    message: Schema.String,
  }
) {}

export { DirectEditConflict };
