import { Effect, Schema } from "effect";

import { DirectionIdSchema } from "../../_core/ids.js";

const DECISION_TEXT_MAX = 80;

const OPTION_TEXT_MAX = 200;

const OPTIONS_MIN = 2;

const OPTIONS_MAX = 4;

const DECISION_ID_PATTERN = /^d[1-9]\d{0,2}$/u;

const CURRENT_RUN = "current";

const DecisionIdSchema = Schema.String.check(
  Schema.isPattern(DECISION_ID_PATTERN)
);

const DecisionDirectionSchema = Schema.NullOr(DirectionIdSchema).pipe(
  Schema.withDecodingDefaultKey(Effect.succeed(null))
);

const DecisionTopicSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(DECISION_TEXT_MAX)
).annotate({
  description: "The short name of the choice, for example Layout or Tone.",
});

const DecisionOptionSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(DECISION_TEXT_MAX)
);

const DecisionOptionsSchema = Schema.Array(DecisionOptionSchema)
  .check(Schema.isMinLength(OPTIONS_MIN), Schema.isMaxLength(OPTIONS_MAX))
  .annotate({
    description:
      "2 to 4 short options, the chosen option first. The user can pick one to change the design.",
  });

const PickedOptionSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(OPTION_TEXT_MAX)
).annotate({
  description:
    "The option to use. One of the listed options, or a short free text.",
});

const DecisionSchema = Schema.Struct({
  chosen: Schema.String,
  id: Schema.String,
  options: Schema.Array(Schema.String),
  picked: Schema.NullOr(Schema.String),
  topic: Schema.String,
});

const DecisionPickSchema = Schema.Struct({
  isSteer: Schema.Boolean,
  runId: Schema.String,
});

type Decision = typeof DecisionSchema.Type;

type DecisionWire = typeof DecisionSchema.Encoded;

type DecisionPick = typeof DecisionPickSchema.Type;

export {
  CURRENT_RUN,
  DecisionDirectionSchema,
  DecisionIdSchema,
  DecisionOptionSchema,
  DecisionOptionsSchema,
  DecisionPickSchema,
  DecisionSchema,
  DecisionTopicSchema,
  OPTIONS_MAX,
  PickedOptionSchema,
};

export type { Decision, DecisionPick, DecisionWire };
