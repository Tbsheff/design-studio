const ROUND_FACTOR = 100;

const toRounded = (value: number): number =>
  Math.round(value * ROUND_FACTOR) / ROUND_FACTOR;

const toPx = (value: number): string => `${toRounded(value)}px`;

const BYTE_MAX = 255;

const HEX_RADIX = 16;

const HEX_BYTE_WIDTH = 2;

const toAlphaHex = (alpha: number): string =>
  Math.round(Math.min(1, Math.max(0, alpha)) * BYTE_MAX)
    .toString(HEX_RADIX)
    .padStart(HEX_BYTE_WIDTH, "0");

const LCG_MULTIPLIER = 1_664_525;

const LCG_INCREMENT = 1_013_904_223;

const LCG_MODULUS = 4_294_967_296;

const toSeededRandom = (seed: number): (() => number) => {
  let state = seed % LCG_MODULUS;

  return (): number => {
    state = (state * LCG_MULTIPLIER + LCG_INCREMENT) % LCG_MODULUS;

    return state / LCG_MODULUS;
  };
};

export { HEX_RADIX, toAlphaHex, toPx, toRounded, toSeededRandom };
