import { EFFECT_KINDS, EFFECT_RANGES } from "./deps.js";
import type { EffectKind } from "./deps.js";
import type { EffectItem } from "./effect-types.js";

type ShadowItem = Extract<
  EffectItem,
  { readonly kind: "drop-shadow" | "inner-shadow" }
>;

type FieldKey =
  | "blur"
  | "edge"
  | "frequency"
  | "intensity"
  | "offsetX"
  | "offsetY"
  | "opacity"
  | "radius"
  | "saturation"
  | "speed"
  | "spread"
  | "tintOpacity";

interface FieldSpec {
  readonly fallback: number;
  readonly key: FieldKey;
  readonly maximum: number;
  readonly minimum: number;
  readonly step: number;
}

interface FieldView {
  readonly spec: FieldSpec;
  readonly value: number;
}

const OFFSET_X: FieldSpec = {
  key: "offsetX",
  step: 1,
  ...EFFECT_RANGES.shadowOffsetX,
};

const OFFSET_Y: FieldSpec = {
  key: "offsetY",
  step: 1,
  ...EFFECT_RANGES.shadowOffsetY,
};

const SHADOW_BLUR: FieldSpec = {
  key: "blur",
  step: 1,
  ...EFFECT_RANGES.shadowBlur,
};

const SPREAD: FieldSpec = {
  key: "spread",
  step: 1,
  ...EFFECT_RANGES.shadowSpread,
};

const LAYER_RADIUS: FieldSpec = {
  key: "radius",
  step: 1,
  ...EFFECT_RANGES.layerBlur,
};

const BACKDROP_RADIUS: FieldSpec = {
  key: "radius",
  step: 1,
  ...EFFECT_RANGES.backdropBlur,
};

const SATURATION: FieldSpec = {
  key: "saturation",
  step: 5,
  ...EFFECT_RANGES.saturation,
};

const NOISE_OPACITY: FieldSpec = {
  key: "opacity",
  step: 0.02,
  ...EFFECT_RANGES.noiseOpacity,
};

const NOISE_GRAIN: FieldSpec = {
  key: "frequency",
  step: 0.05,
  ...EFFECT_RANGES.noiseFrequency,
};

const GLASS_BLUR: FieldSpec = {
  key: "blur",
  step: 1,
  ...EFFECT_RANGES.glassBlur,
};

const GLASS_TINT: FieldSpec = {
  key: "tintOpacity",
  step: 0.05,
  ...EFFECT_RANGES.glassTint,
};

const GLASS_EDGE: FieldSpec = {
  key: "edge",
  step: 0.05,
  ...EFFECT_RANGES.glassEdge,
};

const SHADER_STRENGTH: FieldSpec = {
  key: "intensity",
  step: 0.05,
  ...EFFECT_RANGES.shaderIntensity,
};

const SHADER_SPEED: FieldSpec = {
  key: "speed",
  step: 0.1,
  ...EFFECT_RANGES.shaderSpeed,
};

const SHADOW_COLOR = "rgba(0, 0, 0, 0.25)";

const SHADER_COLORS = ["#6d5dfc", "#22d3ee", "#f472b6"];

const toNewShadow = (picked: ShadowItem["kind"]): ShadowItem => ({
  blur: EFFECT_RANGES.shadowBlur.fallback,
  color: SHADOW_COLOR,
  isEnabled: true,
  kind: picked,
  offsetX: EFFECT_RANGES.shadowOffsetX.fallback,
  offsetY: EFFECT_RANGES.shadowOffsetY.fallback,
  spread: EFFECT_RANGES.shadowSpread.fallback,
});

const toNewEffect = (picked: EffectKind): EffectItem => {
  if (picked === "drop-shadow" || picked === "inner-shadow") {
    return toNewShadow(picked);
  }

  if (picked === "layer-blur") {
    return {
      isEnabled: true,
      kind: picked,
      radius: EFFECT_RANGES.layerBlur.fallback,
    };
  }

  if (picked === "background-blur") {
    return {
      isEnabled: true,
      kind: picked,
      radius: EFFECT_RANGES.backdropBlur.fallback,
      saturation: EFFECT_RANGES.saturation.fallback,
    };
  }

  if (picked === "noise") {
    return {
      frequency: EFFECT_RANGES.noiseFrequency.fallback,
      isEnabled: true,
      isMonochrome: true,
      kind: picked,
      opacity: EFFECT_RANGES.noiseOpacity.fallback,
    };
  }

  if (picked === "glass") {
    return {
      blur: EFFECT_RANGES.glassBlur.fallback,
      edge: EFFECT_RANGES.glassEdge.fallback,
      isEnabled: true,
      kind: picked,
      saturation: EFFECT_RANGES.glassSaturation.fallback,
      tint: "#ffffff",
      tintOpacity: EFFECT_RANGES.glassTint.fallback,
    };
  }

  return {
    colors: SHADER_COLORS,
    intensity: EFFECT_RANGES.shaderIntensity.fallback,
    isEnabled: true,
    kind: picked,
    preset: "mesh",
    seed: EFFECT_RANGES.shaderSeed.fallback,
    speed: EFFECT_RANGES.shaderSpeed.fallback,
  };
};

const toView = (spec: FieldSpec, value: number | undefined): FieldView => ({
  spec,
  value: value ?? spec.fallback,
});

const toFieldViews = (item: EffectItem): FieldView[] => {
  if (item.kind === "drop-shadow" || item.kind === "inner-shadow") {
    return [
      toView(OFFSET_X, item.offsetX),
      toView(OFFSET_Y, item.offsetY),
      toView(SHADOW_BLUR, item.blur),
      toView(SPREAD, item.spread),
    ];
  }

  if (item.kind === "layer-blur") {
    return [toView(LAYER_RADIUS, item.radius)];
  }

  if (item.kind === "background-blur") {
    return [
      toView(BACKDROP_RADIUS, item.radius),
      toView(SATURATION, item.saturation),
    ];
  }

  if (item.kind === "noise") {
    return [
      toView(NOISE_OPACITY, item.opacity),
      toView(NOISE_GRAIN, item.frequency),
    ];
  }

  if (item.kind === "glass") {
    return [
      toView(GLASS_BLUR, item.blur),
      toView(GLASS_TINT, item.tintOpacity),
      toView(GLASS_EDGE, item.edge),
    ];
  }

  return [
    toView(SHADER_STRENGTH, item.intensity),
    toView(SHADER_SPEED, item.speed),
  ];
};

const toClamped = (spec: FieldSpec, value: number): number =>
  Math.min(spec.maximum, Math.max(spec.minimum, value));

const toWithField = (
  item: EffectItem,
  spec: FieldSpec,
  value: number
): EffectItem => ({ ...item, [spec.key]: toClamped(spec, value) });

const toToggled = (item: EffectItem): EffectItem => ({
  ...item,
  isEnabled: !(item.isEnabled ?? true),
});

const toReplaced = (
  list: readonly EffectItem[],
  index: number,
  item: EffectItem
): EffectItem[] =>
  list.map((entry, at) => {
    if (at === index) {
      return item;
    }

    return entry;
  });

const toRemoved = (list: readonly EffectItem[], index: number): EffectItem[] =>
  list.filter((_entry, at) => at !== index);

const toMoved = (
  list: readonly EffectItem[],
  index: number,
  step: number
): EffectItem[] => {
  const moved = [...list];
  const picked = moved[index];
  const swapped = moved[index + step];

  if (!picked || !swapped) {
    return moved;
  }

  moved[index] = swapped;
  moved[index + step] = picked;

  return moved;
};

const toRowKeys = (list: readonly EffectItem[]): string[] => {
  const seen = new Map<string, number>();

  return list.map((item) => {
    const base = JSON.stringify(item);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);

    return `${base}#${count}`;
  });
};

const toKindList = (): readonly EffectKind[] => EFFECT_KINDS;

export {
  toFieldViews,
  toKindList,
  toMoved,
  toNewEffect,
  toRemoved,
  toReplaced,
  toRowKeys,
  toToggled,
  toWithField,
};

export type { FieldKey, FieldSpec, FieldView };
