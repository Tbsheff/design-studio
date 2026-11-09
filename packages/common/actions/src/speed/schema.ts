import { Effect, Schema } from "effect";

import { DirectionIdSchema, FrameIdSchema } from "../_core/ids.js";

const SPEED_RUNS_DEFAULT = 3;

const SPEED_RUNS_MAX = 5;

const SPEED_IMAGES_MAX = 3;

const SpeedPhaseSchema = Schema.Literals(["baseline", "compare"]);

const SpeedLastPhaseSchema = Schema.Literals(["none", "baseline", "compare"]);

const SpeedKeySchema = Schema.Literals([
  "lcp",
  "cls",
  "tbt",
  "transfer",
  "fonts",
]);

const SpeedDirectionField = Schema.NullOr(DirectionIdSchema)
  .annotate({
    description: "Direction id. Pass null for the main direction.",
  })
  .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null)));

const SpeedFrameField = FrameIdSchema.annotate({
  description: "Frame id on the canvas, for example f1.",
});

const SpeedGetFields = {
  directionId: SpeedDirectionField,
  frameId: SpeedFrameField,
} as const;

const SpeedRunFields = {
  directionId: SpeedDirectionField,
  frameId: SpeedFrameField,
  phase: SpeedPhaseSchema.annotate({
    description:
      "baseline loads the frame route and keeps the numbers before the edit. compare loads it again and returns each number with its change against the baseline.",
  }),
  runs: Schema.Int.check(
    Schema.isBetween({ maximum: SPEED_RUNS_MAX, minimum: 1 })
  )
    .annotate({
      description:
        "Cold page loads to measure. The result is the median. 1 to 5. The default is 3.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(SPEED_RUNS_DEFAULT))),
} as const;

const SpeedNumberSchema = Schema.Struct({
  baseline: Schema.NullOr(Schema.Number),
  change: Schema.NullOr(Schema.Number),
  key: SpeedKeySchema,
  value: Schema.NullOr(Schema.Number),
});

const SpeedImageSchema = Schema.Struct({
  bytes: Schema.Number,
  isNew: Schema.Boolean,
  url: Schema.String,
});

const SpeedResultSchema = Schema.Struct({
  frameId: Schema.NullOr(Schema.String),
  hasBaseline: Schema.Boolean,
  images: Schema.Array(SpeedImageSchema),
  isDevBuild: Schema.Boolean,
  numbers: Schema.Array(SpeedNumberSchema),
  phase: SpeedLastPhaseSchema,
  route: Schema.NullOr(Schema.String),
  runs: Schema.Int,
});

export {
  SPEED_IMAGES_MAX,
  SPEED_RUNS_DEFAULT,
  SPEED_RUNS_MAX,
  SpeedGetFields,
  SpeedImageSchema,
  SpeedKeySchema,
  SpeedLastPhaseSchema,
  SpeedNumberSchema,
  SpeedPhaseSchema,
  SpeedResultSchema,
  SpeedRunFields,
};
