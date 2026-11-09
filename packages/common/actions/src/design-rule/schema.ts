import { Effect, Schema } from "effect";

import { RunIdSchema } from "../_core/ids.js";

const RULE_TEXT_MAX = 2000;

const DesignRuleTextFieldSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(RULE_TEXT_MAX)
).annotate({
  description:
    "The user message that holds the correction, 1 to 2000 chars. Say what to always or never do.",
});

const DesignRuleRunIdFieldSchema = Schema.NullOr(RunIdSchema)
  .annotate({
    description: "The run the message belongs to, or null.",
  })
  .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null)));

const DesignRuleCreatedSchema = Schema.Struct({
  isChecked: Schema.Boolean,
  kind: Schema.Literals(["class", "token", "font", "component", "text"]),
  line: Schema.String,
  model: Schema.String,
  ruleCount: Schema.Int,
  ruleId: Schema.String,
});

export {
  DesignRuleCreatedSchema,
  DesignRuleRunIdFieldSchema,
  DesignRuleTextFieldSchema,
};
