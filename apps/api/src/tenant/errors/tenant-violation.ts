import { Schema } from "effect";

class TenantViolation extends Schema.TaggedError<TenantViolation>()(
  "TenantViolation",
  {
    message: Schema.String,
    statement: Schema.String,
  }
) {}

export { TenantViolation };
