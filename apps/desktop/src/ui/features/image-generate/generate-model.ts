type Aspect = "hero" | "square" | "tall" | "wide";

type EditMode = "prompt" | "remove-background" | "upscale";

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

const SEEDS: readonly number[] = [0, 1];

export { ASPECTS, EDIT_MODES, SEEDS, STYLES };

export type { Aspect, EditMode, Style, Variant };
