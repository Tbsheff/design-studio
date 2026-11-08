import type { AttentionRgb } from "./types.js";

const CHANNEL_MAX = 255;

const LINEAR_CUTOFF = 0.03928;

const LINEAR_DIVISOR = 12.92;

const GAMMA_OFFSET = 0.055;

const GAMMA_DIVISOR = 1.055;

const GAMMA_POWER = 2.4;

const RED_WEIGHT = 0.2126;

const GREEN_WEIGHT = 0.7152;

const BLUE_WEIGHT = 0.0722;

const FLARE = 0.05;

const toLinear = (value: number): number => {
  const unit = value / CHANNEL_MAX;

  if (unit <= LINEAR_CUTOFF) {
    return unit / LINEAR_DIVISOR;
  }

  return ((unit + GAMMA_OFFSET) / GAMMA_DIVISOR) ** GAMMA_POWER;
};

const toRelativeLuminance = (color: AttentionRgb): number =>
  RED_WEIGHT * toLinear(color.red) +
  GREEN_WEIGHT * toLinear(color.green) +
  BLUE_WEIGHT * toLinear(color.blue);

const toContrastRatio = (first: AttentionRgb, second: AttentionRgb): number => {
  const one = toRelativeLuminance(first);
  const two = toRelativeLuminance(second);

  return (Math.max(one, two) + FLARE) / (Math.min(one, two) + FLARE);
};

export { toContrastRatio };
