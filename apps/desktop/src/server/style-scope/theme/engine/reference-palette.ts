import {
  toBestText,
  toContrast,
  toHex,
  toOklchParts,
  toReadable,
} from "./color.js";
import type { OklchParts } from "./color.js";
import { MIN_RATIO, toDarkPalette, toLightPalette } from "./palette.js";
import type { PaletteSpec } from "./palette.js";
import type { PaletteSwatch } from "./to-palette.js";
import type { ThemePalette } from "./types.js";

interface ReferenceColors {
  readonly bg: string | null;
  readonly fg: string | null;
  readonly primary: string | null;
  readonly swatches: readonly PaletteSwatch[];
}

interface ReferencePalettes {
  readonly dark: ThemePalette;
  readonly light: ThemePalette;
}

interface Direction {
  readonly borderDelta: number;
  readonly fgStart: number;
  readonly mutedStart: number;
  readonly step: number;
  readonly surfaceDelta: number;
}

const DARK_SOURCE: Direction = {
  borderDelta: 0.13,
  fgStart: 0.96,
  mutedStart: 0.7,
  step: 0.01,
  surfaceDelta: 0.04,
};

const LIGHT_SOURCE: Direction = {
  borderDelta: -0.1,
  fgStart: 0.2,
  mutedStart: 0.56,
  step: -0.01,
  surfaceDelta: -0.03,
};

const DARK_LIMIT = 0.5;

const CHROMATIC_MIN = 0.04;

const CHROMA_LOW = 0.06;

const CHROMA_HIGH = 0.2;

const CHROMA_DEFAULT = 0.1;

const NEUTRAL_LOW = 0.004;

const NEUTRAL_HIGH = 0.03;

const HUE_DEFAULT = 250;

const ACCENT_GAP = 25;

const ACCENT_TURN = 30;

const FULL_TURN = 360;

const MUTED_CHROMA = 1.5;

const LIGHT_TEXT = 0.99;

const DARK_TEXT = 0.16;

const LIGHTNESS_LOW = 0.02;

const LIGHTNESS_HIGH = 0.99;

const WHITE = "#ffffff";

const toClamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));

const toParts = (hex: string): OklchParts =>
  toOklchParts(hex) ?? { chroma: 0, hue: null, lightness: 1 };

const toHueGap = (first: number, second: number): number => {
  const gap = Math.abs(first - second) % FULL_TURN;

  return Math.min(gap, FULL_TURN - gap);
};

const toShifted = (hex: string, delta: number): string => {
  const parts = toParts(hex);

  return toHex(
    toClamp(parts.lightness + delta, LIGHTNESS_LOW, LIGHTNESS_HIGH),
    parts.chroma,
    parts.hue ?? 0
  );
};

const toMinContrast = (color: string, against: readonly string[]): number =>
  Math.min(...against.map((other) => toContrast(color, other)));

const toChromatic = (
  swatches: readonly PaletteSwatch[]
): readonly PaletteSwatch[] =>
  swatches
    .filter((swatch) => toParts(swatch.hex).chroma >= CHROMATIC_MIN)
    .toSorted(
      (left, right) =>
        toParts(right.hex).chroma * Math.sqrt(right.share) -
        toParts(left.hex).chroma * Math.sqrt(left.share)
    );

const toSpec = (colors: ReferenceColors, bg: string): PaletteSpec => {
  const chromatic = toChromatic(colors.swatches);
  const primary = colors.primary ?? chromatic[0]?.hex ?? null;
  const primaryParts = toOklchParts(primary ?? bg);
  const bgParts = toParts(bg);
  const hueBase = primaryParts?.hue ?? bgParts.hue ?? HUE_DEFAULT;

  const accent = chromatic.find((swatch) => {
    const swatchHue = toParts(swatch.hex).hue;

    return swatchHue !== null && toHueGap(swatchHue, hueBase) >= ACCENT_GAP;
  });

  return {
    accentHue: toParts(accent?.hex ?? WHITE).hue ?? hueBase + ACCENT_TURN,
    chroma: toClamp(
      primaryParts?.chroma ?? CHROMA_DEFAULT,
      CHROMA_LOW,
      CHROMA_HIGH
    ),
    hue: hueBase,
    neutral: toClamp(bgParts.chroma, NEUTRAL_LOW, NEUTRAL_HIGH),
  };
};

const toAccentHex = (
  colors: ReferenceColors,
  primaryHue: number
): string | null =>
  toChromatic(colors.swatches).find((swatch) => {
    const swatchHue = toParts(swatch.hex).hue;

    return swatchHue !== null && toHueGap(swatchHue, primaryHue) >= ACCENT_GAP;
  })?.hex ?? null;

const toAccentPair = (
  picked: string | null,
  generated: ThemePalette,
  neutral: number,
  hueOf: number
): Pick<ThemePalette, "accent" | "accentFg"> => {
  if (picked === null) {
    return { accent: generated.accent, accentFg: generated.accentFg };
  }

  const text = toBestText(
    picked,
    toHex(LIGHT_TEXT, neutral / 2, hueOf),
    toHex(DARK_TEXT, neutral, hueOf)
  );

  if (toContrast(text, picked) < MIN_RATIO) {
    return { accent: generated.accent, accentFg: generated.accentFg };
  }

  return { accent: picked, accentFg: text };
};

const toBestSwatch = (
  swatches: readonly PaletteSwatch[],
  bg: string
): string | null => {
  const ranked = swatches
    .map((swatch) => ({ hex: swatch.hex, ratio: toContrast(swatch.hex, bg) }))
    .toSorted((left, right) => right.ratio - left.ratio);

  return ranked[0]?.hex ?? null;
};

const toReadableOr = (
  candidate: string | null,
  against: readonly string[],
  fallback: Parameters<typeof toReadable>[0]
): string => {
  if (candidate !== null && toMinContrast(candidate, against) >= MIN_RATIO) {
    return candidate;
  }

  return toReadable(fallback);
};

const toTone = (bg: string): Direction => {
  if (toParts(bg).lightness < DARK_LIMIT) {
    return DARK_SOURCE;
  }

  return LIGHT_SOURCE;
};

const toNativePalette = (
  colors: ReferenceColors,
  spec: PaletteSpec,
  base: string,
  generated: ThemePalette
): ThemePalette => {
  const tone = toTone(base);
  const panel = toShifted(base, tone.surfaceDelta);
  const surfaces = [base, panel];
  const hueOf = spec.hue;

  const text = toReadableOr(
    colors.fg ?? toBestSwatch(colors.swatches, base),
    surfaces,
    {
      against: surfaces,
      chroma: spec.neutral,
      hue: hueOf,
      minimum: MIN_RATIO,
      start: tone.fgStart,
      step: tone.step,
    }
  );

  const muted = toReadable({
    against: surfaces,
    chroma: spec.neutral * MUTED_CHROMA,
    hue: hueOf,
    minimum: MIN_RATIO,
    start: tone.mutedStart,
    step: tone.step,
  });

  const wanted =
    colors.primary ?? toChromatic(colors.swatches)[0]?.hex ?? generated.primary;

  const wantedParts = toParts(wanted);

  const brand = toReadableOr(wanted, surfaces, {
    against: surfaces,
    chroma: wantedParts.chroma,
    hue: wantedParts.hue ?? hueOf,
    minimum: MIN_RATIO,
    start: wantedParts.lightness,
    step: tone.step,
  });

  const onBrand = toBestText(
    brand,
    toHex(LIGHT_TEXT, spec.neutral / 2, hueOf),
    toHex(DARK_TEXT, spec.neutral, hueOf)
  );

  const pair = toAccentPair(
    toAccentHex(colors, toParts(brand).hue ?? hueOf),
    generated,
    spec.neutral,
    hueOf
  );

  return {
    accent: pair.accent,
    accentFg: pair.accentFg,
    bg: base,
    border: toShifted(base, tone.borderDelta),
    fg: text,
    fgMuted: muted,
    primary: brand,
    primaryFg: onBrand,
    ring: brand,
    surface: panel,
  };
};

const toReferencePalettes = (colors: ReferenceColors): ReferencePalettes => {
  const bg = colors.bg ?? colors.swatches[0]?.hex ?? WHITE;
  const spec = toSpec(colors, bg);
  const light = toLightPalette(spec);
  const dark = toDarkPalette(spec);

  if (toParts(bg).lightness < DARK_LIMIT) {
    return { dark: toNativePalette(colors, spec, bg, dark), light };
  }

  return { dark, light: toNativePalette(colors, spec, bg, light) };
};

const toGeneratedPalettes = (colors: ReferenceColors): ReferencePalettes => {
  const bg = colors.bg ?? colors.swatches[0]?.hex ?? WHITE;
  const spec = toSpec(colors, bg);

  return { dark: toDarkPalette(spec), light: toLightPalette(spec) };
};

export { toGeneratedPalettes, toReferencePalettes };

export type { ReferenceColors, ReferencePalettes };
