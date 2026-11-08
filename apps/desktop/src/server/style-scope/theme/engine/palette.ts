import { toBestText, toHex, toReadable } from "./color.js";
import type { ThemePalette } from "./types.js";

interface PaletteSpec {
  readonly accentHue: number;
  readonly chroma: number;
  readonly hue: number;
  readonly neutral: number;
}

interface Tone {
  readonly accent: number;
  readonly accentChroma: number;
  readonly accentFgStart: number;
  readonly bg: number;
  readonly bgChroma: number;
  readonly border: number;
  readonly fg: number;
  readonly fgChroma: number;
  readonly fgMutedStart: number;
  readonly primaryStart: number;
  readonly step: number;
  readonly surface: number;
}

const MIN_RATIO = 4.6;

const STEP = 0.01;

const ON_LIGHT = 0.99;

const ON_DARK = 0.16;

const HALF = 0.5;

const ACCENT_FG_CHROMA = 0.6;

const MUTED_CHROMA = 1.5;

const LIGHT: Tone = {
  accent: 0.95,
  accentChroma: 0.3,
  accentFgStart: 0.45,
  bg: 0.99,
  bgChroma: HALF,
  border: 0.9,
  fg: 0.2,
  fgChroma: 1,
  fgMutedStart: 0.56,
  primaryStart: 0.56,
  step: -STEP,
  surface: 0.965,
};

const DARK: Tone = {
  accent: 0.27,
  accentChroma: 0.35,
  accentFgStart: 0.8,
  bg: 0.17,
  bgChroma: 1,
  border: 0.3,
  fg: 0.96,
  fgChroma: HALF,
  fgMutedStart: 0.7,
  primaryStart: 0.7,
  step: STEP,
  surface: 0.21,
};

const toPalette = (spec: PaletteSpec, tone: Tone): ThemePalette => {
  const { accentHue, chroma, neutral } = spec;
  const { hue } = spec;
  const bg = toHex(tone.bg, neutral * tone.bgChroma, hue);
  const surface = toHex(tone.surface, neutral, hue);
  const accent = toHex(tone.accent, chroma * tone.accentChroma, accentHue);
  const surfaces = [bg, surface];

  const primary = toReadable({
    against: surfaces,
    chroma: spec.chroma,
    hue: spec.hue,
    minimum: MIN_RATIO,
    start: tone.primaryStart,
    step: tone.step,
  });

  const accentFg = toReadable({
    against: [accent],
    chroma: chroma * ACCENT_FG_CHROMA,
    hue: accentHue,
    minimum: MIN_RATIO,
    start: tone.accentFgStart,
    step: tone.step,
  });

  const fgMuted = toReadable({
    against: surfaces,
    chroma: neutral * MUTED_CHROMA,
    hue: spec.hue,
    minimum: MIN_RATIO,
    start: tone.fgMutedStart,
    step: tone.step,
  });

  const border = toHex(tone.border, neutral, hue);
  const fg = toHex(tone.fg, neutral * tone.fgChroma, hue);

  const primaryFg = toBestText(
    primary,
    toHex(ON_LIGHT, neutral * HALF, hue),
    toHex(ON_DARK, neutral, hue)
  );

  const ring = primary;

  return {
    accent,
    accentFg,
    bg,
    border,
    fg,
    fgMuted,
    primary,
    primaryFg,
    ring,
    surface,
  };
};

const toLightPalette = (spec: PaletteSpec): ThemePalette =>
  toPalette(spec, LIGHT);

const toDarkPalette = (spec: PaletteSpec): ThemePalette =>
  toPalette(spec, DARK);

export { MIN_RATIO, toDarkPalette, toLightPalette };

export type { PaletteSpec };
