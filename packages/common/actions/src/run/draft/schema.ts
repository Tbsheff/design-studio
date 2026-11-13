import { Schema } from "effect";

const DRAFT_HTML_MAX_BYTES = 262_144;

const RunDraftSchema = Schema.Struct({
  bytes: Schema.Int,
  html: Schema.NullOr(Schema.String),
  isComplete: Schema.Boolean,
  path: Schema.NullOr(Schema.String),
});

type RunDraft = typeof RunDraftSchema.Type;

export { DRAFT_HTML_MAX_BYTES, RunDraftSchema };

export type { RunDraft };
