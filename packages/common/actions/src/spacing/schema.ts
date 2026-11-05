import {
  SPACING_PROPERTIES,
  SPACING_PX_MAX,
  SPACING_SIDES,
  SPACING_TOKEN,
} from "@design-studio/contracts/spacing";
import { Effect, Schema } from "effect";

import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";

const STYLE_MAX = 200;

const SCALE_MAX = 200;

const SpacingModeSchema = Schema.Literals(["classes", "css"]);

const SpacingSideSchema = Schema.Literals(SPACING_SIDES);

const StyleTextSchema = Schema.String.check(Schema.isMaxLength(STYLE_MAX));

const SpacingTokenSchema = Schema.String.check(Schema.isPattern(SPACING_TOKEN));

const PxRange = Schema.isBetween({
  maximum: SPACING_PX_MAX,
  minimum: -SPACING_PX_MAX,
});

const SpacingValueInputSchema = Schema.Number.check(PxRange);

const SpacingLimitSchema = Schema.Int.check(
  Schema.isBetween({ maximum: SCALE_MAX, minimum: 1 })
).pipe(Schema.withDecodingDefaultKey(Effect.succeed(SCALE_MAX)));

const SpacingSideDefaultSchema = SpacingSideSchema.pipe(
  Schema.withDecodingDefaultKey(Effect.succeed("all" as const))
);

const SpacingSnapSchema = Schema.Boolean.pipe(
  Schema.withDecodingDefaultKey(Effect.succeed(false))
);

const SpacingInputSchema = Schema.Struct({
  property: Schema.Literals(SPACING_PROPERTIES),
  side: SpacingSideDefaultSchema,
  snap: SpacingSnapSchema,
  token: Schema.optionalKey(SpacingTokenSchema),
  value: Schema.optionalKey(SpacingValueInputSchema),
});

const SpacingValueSchema = Schema.Struct({
  className: Schema.NullOr(Schema.String),
  css: Schema.NullOr(Schema.String),
  px: Schema.NullOr(Schema.Number),
  token: Schema.NullOr(Schema.String),
});

const SpacingBoxSidesSchema = Schema.Struct({
  bottom: SpacingValueSchema,
  left: SpacingValueSchema,
  right: SpacingValueSchema,
  top: SpacingValueSchema,
});

const SpacingGapSchema = Schema.Struct({
  column: SpacingValueSchema,
  row: SpacingValueSchema,
});

const SpacingRectSchema = Schema.Struct({
  height: Schema.Number,
  width: Schema.Number,
  x: Schema.Number,
  y: Schema.Number,
});

const SpacingStepSchema = Schema.Struct({
  px: Schema.Number,
  token: Schema.String,
});

const SpacingBoxSchema = Schema.Struct({
  gap: SpacingGapSchema,
  margin: SpacingBoxSidesSchema,
  mode: SpacingModeSchema,
  padding: SpacingBoxSidesSchema,
  rect: Schema.NullOr(SpacingRectSchema),
  scale: Schema.Array(SpacingStepSchema),
  source: Schema.String,
});

const SpacingClassChangesSchema = Schema.Struct({
  add: Schema.Array(Schema.String),
  remove: Schema.Array(Schema.String),
});

const SpacingChangeSchema = Schema.Struct({
  classes: Schema.NullOr(SpacingClassChangesSchema),
  files: Schema.Array(Schema.String),
  mode: SpacingModeSchema,
  style: Schema.Record(Schema.String, Schema.String),
  title: Schema.String,
  token: Schema.NullOr(Schema.String),
  versionId: Schema.NullOr(Schema.String),
});

const SpacingTargetFields = {
  directionId: DirectionIdSchema,
  projectId: ProjectIdSchema,
} as const;

const SpacingComputedFields = {
  gap: Schema.optionalKey(StyleTextSchema),
  margin: Schema.optionalKey(StyleTextSchema),
  padding: Schema.optionalKey(StyleTextSchema),
} as const;

export {
  SpacingBoxSchema,
  SpacingChangeSchema,
  SpacingComputedFields,
  SpacingInputSchema,
  SpacingLimitSchema,
  SpacingTargetFields,
};
