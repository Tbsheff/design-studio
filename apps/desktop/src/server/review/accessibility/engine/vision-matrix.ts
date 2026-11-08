import { converter, differenceCiede2000 } from "culori";

type VisionKind =
  | "achromatopsia"
  | "blurred-vision"
  | "deuteranopia"
  | "protanopia"
  | "reduced-contrast"
  | "tritanopia";

type DichromacyKind = "deuteranopia" | "protanopia" | "tritanopia";

type Rgb = readonly [number, number, number];

interface Row {
  readonly blue: number;
  readonly green: number;
  readonly red: number;
}

interface Matrix {
  readonly blue: Row;
  readonly green: Row;
  readonly red: Row;
}

interface SeenPair {
  readonly background: Rgb;
  readonly foreground: Rgb;
}

const BLUR_KIND = "blurred-vision";

const PROTANOPIA: Matrix = {
  blue: { blue: 1.051998, green: -0.048116, red: -0.003882 },
  green: { blue: 0.099216, green: 0.786281, red: 0.114503 },
  red: { blue: -0.204868, green: 1.052583, red: 0.152286 },
};

const DEUTERANOPIA: Matrix = {
  blue: { blue: 0.968881, green: 0.04294, red: -0.01182 },
  green: { blue: 0.047413, green: 0.672501, red: 0.280085 },
  red: { blue: -0.227968, green: 0.860646, red: 0.367322 },
};

const TRITANOPIA: Matrix = {
  blue: { blue: 0.3039, green: 0.691367, red: 0.004733 },
  green: { blue: 0.147602, green: 0.930809, red: -0.078411 },
  red: { blue: -0.178779, green: -0.076749, red: 1.255528 },
};

const LUMINANCE: Row = { blue: 0.0722, green: 0.7152, red: 0.2126 };

const ACHROMATOPSIA: Matrix = {
  blue: LUMINANCE,
  green: LUMINANCE,
  red: LUMINANCE,
};

const DICHROMACY_MATRICES: Readonly<Record<DichromacyKind, Matrix>> = {
  deuteranopia: DEUTERANOPIA,
  protanopia: PROTANOPIA,
  tritanopia: TRITANOPIA,
};

const VISION_KINDS: readonly VisionKind[] = [
  "protanopia",
  "deuteranopia",
  "tritanopia",
  "achromatopsia",
  BLUR_KIND,
  "reduced-contrast",
];

const BLUR_RADIUS_PX = 3;

const BLUR_MIX_TEXT = 0.4;

const BLUR_MIX_LARGE = 0.15;

const CONTRAST_SCALE = 0.5;

const MIDDLE = 0.5;

const DELTA_E_CONFUSED = 10;

const GAMMA_BREAK = 0.04045;

const GAMMA_LINEAR_SLOPE = 12.92;

const GAMMA_OFFSET = 0.055;

const GAMMA_SCALE = 1.055;

const GAMMA_EXPONENT = 2.4;

const LUMINANCE_BREAK = 0.0031308;

const FLARE = 0.05;

const HEX_RADIX = 16;

const CHANNEL_MAX = 255;

const SHORT_HEX = 3;

const LONG_HEX = 6;

const DIGIT_WIDTH = 2;

const GREEN_AT = 2;

const BLUE_AT = 4;

const HEX_PATTERN = /^#(?<digits>[\da-f]{3}|[\da-f]{6})$/iu;

const ROUND_HUNDRED = 100;

const ROUND_TENTH = 10;

const toClamped = (value: number): number => Math.min(1, Math.max(0, value));

const toLinear = (channel: number): number => {
  if (channel <= GAMMA_BREAK) {
    return channel / GAMMA_LINEAR_SLOPE;
  }

  return ((channel + GAMMA_OFFSET) / GAMMA_SCALE) ** GAMMA_EXPONENT;
};

const fromLinear = (channel: number): number => {
  if (channel <= LUMINANCE_BREAK) {
    return channel * GAMMA_LINEAR_SLOPE;
  }

  return GAMMA_SCALE * channel ** (1 / GAMMA_EXPONENT) - GAMMA_OFFSET;
};

const toDigits = (digits: string): string => {
  if (digits.length === SHORT_HEX) {
    return [...digits].map((digit) => `${digit}${digit}`).join("");
  }

  return digits;
};

const toChannel = (full: string, at: number): number =>
  Number.parseInt(full.slice(at, at + DIGIT_WIDTH), HEX_RADIX) / CHANNEL_MAX;

const fromHex = (hex: string): Rgb | null => {
  const digits = HEX_PATTERN.exec(hex)?.groups?.["digits"] ?? null;

  if (digits === null || ![SHORT_HEX, LONG_HEX].includes(digits.length)) {
    return null;
  }

  const full = toDigits(digits);

  return [
    toChannel(full, 0),
    toChannel(full, GREEN_AT),
    toChannel(full, BLUE_AT),
  ];
};

const toPart = (channel: number): string =>
  Math.round(toClamped(channel) * CHANNEL_MAX)
    .toString(HEX_RADIX)
    .padStart(DIGIT_WIDTH, "0");

const toHex = (rgb: Rgb): string =>
  `#${toPart(rgb[0])}${toPart(rgb[1])}${toPart(rgb[2])}`;

const toRowValue = (row: Row, linear: Rgb): number =>
  fromLinear(
    toClamped(
      row.red * linear[0] + row.green * linear[1] + row.blue * linear[2]
    )
  );

const applyMatrix = (matrix: Matrix, rgb: Rgb): Rgb => {
  const linear: Rgb = [toLinear(rgb[0]), toLinear(rgb[1]), toLinear(rgb[2])];

  return [
    toRowValue(matrix.red, linear),
    toRowValue(matrix.green, linear),
    toRowValue(matrix.blue, linear),
  ];
};

const toCompressedChannel = (value: number): number =>
  MIDDLE + (value - MIDDLE) * CONTRAST_SCALE;

const toCompressed = (rgb: Rgb): Rgb => [
  toCompressedChannel(rgb[0]),
  toCompressedChannel(rgb[1]),
  toCompressedChannel(rgb[2]),
];

const toSeenColor = (kind: VisionKind, rgb: Rgb): Rgb => {
  if (kind === "achromatopsia") {
    return applyMatrix(ACHROMATOPSIA, rgb);
  }

  if (kind === BLUR_KIND) {
    return rgb;
  }

  if (kind === "reduced-contrast") {
    return toCompressed(rgb);
  }

  return applyMatrix(DICHROMACY_MATRICES[kind], rgb);
};

const toMixedChannel = (from: number, toward: number, amount: number): number =>
  from + (toward - from) * amount;

const toMixed = (from: Rgb, toward: Rgb, amount: number): Rgb => [
  toMixedChannel(from[0], toward[0], amount),
  toMixedChannel(from[1], toward[1], amount),
  toMixedChannel(from[2], toward[2], amount),
];

const toSeenPair = (
  kind: VisionKind,
  pair: SeenPair,
  isLarge: boolean
): SeenPair => {
  if (kind !== BLUR_KIND) {
    return {
      background: toSeenColor(kind, pair.background),
      foreground: toSeenColor(kind, pair.foreground),
    };
  }

  let amount = BLUR_MIX_TEXT;

  if (isLarge) {
    amount = BLUR_MIX_LARGE;
  }

  return {
    background: pair.background,
    foreground: toMixed(pair.foreground, pair.background, amount),
  };
};

const toLuminance = (rgb: Rgb): number =>
  LUMINANCE.red * toLinear(rgb[0]) +
  LUMINANCE.green * toLinear(rgb[1]) +
  LUMINANCE.blue * toLinear(rgb[2]);

const toContrastRatio = (first: Rgb, second: Rgb): number => {
  const light = Math.max(toLuminance(first), toLuminance(second));
  const dark = Math.min(toLuminance(first), toLuminance(second));

  return (
    Math.round(((light + FLARE) / (dark + FLARE)) * ROUND_HUNDRED) /
    ROUND_HUNDRED
  );
};

const measureDifference = differenceCiede2000();

const toDeltaE = (first: Rgb, second: Rgb): number =>
  Math.round(measureDifference(toHex(first), toHex(second)) * ROUND_TENTH) /
  ROUND_TENTH;

const toLab = converter("lab");

const toChroma = (rgb: Rgb): number => {
  const lab = toLab(toHex(rgb));

  if (!lab) {
    return 0;
  }

  return Math.hypot(lab.a, lab.b);
};

const hasBlurFilter = (kind: VisionKind): boolean => kind === BLUR_KIND;

const toFilterMatrix = (kind: VisionKind): Matrix | null => {
  if (kind === "achromatopsia") {
    return ACHROMATOPSIA;
  }

  if (
    kind === "protanopia" ||
    kind === "deuteranopia" ||
    kind === "tritanopia"
  ) {
    return DICHROMACY_MATRICES[kind];
  }

  return null;
};

export {
  BLUR_RADIUS_PX,
  CONTRAST_SCALE,
  DELTA_E_CONFUSED,
  VISION_KINDS,
  fromHex,
  hasBlurFilter,
  toChroma,
  toContrastRatio,
  toDeltaE,
  toFilterMatrix,
  toHex,
  toSeenColor,
  toSeenPair,
};

export type { Matrix, Rgb, Row, SeenPair, VisionKind };
