type Aspect = "hero" | "square" | "tall" | "wide";

type EditMode = "expand" | "prompt" | "remove-background" | "upscale";

type ExpandAspect = "1:1" | "3:2" | "4:3" | "9:16" | "16:9" | "fill";

type Style = "abstract" | "icon" | "illustration" | "photo";

interface Variant {
  readonly alt: string;
  readonly asset: string;
  readonly preview: string;
  readonly seed: number;
}

const ASPECTS: readonly Aspect[] = ["square", "wide", "tall", "hero"];

const STYLES: readonly Style[] = ["photo", "illustration", "icon", "abstract"];

const EDIT_MODES: readonly EditMode[] = [
  "remove-background",
  "upscale",
  "prompt",
];

const EXPAND_ASPECTS: readonly ExpandAspect[] = [
  "1:1",
  "4:3",
  "16:9",
  "9:16",
  "3:2",
  "fill",
];

const SEEDS: readonly number[] = [0, 1];

export { ASPECTS, EDIT_MODES, EXPAND_ASPECTS, SEEDS, STYLES };

export type { Aspect, EditMode, ExpandAspect, Style, Variant };
