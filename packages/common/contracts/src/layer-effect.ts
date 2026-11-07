const EFFECT_KINDS = [
  "drop-shadow",
  "inner-shadow",
  "layer-blur",
  "background-blur",
  "noise",
  "glass",
  "shader",
] as const;

const SHADER_PRESETS = ["mesh", "grain", "aurora", "dither"] as const;

const EFFECT_STACK_MAX = 12;

const EFFECT_NAME_MAX = 40;

const EFFECT_NAME_PATTERN =
  /^(?!fx-)(?![0-9a-f]{8}$)[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;

const EFFECT_COLOR_MAX = 80;

const EFFECT_COLOR_PATTERN =
  /^(?:#[0-9a-fA-F]{3,8}|(?:rgb|rgba|hsl|hsla|oklch|oklab|hwb)\([0-9a-zA-Z\s.,%/+-]{1,70}\)|var\(--[a-zA-Z0-9_-]{1,60}\)|[a-zA-Z]{3,30})$/u;

const SHADER_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/u;

const SHADER_COLORS_MIN = 2;

const SHADER_COLORS_MAX = 5;

const EFFECT_CLASS_PREFIX = "fx-";

const EFFECT_SHADER_DEFAULT_COLORS = ["#6d5dfc", "#22d3ee", "#f472b6"] as const;

interface EffectRange {
  readonly fallback: number;
  readonly maximum: number;
  readonly minimum: number;
}

const EFFECT_RANGES = {
  backdropBlur: { fallback: 12, maximum: 100, minimum: 0 },
  glassBlur: { fallback: 16, maximum: 100, minimum: 0 },
  glassEdge: { fallback: 0.35, maximum: 1, minimum: 0 },
  glassSaturation: { fallback: 160, maximum: 300, minimum: 0 },
  glassTint: { fallback: 0.55, maximum: 1, minimum: 0 },
  layerBlur: { fallback: 8, maximum: 100, minimum: 0 },
  noiseFrequency: { fallback: 0.8, maximum: 3, minimum: 0.05 },
  noiseOpacity: { fallback: 0.12, maximum: 1, minimum: 0 },
  saturation: { fallback: 100, maximum: 300, minimum: 0 },
  shaderIntensity: { fallback: 0.8, maximum: 1, minimum: 0 },
  shaderSeed: { fallback: 1, maximum: 9999, minimum: 0 },
  shaderSpeed: { fallback: 1, maximum: 4, minimum: 0 },
  shadowBlur: { fallback: 16, maximum: 200, minimum: 0 },
  shadowOffsetX: { fallback: 0, maximum: 200, minimum: -200 },
  shadowOffsetY: { fallback: 8, maximum: 200, minimum: -200 },
  shadowSpread: { fallback: 0, maximum: 100, minimum: -100 },
} as const satisfies Readonly<Record<string, EffectRange>>;

type EffectKind = (typeof EFFECT_KINDS)[number];

type ShaderPreset = (typeof SHADER_PRESETS)[number];

export {
  EFFECT_CLASS_PREFIX,
  EFFECT_COLOR_MAX,
  EFFECT_COLOR_PATTERN,
  EFFECT_KINDS,
  EFFECT_NAME_MAX,
  EFFECT_NAME_PATTERN,
  EFFECT_RANGES,
  EFFECT_SHADER_DEFAULT_COLORS,
  EFFECT_STACK_MAX,
  SHADER_COLORS_MAX,
  SHADER_COLORS_MIN,
  SHADER_COLOR_PATTERN,
  SHADER_PRESETS,
};

export type { EffectKind, EffectRange, ShaderPreset };
