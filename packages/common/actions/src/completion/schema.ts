import { Effect, Schema } from "effect";

const PROMPT_MAX = 20_000;

const MAX_TOKENS_DEFAULT = 512;

const MAX_TOKENS_LIMIT = 4096;

const CAP_MIN_USD = 0.1;

const CAP_MAX_USD = 50;

const CAP_DEFAULT_USD = 1;

const PromptFieldSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(PROMPT_MAX)
).annotate({ description: "The prompt text, 1 to 20000 chars." });

const SystemFieldSchema = Schema.NullOr(Schema.String).annotate({
  description: "A system prompt for the call, or null.",
});

const MaxTokensFieldSchema = Schema.Int.check(
  Schema.isBetween({ maximum: MAX_TOKENS_LIMIT, minimum: 1 })
)
  .annotate({ description: "The longest reply in tokens, 1 to 4096." })
  .pipe(Schema.withDecodingDefaultKey(Effect.succeed(MAX_TOKENS_DEFAULT)));

const FrameFieldSchema = Schema.NullOr(Schema.String)
  .annotate({ description: "The page path that made the call, or null." })
  .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null)));

const CapFieldSchema = Schema.Number.check(
  Schema.isBetween({ maximum: CAP_MAX_USD, minimum: CAP_MIN_USD })
).annotate({ description: "The monthly spend cap in USD, 0.1 to 50." });

const CompletionSettingsSchema = Schema.Struct({
  capUsd: CapFieldSchema,
  isEnabled: Schema.Boolean,
});

const CompletionRecordSchema = Schema.Struct({
  at: Schema.Number,
  costUsd: Schema.Number,
  frame: Schema.NullOr(Schema.String),
  id: Schema.String,
  model: Schema.String,
  ms: Schema.Number,
  promptHash: Schema.String,
  promptStart: Schema.String,
});

const CompletionFileSchema = Schema.Struct({
  records: Schema.Array(CompletionRecordSchema),
  settings: CompletionSettingsSchema,
});

const CompletionResultSchema = Schema.Struct({
  costUsd: Schema.Number,
  id: Schema.String,
  model: Schema.String,
  ms: Schema.Number,
  text: Schema.String,
});

export {
  CAP_DEFAULT_USD,
  CompletionFileSchema,
  CompletionRecordSchema,
  CompletionResultSchema,
  CompletionSettingsSchema,
  FrameFieldSchema,
  MaxTokensFieldSchema,
  PromptFieldSchema,
  SystemFieldSchema,
};
