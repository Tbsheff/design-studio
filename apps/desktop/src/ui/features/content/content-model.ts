type ContentMode = "empty" | "long" | "pseudo" | "sample" | "short";

type ContentPreset =
  | "commerce"
  | "finance"
  | "generic"
  | "healthcare"
  | "social";

type StressMode = Exclude<ContentMode, "sample">;

const PRESETS: readonly ContentPreset[] = [
  "generic",
  "healthcare",
  "finance",
  "commerce",
  "social",
];

const STRESS_MODES: readonly StressMode[] = [
  "long",
  "short",
  "empty",
  "pseudo",
];

const MIN_REPEAT = 1;

const MAX_REPEAT = 50;

const clampRepeat = (value: number): number =>
  Math.min(MAX_REPEAT, Math.max(MIN_REPEAT, Math.round(value)));

const toggleStress = (
  current: ContentMode,
  picked: StressMode
): ContentMode => {
  if (current === picked) {
    return "sample";
  }

  return picked;
};

export {
  MAX_REPEAT,
  MIN_REPEAT,
  PRESETS,
  STRESS_MODES,
  clampRepeat,
  toggleStress,
};

export type { ContentMode, ContentPreset, StressMode };
