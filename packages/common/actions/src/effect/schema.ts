import {
  EFFECT_COLOR_MAX,
  EFFECT_COLOR_PATTERN,
  EFFECT_NAME_MAX,
  EFFECT_NAME_PATTERN,
  EFFECT_RANGES,
  EFFECT_SHADER_DEFAULT_COLORS,
  EFFECT_STACK_MAX,
  SHADER_COLORS_MAX,
  SHADER_COLORS_MIN,
  SHADER_COLOR_PATTERN,
  SHADER_PRESETS,
} from "@design-studio/contracts/layer-effect";
import type { EffectRange } from "@design-studio/contracts/layer-effect";
import { Effect, Schema } from "effect";

import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";

const toRange = (
  range: EffectRange
): Schema.withDecodingDefaultKey<Schema.Number> =>
  Schema.Finite.check(
    Schema.isBetween({ maximum: range.maximum, minimum: range.minimum })
  ).pipe(Schema.withDecodingDefaultKey(Effect.succeed(range.fallback)));

const toColor = (
  fallback: string
): Schema.withDecodingDefaultKey<Schema.String> =>
  Schema.String.check(
    Schema.isMaxLength(EFFECT_COLOR_MAX),
    Schema.isPattern(EFFECT_COLOR_PATTERN)
  ).pipe(Schema.withDecodingDefaultKey(Effect.succeed(fallback)));

const SEED_DEFAULT = Effect.succeed(EFFECT_RANGES.shaderSeed.fallback);

const SHADOW_COLOR = "rgba(0, 0, 0, 0.25)";

const IsEnabledSchema = Schema.Boolean.pipe(
  Schema.withDecodingDefaultKey(Effect.succeed(true))
);

const EffectNameSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(EFFECT_NAME_MAX),
  Schema.isPattern(EFFECT_NAME_PATTERN)
);

const ShaderColorSchema = Schema.String.check(
  Schema.isPattern(SHADER_COLOR_PATTERN)
);

const ShaderColorsSchema = Schema.Array(ShaderColorSchema)
  .check(Schema.isMinLength(SHADER_COLORS_MIN))
  .check(Schema.isMaxLength(SHADER_COLORS_MAX))
  .pipe(
    Schema.withDecodingDefaultKey(
      Effect.succeed([...EFFECT_SHADER_DEFAULT_COLORS])
    )
  );

const ShadowFields = {
  blur: toRange(EFFECT_RANGES.shadowBlur),
  color: toColor(SHADOW_COLOR),
  isEnabled: IsEnabledSchema,
  offsetX: toRange(EFFECT_RANGES.shadowOffsetX),
  offsetY: toRange(EFFECT_RANGES.shadowOffsetY),
  spread: toRange(EFFECT_RANGES.shadowSpread),
} as const;

const DropShadowSchema = Schema.Struct({
  ...ShadowFields,
  kind: Schema.Literal("drop-shadow"),
});

const InnerShadowSchema = Schema.Struct({
  ...ShadowFields,
  kind: Schema.Literal("inner-shadow"),
});

const LayerBlurSchema = Schema.Struct({
  isEnabled: IsEnabledSchema,
  kind: Schema.Literal("layer-blur"),
  radius: toRange(EFFECT_RANGES.layerBlur),
});

const BackgroundBlurSchema = Schema.Struct({
  isEnabled: IsEnabledSchema,
  kind: Schema.Literal("background-blur"),
  radius: toRange(EFFECT_RANGES.backdropBlur),
  saturation: toRange(EFFECT_RANGES.saturation),
});

const NoiseSchema = Schema.Struct({
  frequency: toRange(EFFECT_RANGES.noiseFrequency),
  isEnabled: IsEnabledSchema,
  isMonochrome: IsEnabledSchema,
  kind: Schema.Literal("noise"),
  opacity: toRange(EFFECT_RANGES.noiseOpacity),
});

const GlassSchema = Schema.Struct({
  blur: toRange(EFFECT_RANGES.glassBlur),
  edge: toRange(EFFECT_RANGES.glassEdge),
  isEnabled: IsEnabledSchema,
  kind: Schema.Literal("glass"),
  saturation: toRange(EFFECT_RANGES.glassSaturation),
  tint: toColor("#ffffff"),
  tintOpacity: toRange(EFFECT_RANGES.glassTint),
});

const SeedSchema = Schema.Int.check(
  Schema.isBetween({
    maximum: EFFECT_RANGES.shaderSeed.maximum,
    minimum: EFFECT_RANGES.shaderSeed.minimum,
  })
).pipe(Schema.withDecodingDefaultKey(SEED_DEFAULT));

const ShaderSchema = Schema.Struct({
  colors: ShaderColorsSchema,
  intensity: toRange(EFFECT_RANGES.shaderIntensity),
  isEnabled: IsEnabledSchema,
  kind: Schema.Literal("shader"),
  preset: Schema.Literals(SHADER_PRESETS),
  seed: SeedSchema,
  speed: toRange(EFFECT_RANGES.shaderSpeed),
});

const EffectItemSchema = Schema.Union([
  DropShadowSchema,
  InnerShadowSchema,
  LayerBlurSchema,
  BackgroundBlurSchema,
  NoiseSchema,
  GlassSchema,
  ShaderSchema,
]);

const EffectStackSchema = Schema.Array(EffectItemSchema).check(
  Schema.isMaxLength(EFFECT_STACK_MAX)
);

const EffectTargetFields = {
  directionId: DirectionIdSchema,
  projectId: ProjectIdSchema,
} as const;

const EffectSetFields = {
  effects: Schema.optionalKey(EffectStackSchema),
  styleName: Schema.optionalKey(Schema.NullOr(EffectNameSchema)),
} as const;

const EffectCreateFields = {
  effects: EffectStackSchema,
  name: EffectNameSchema,
} as const;

const EffectNameFields = {
  name: EffectNameSchema,
} as const;

const EffectStyleSchema = Schema.Struct({
  className: Schema.String,
  css: Schema.String,
  effects: EffectStackSchema,
  file: Schema.String,
  name: Schema.String,
});

const EffectInfoSchema = Schema.Struct({
  className: Schema.NullOr(Schema.String),
  effects: EffectStackSchema,
  file: Schema.String,
  reason: Schema.NullOr(Schema.String),
  sheet: Schema.NullOr(Schema.String),
  style: Schema.NullOr(EffectStyleSchema),
  styleName: Schema.NullOr(Schema.String),
});

const EffectChangeSchema = Schema.Struct({
  className: Schema.NullOr(Schema.String),
  files: Schema.Array(Schema.String),
  hasShaderRuntime: Schema.Boolean,
  styleName: Schema.NullOr(Schema.String),
  title: Schema.String,
  versionId: Schema.NullOr(Schema.String),
});

const EffectStyleSavedSchema = Schema.Struct({
  className: Schema.String,
  files: Schema.Array(Schema.String),
  isNew: Schema.Boolean,
  name: Schema.String,
  title: Schema.String,
  versionId: Schema.NullOr(Schema.String),
});

const EffectStyleDeletedSchema = Schema.Struct({
  files: Schema.Array(Schema.String),
  name: Schema.String,
  title: Schema.String,
  usedBy: Schema.Int,
  versionId: Schema.NullOr(Schema.String),
});

type EffectItem = Schema.Schema.Type<typeof EffectItemSchema>;

type EffectStyle = Schema.Schema.Type<typeof EffectStyleSchema>;

type EffectInfo = Schema.Schema.Type<typeof EffectInfoSchema>;

type EffectChange = Schema.Schema.Type<typeof EffectChangeSchema>;

type EffectStyleSaved = Schema.Schema.Type<typeof EffectStyleSavedSchema>;

type EffectStyleDeleted = Schema.Schema.Type<typeof EffectStyleDeletedSchema>;

export {
  EffectChangeSchema,
  EffectCreateFields,
  EffectInfoSchema,
  EffectItemSchema,
  EffectNameFields,
  EffectSetFields,
  EffectStackSchema,
  EffectStyleDeletedSchema,
  EffectStyleSavedSchema,
  EffectStyleSchema,
  EffectTargetFields,
};

export type {
  EffectChange,
  EffectInfo,
  EffectItem,
  EffectStyle,
  EffectStyleDeleted,
  EffectStyleSaved,
};
