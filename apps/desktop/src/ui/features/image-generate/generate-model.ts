type Aspect = "hero" | "square" | "tall" | "wide";

type Style = "abstract" | "icon" | "illustration" | "photo";

interface Variant {
  readonly alt: string;
  readonly asset: string;
  readonly preview: string;
  readonly seed: number;
}

const ASPECTS: readonly Aspect[] = ["square", "wide", "tall", "hero"];

const STYLES: readonly Style[] = ["photo", "illustration", "icon", "abstract"];

const SEEDS: readonly number[] = [0, 1];

export { ASPECTS, SEEDS, STYLES };

export type { Aspect, Style, Variant };
