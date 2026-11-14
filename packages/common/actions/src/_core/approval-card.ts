import { Schema } from "effect";

const ApprovalCardSchema = Schema.Struct({
  action: Schema.String,
  detail: Schema.String,
  folder: Schema.optionalKey(Schema.String),
  title: Schema.String,
});

type ApprovalCard = typeof ApprovalCardSchema.Type;

export { ApprovalCardSchema };

export type { ApprovalCard };
