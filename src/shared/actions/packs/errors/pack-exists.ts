import { Schema } from "effect";

import { PackSummarySchema } from "../schema.js";

class PackExists extends Schema.TaggedError<PackExists>()("PackExists", {
  code: Schema.Literal("pack_exists"),
  data: Schema.Struct({ existing: PackSummarySchema }),
  message: Schema.String,
}) {}

export { PackExists };
