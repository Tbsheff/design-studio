import {
  ENTRANCE_PRESETS,
  MOTION_DELAY_MAX,
  MOTION_DURATION_MAX,
  MOTION_KINDS,
  MOTION_PROPERTIES_MAX,
  MOTION_PROPERTY,
  MOTION_STAGGER_MAX,
  MOTION_STATES,
  MOTION_VALUE,
} from "@design-studio/contracts/motion";
import { Schema } from "effect";

import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";

const EASING_MAX = 80;

const MotionModeSchema = Schema.Literals(["classes", "css"]);

const MotionKindSchema = Schema.Literals(MOTION_KINDS);

const DelayRange = Schema.isBetween({ maximum: MOTION_DELAY_MAX, minimum: 0 });

const DurationRange = Schema.isBetween({
  maximum: MOTION_DURATION_MAX,
  minimum: 0,
});

const StaggerRange = Schema.isBetween({
  maximum: MOTION_STAGGER_MAX,
  minimum: 0,
});

const PropertySchema = Schema.String.check(Schema.isPattern(MOTION_PROPERTY));

const ValueSchema = Schema.String.check(Schema.isPattern(MOTION_VALUE));

const PropertyListSchema = Schema.Array(PropertySchema).check(
  Schema.isMaxLength(MOTION_PROPERTIES_MAX)
);

const EasingSchema = Schema.String.check(Schema.isMaxLength(EASING_MAX));

const MotionSpecSchema = Schema.Struct({
  delayMs: Schema.optionalKey(Schema.Int.check(DelayRange)),
  durationMs: Schema.optionalKey(Schema.Int.check(DurationRange)),
  easing: Schema.optionalKey(EasingSchema),
  end: Schema.optionalKey(Schema.Record(PropertySchema, ValueSchema)),
  kind: MotionKindSchema,
  preset: Schema.optionalKey(Schema.Literals(ENTRANCE_PRESETS)),
  properties: Schema.optionalKey(PropertyListSchema),
  staggerMs: Schema.optionalKey(Schema.Int.check(StaggerRange)),
  state: Schema.optionalKey(Schema.Literals(MOTION_STATES)),
});

const MotionInfoSchema = Schema.Struct({
  animations: Schema.Array(Schema.String),
  classes: Schema.Array(Schema.String),
  file: Schema.String,
  marker: Schema.NullOr(Schema.String),
  mode: MotionModeSchema,
  reducedMotionGuard: Schema.Boolean,
  rules: Schema.Array(Schema.String),
  transitions: Schema.Array(Schema.String),
});

const MotionClassChangesSchema = Schema.Struct({
  add: Schema.Array(Schema.String),
  remove: Schema.Array(Schema.String),
});

const MotionChangeSchema = Schema.Struct({
  classes: Schema.NullOr(MotionClassChangesSchema),
  files: Schema.Array(Schema.String),
  kind: MotionKindSchema,
  mode: MotionModeSchema,
  title: Schema.String,
  versionId: Schema.NullOr(Schema.String),
});

const MotionTargetFields = {
  directionId: DirectionIdSchema,
  projectId: ProjectIdSchema,
} as const;

export {
  MotionChangeSchema,
  MotionInfoSchema,
  MotionSpecSchema,
  MotionTargetFields,
};
