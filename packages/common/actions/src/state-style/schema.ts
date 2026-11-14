import { DIRECT_STYLE_PROPERTIES } from "@design-studio/contracts";
import {
  STATE_SELECTOR_MAX,
  STYLE_STATES,
} from "@design-studio/contracts/state-styles";
import { Effect, Schema } from "effect";

import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";

const BREAKPOINT_PATTERN = /^(?:base|[a-z0-9][a-z0-9-]{0,30})$/u;

const BREAKPOINT_VALUE_MAX = 400;

const FRAME_MAX = 60;

const LIST_MAX = 200;

const StateStyleStateSchema = Schema.Literals(STYLE_STATES);

const StateStyleModeSchema = Schema.Literals(["classes", "css", "none"]);

const StateStyleBreakpointSchema = Schema.String.check(
  Schema.isPattern(BREAKPOINT_PATTERN)
);

const StateStyleBreakpointDefaultSchema = StateStyleBreakpointSchema.pipe(
  Schema.withDecodingDefaultKey(Effect.succeed("base"))
);

const StateStyleValueSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(BREAKPOINT_VALUE_MAX)
);

const StateStyleFrameSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(FRAME_MAX)
);

const StateStyleLayerSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(STATE_SELECTOR_MAX)
);

const StateStyleLimitSchema = Schema.Int.check(
  Schema.isBetween({ maximum: LIST_MAX, minimum: 1 })
).pipe(Schema.withDecodingDefaultKey(Effect.succeed(LIST_MAX)));

const StateStyleOverrideSchema = Schema.Struct({
  breakpoint: Schema.String,
  prefix: Schema.String,
  props: Schema.Array(Schema.String),
  set: Schema.Array(Schema.String),
  state: StateStyleStateSchema,
});

const StateStyleLayerInfoSchema = Schema.Struct({
  file: Schema.String,
  mode: StateStyleModeSchema,
  overrides: Schema.Array(StateStyleOverrideSchema),
  reason: Schema.NullOr(Schema.String),
});

const StateStyleForcedSchema = Schema.Struct({
  frameId: Schema.String,
  selector: Schema.NullOr(Schema.String),
  state: Schema.NullOr(StateStyleStateSchema),
});

const StateStyleForcedChangeSchema = Schema.Struct({
  frameId: Schema.String,
  isStructural: Schema.Boolean,
  selector: Schema.NullOr(Schema.String),
  state: Schema.NullOr(StateStyleStateSchema),
});

const StateStyleEdgeSchema = Schema.Literals(["list", "siblings"]);

const StateStyleGroupSchema = Schema.Struct({
  hasDataState: Schema.Boolean,
  name: Schema.NullOr(Schema.String),
});

const StateStyleInfoSchema = Schema.Struct({
  edge: Schema.NullOr(StateStyleEdgeSchema),
  forced: Schema.Array(StateStyleForcedSchema),
  group: Schema.NullOr(StateStyleGroupSchema),
  layer: StateStyleLayerInfoSchema,
  other: Schema.Array(Schema.String),
  states: Schema.Array(StateStyleStateSchema),
});

const StateStyleClassChangesSchema = Schema.Struct({
  add: Schema.Array(Schema.String),
  remove: Schema.Array(Schema.String),
});

const StateStyleChangeSchema = Schema.Struct({
  breakpoint: Schema.String,
  classes: Schema.NullOr(StateStyleClassChangesSchema),
  files: Schema.Array(Schema.String),
  mode: StateStyleModeSchema,
  prefix: Schema.String,
  property: Schema.String,
  state: StateStyleStateSchema,
  title: Schema.String,
  value: Schema.NullOr(Schema.String),
  versionId: Schema.NullOr(Schema.String),
});

const StateStyleTargetFields = {
  directionId: DirectionIdSchema,
  projectId: ProjectIdSchema,
} as const;

const StateStyleChangeFields = {
  breakpoint: Schema.optionalKey(StateStyleBreakpointSchema),
  property: Schema.Literals(DIRECT_STYLE_PROPERTIES),
  reset: Schema.optionalKey(Schema.Boolean),
  state: StateStyleStateSchema,
  value: Schema.optionalKey(StateStyleValueSchema),
} as const;

const StateStyleForcedFields = {
  frameId: Schema.optionalKey(StateStyleFrameSchema),
  layer: Schema.optionalKey(Schema.NullOr(StateStyleLayerSchema)),
  state: Schema.NullOr(StateStyleStateSchema),
} as const;

export {
  StateStyleBreakpointDefaultSchema,
  StateStyleChangeFields,
  StateStyleChangeSchema,
  StateStyleForcedChangeSchema,
  StateStyleForcedFields,
  StateStyleForcedSchema,
  StateStyleInfoSchema,
  StateStyleLimitSchema,
  StateStyleTargetFields,
};
