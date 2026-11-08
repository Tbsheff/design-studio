import { Effect, Schema } from "effect";

import { ProjectIdSchema } from "../_core/ids.js";

const PROMPT_MAX = 4000;

const BriefProjectIdFieldSchema = Schema.NullOr(ProjectIdSchema)
  .annotate({
    description:
      "The project to ground the brief in, or null for a brief with no project.",
  })
  .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null)));

const BriefPromptFieldSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(PROMPT_MAX)
).annotate({ description: "The short prompt to expand, 1 to 4000 chars." });

const BriefResultSchema = Schema.Struct({
  brief: Schema.String,
  isGrounded: Schema.Boolean,
  model: Schema.String,
});

export { BriefProjectIdFieldSchema, BriefPromptFieldSchema, BriefResultSchema };
