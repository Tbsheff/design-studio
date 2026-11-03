import { Schema } from "effect";

import { DirectEditCodeSchema } from "./direct-edit-code.js";

class DirectEditError extends Schema.TaggedError<DirectEditError>()(
  "DirectEditError",
  {
    code: DirectEditCodeSchema,
    data: Schema.Struct({}),
    message: Schema.String,
  }
) {}

export { DirectEditError };
