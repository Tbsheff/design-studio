import { Effect, Schema } from "effect";

const TASK_MIN = 10;

const TASK_MAX = 300;

const PERSONA_MAX = 300;

const STEPS_MIN = 1;

const STEPS_DEFAULT = 12;

const STEPS_MAX = 25;

const TEXT_MAX = 400;

const WalkthroughIdSchema = Schema.String.check(
  Schema.isPattern(/^wt-[0-9a-f]{12}$/u)
);

const TaskFieldSchema = Schema.String.check(
  Schema.isMinLength(TASK_MIN),
  Schema.isMaxLength(TASK_MAX)
).annotate({
  description:
    "The task in plain words, 10 to 300 chars, such as: Schedule a visit for a patient.",
});

const PersonaFieldSchema = Schema.NullOr(
  Schema.String.check(Schema.isMaxLength(PERSONA_MAX))
).annotate({
  description: "Who the synthetic user is, or null for a first-time user.",
});

const MaxStepsFieldSchema = Schema.Int.check(
  Schema.isBetween({ maximum: STEPS_MAX, minimum: STEPS_MIN })
)
  .annotate({
    description: "Step limit from 1 to 25. Default 12.",
  })
  .pipe(Schema.withDecodingDefaultKey(Effect.succeed(STEPS_DEFAULT)));

const CanWriteFieldSchema = Schema.Boolean.annotate({
  description:
    "When false, the walk aborts every POST, PUT, PATCH and DELETE request. Use false in an attached app.",
});

const WalkthroughOutcomeSchema = Schema.Literals([
  "done",
  "stuck",
  "max-steps",
]);

const WalkthroughStepActionSchema = Schema.Literals([
  "click",
  "type",
  "scroll",
  "done",
  "stuck",
]);

const WalkthroughStepSchema = Schema.Struct({
  action: WalkthroughStepActionSchema,
  index: Schema.Int,
  layerId: Schema.NullOr(Schema.String),
  reason: Schema.String.check(Schema.isMaxLength(TEXT_MAX)),
  shotPath: Schema.String,
  targetName: Schema.String,
  url: Schema.String,
});

const WalkthroughFrictionSchema = Schema.Struct({
  fix: Schema.String.check(Schema.isMaxLength(TEXT_MAX)),
  severity: Schema.Literals(["low", "medium", "high"]),
  step: Schema.Int,
  text: Schema.String.check(Schema.isMaxLength(TEXT_MAX)),
});

const WalkthroughSchema = Schema.Struct({
  frictions: Schema.Array(WalkthroughFrictionSchema),
  outcome: WalkthroughOutcomeSchema,
  sheetPath: Schema.String,
  steps: Schema.Array(WalkthroughStepSchema),
  walkthroughId: WalkthroughIdSchema,
});

export {
  CanWriteFieldSchema,
  MaxStepsFieldSchema,
  PersonaFieldSchema,
  TaskFieldSchema,
  WalkthroughFrictionSchema,
  WalkthroughIdSchema,
  WalkthroughOutcomeSchema,
  WalkthroughSchema,
  WalkthroughStepActionSchema,
  WalkthroughStepSchema,
};
