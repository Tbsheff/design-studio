import {
  BLEND_MODES,
  BLEND_PROPERTIES,
  FILL_ANGLE_MAX,
  FILL_AT,
  FILL_COLOR,
  FILL_STOPS_MAX,
  FILL_STOPS_MIN,
  FILL_TOKEN,
  FILL_TYPES,
  RADIAL_FORMS,
} from "@design-studio/contracts/fill";
import { Schema } from "effect";

import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";

const PERCENT_MAX = 100;

const FillColorSchema = Schema.String.check(Schema.isPattern(FILL_COLOR));

const FillTokenSchema = Schema.String.check(Schema.isPattern(FILL_TOKEN));

const FillBlendModeSchema = Schema.Literals(BLEND_MODES);

const FillBlendPropertySchema = Schema.Literals(BLEND_PROPERTIES);

const FillFormSchema = Schema.Literals(RADIAL_FORMS);

const PercentRange = Schema.isBetween({ maximum: PERCENT_MAX, minimum: 0 });

const AngleRange = Schema.isBetween({
  maximum: FILL_ANGLE_MAX,
  minimum: -FILL_ANGLE_MAX,
});

const StopCount = [
  Schema.isMinLength(FILL_STOPS_MIN),
  Schema.isMaxLength(FILL_STOPS_MAX),
] as const;

const FillStopInputSchema = Schema.Struct({
  color: Schema.optionalKey(FillColorSchema),
  position: Schema.optionalKey(Schema.Number.check(PercentRange)),
  token: Schema.optionalKey(FillTokenSchema),
});

const FillStopListSchema = Schema.Array(FillStopInputSchema).check(
  ...StopCount
);

const FillAtSchema = Schema.String.check(Schema.isPattern(FILL_AT));

const FillInputSchema = Schema.Struct({
  angle: Schema.optionalKey(Schema.Number.check(AngleRange)),
  at: Schema.optionalKey(FillAtSchema),
  blendMode: Schema.optionalKey(FillBlendModeSchema),
  blendProperty: Schema.optionalKey(FillBlendPropertySchema),
  color: Schema.optionalKey(FillColorSchema),
  form: Schema.optionalKey(FillFormSchema),
  stops: Schema.optionalKey(FillStopListSchema),
  token: Schema.optionalKey(FillTokenSchema),
  type: Schema.Literals(FILL_TYPES),
});

const FillPaintSchema = Schema.Struct({
  color: Schema.String,
  token: Schema.NullOr(Schema.String),
});

const FillStopSchema = Schema.Struct({
  color: Schema.String,
  position: Schema.NullOr(Schema.Number),
  token: Schema.NullOr(Schema.String),
});

const FillBlendSchema = Schema.Struct({
  mode: FillBlendModeSchema,
  property: FillBlendPropertySchema,
});

const FillSpecSchema = Schema.Union([
  Schema.Struct({ paint: FillPaintSchema, type: Schema.Literal("solid") }),
  Schema.Struct({
    angle: Schema.Number,
    stops: Schema.Array(FillStopSchema),
    type: Schema.Literal("linear"),
  }),
  Schema.Struct({
    at: Schema.NullOr(Schema.String),
    form: FillFormSchema,
    stops: Schema.Array(FillStopSchema),
    type: Schema.Literal("radial"),
  }),
]);

const FillModeSchema = Schema.Literals(["classes", "css"]);

const FillInfoSchema = Schema.Struct({
  blend: Schema.Array(FillBlendSchema),
  classes: Schema.Array(Schema.String),
  css: Schema.NullOr(Schema.String),
  file: Schema.String,
  fill: Schema.NullOr(FillSpecSchema),
  mode: FillModeSchema,
});

const FillClassChangesSchema = Schema.Struct({
  add: Schema.Array(Schema.String),
  remove: Schema.Array(Schema.String),
});

const FillChangeSchema = Schema.Struct({
  blend: Schema.NullOr(FillBlendSchema),
  classes: Schema.NullOr(FillClassChangesSchema),
  files: Schema.Array(Schema.String),
  fill: FillSpecSchema,
  mode: FillModeSchema,
  title: Schema.String,
  versionId: Schema.String,
});

const FillTargetFields = {
  directionId: DirectionIdSchema,
  projectId: ProjectIdSchema,
} as const;

export { FillChangeSchema, FillInfoSchema, FillInputSchema, FillTargetFields };
