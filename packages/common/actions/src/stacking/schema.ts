import {
  STACKING_OVERFLOWS,
  STACKING_POSITIONS,
  STACKING_VALUE_MAX,
} from "@design-studio/contracts/stacking";
import { Effect, Schema } from "effect";

import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";

const BREAKPOINT_PATTERN = /^(?:base|[a-z0-9][a-z0-9-]{0,30})$/u;

const StackingModeSchema = Schema.Literals(["classes", "css", "none"]);

const StackingSourceSchema = Schema.Literals([
  "arbitrary",
  "class",
  "css",
  "scale",
  "token",
  "unset",
]);

const StackingBreakpointSchema = Schema.String.check(
  Schema.isPattern(BREAKPOINT_PATTERN)
);

const StackingBreakpointDefaultSchema = StackingBreakpointSchema.pipe(
  Schema.withDecodingDefaultKey(Effect.succeed("base"))
);

const StackingTextSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(STACKING_VALUE_MAX)
);

const StackingOffsetSchema = Schema.optionalKey(
  Schema.NullOr(StackingTextSchema)
);

const StackingOverflowSchema = Schema.optionalKey(
  Schema.NullOr(Schema.Literals(STACKING_OVERFLOWS))
);

const StackingPositionSchema = Schema.optionalKey(
  Schema.NullOr(Schema.Literals(STACKING_POSITIONS))
);

const StackingChangeFields = {
  bottom: StackingOffsetSchema,
  breakpoint: Schema.optionalKey(StackingBreakpointSchema),
  left: StackingOffsetSchema,
  overflow: StackingOverflowSchema,
  overflowX: StackingOverflowSchema,
  overflowY: StackingOverflowSchema,
  position: StackingPositionSchema,
  right: StackingOffsetSchema,
  top: StackingOffsetSchema,
  zIndex: StackingOffsetSchema,
} as const;

const StackingValueSchema = Schema.Struct({
  className: Schema.NullOr(Schema.String),
  source: StackingSourceSchema,
  token: Schema.NullOr(Schema.String),
  value: Schema.NullOr(Schema.String),
});

const StackingInsetSchema = Schema.Struct({
  bottom: StackingValueSchema,
  left: StackingValueSchema,
  right: StackingValueSchema,
  top: StackingValueSchema,
});

const StackingInfoSchema = Schema.Struct({
  breakpoint: Schema.String,
  file: Schema.String,
  inset: StackingInsetSchema,
  mode: StackingModeSchema,
  overflowX: StackingValueSchema,
  overflowY: StackingValueSchema,
  position: StackingValueSchema,
  prefix: Schema.String,
  reason: Schema.NullOr(Schema.String),
  zIndex: StackingValueSchema,
});

const StackingClassChangesSchema = Schema.Struct({
  add: Schema.Array(Schema.String),
  remove: Schema.Array(Schema.String),
});

const StackingChangeSchema = Schema.Struct({
  breakpoint: Schema.String,
  classes: Schema.NullOr(StackingClassChangesSchema),
  files: Schema.Array(Schema.String),
  mode: StackingModeSchema,
  prefix: Schema.String,
  style: Schema.Record(Schema.String, Schema.NullOr(Schema.String)),
  title: Schema.String,
  versionId: Schema.NullOr(Schema.String),
});

const StackingTargetFields = {
  directionId: DirectionIdSchema,
  projectId: ProjectIdSchema,
} as const;

export {
  StackingBreakpointDefaultSchema,
  StackingChangeFields,
  StackingChangeSchema,
  StackingInfoSchema,
  StackingTargetFields,
};
