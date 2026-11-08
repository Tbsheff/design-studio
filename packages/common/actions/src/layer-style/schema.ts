import { Effect, Schema } from "effect";

import { DirectionIdSchema } from "../_core/ids.js";

const LAYER_STYLE_GROUPS = [
  "fill",
  "text",
  "spacing",
  "size",
  "border",
  "radius",
  "effect",
  "layout",
] as const;

const LAYER_ID_MAX = 2000;

const TARGET_MIN = 1;

const TARGET_MAX = 50;

const APPLY_GROUPS = [
  "fill",
  "text",
  "spacing",
  "border",
  "radius",
  "effect",
] as const;

const LayerStyleGroupSchema = Schema.Literals(LAYER_STYLE_GROUPS);

const LayerIdSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(LAYER_ID_MAX)
);

const DirectionFieldSchema = Schema.NullOr(DirectionIdSchema);

const GetGroupsSchema = Schema.Array(LayerStyleGroupSchema).pipe(
  Schema.withDecodingDefaultKey(Effect.succeed([...LAYER_STYLE_GROUPS]))
);

const ApplyGroupsSchema = Schema.Array(LayerStyleGroupSchema).pipe(
  Schema.withDecodingDefaultKey(Effect.succeed([...APPLY_GROUPS]))
);

const TargetLayerIdsSchema = Schema.Array(LayerIdSchema).check(
  Schema.isMinLength(TARGET_MIN),
  Schema.isMaxLength(TARGET_MAX)
);

const LayerStyleDeclarationSchema = Schema.Struct({
  property: Schema.String,
  value: Schema.String,
});

const LayerStyleEntrySchema = Schema.Struct({
  classes: Schema.Array(Schema.String),
  declarations: Schema.Array(LayerStyleDeclarationSchema),
  group: LayerStyleGroupSchema,
});

const LayerStyleSchema = Schema.Struct({
  groups: Schema.Array(LayerStyleEntrySchema),
  layerId: Schema.String,
  mode: Schema.Literals(["tailwind", "css"]),
});

const LayerStyleSkippedSchema = Schema.Struct({
  layerId: Schema.String,
  reason: Schema.String,
});

const LayerStyleChangeSchema = Schema.Struct({
  changed: Schema.Array(Schema.String),
  skipped: Schema.Array(LayerStyleSkippedSchema),
  versionId: Schema.NullOr(Schema.String),
});

export {
  ApplyGroupsSchema,
  DirectionFieldSchema,
  GetGroupsSchema,
  LAYER_STYLE_GROUPS,
  LayerIdSchema,
  LayerStyleChangeSchema,
  LayerStyleSchema,
  TargetLayerIdsSchema,
};
