import { converter, parse } from "culori";

interface Rgba {
  readonly alpha: number;
  readonly blue: number;
  readonly green: number;
  readonly red: number;
}

const toRgb = converter("rgb");

const toClamped = (value: number): number => Math.min(1, Math.max(0, value));

const toRgba = (text: string): Rgba | null => {
  const color = parse(text.trim());

  if (!color) {
    return null;
  }

  const rgb = toRgb(color);
  const channels = [rgb.r, rgb.g, rgb.b];

  if (!channels.every((channel) => Number.isFinite(channel))) {
    return null;
  }

  return {
    alpha: toClamped(rgb.alpha ?? 1),
    blue: toClamped(rgb.b),
    green: toClamped(rgb.g),
    red: toClamped(rgb.r),
  };
};

export { toRgba };

export type { Rgba };
