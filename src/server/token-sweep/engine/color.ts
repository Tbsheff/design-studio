import type { Rgb } from "./types.js";

interface Parsed {
  readonly alpha: number;
  readonly rgb: Rgb;
}

const BYTE = 255;
const HEX_BASE = 16;
const PERCENT = 100;
const HUE_FULL = 360;
const HALF_TURN = 180;

const HEX_LENGTH = { long: 6, longAlpha: 8, short: 3, shortAlpha: 4 } as const;

const SHORT_LENGTHS = new Set<number>([
  HEX_LENGTH.short,
  HEX_LENGTH.shortAlpha,
]);

const ALPHA_LENGTHS = new Set<number>([
  HEX_LENGTH.shortAlpha,
  HEX_LENGTH.longAlpha,
]);

const FULL_LENGTHS = new Set<number>(Object.values(HEX_LENGTH));
const ALPHA_INDEX = HEX_LENGTH.short;
const HSL_STEP = 30;
const HSL_CYCLE = 12;
const HSL_OFFSETS = { blue: 4, green: 8, red: 0 } as const;
const HSL_PEAKS = { high: 9, low: 3 } as const;

const GAMMA = {
  cutoff: 0.0031308,
  decodeCutoff: 0.04045,
  exponent: 2.4,
  linear: 12.92,
  offset: 0.055,
  scale: 1.055,
} as const;

const LAB = {
  curveCutoff: 0.008856,
  curveLinear: 7.787,
  curveOffset: 0.13793103448275862,
  lightness: 116,
  lightnessOffset: 16,
  redGreen: 500,
  yellowBlue: 200,
} as const;

const D65 = { white: 0.95047, zed: 1.08883 } as const;

const XYZ = {
  xBlue: 0.1804375,
  xGreen: 0.3575761,
  xRed: 0.4124564,
  yBlue: 0.072175,
  yGreen: 0.7151522,
  yRed: 0.2126729,
  zBlue: 0.9503041,
  zGreen: 0.119192,
  zRed: 0.0193339,
} as const;

const OKLAB = {
  longA: 0.3963377774,
  longB: 0.2158037573,
  mediumA: 0.1055613458,
  mediumB: 0.0638541728,
  shortA: 0.0894841775,
  shortB: 1.291485548,
} as const;

const toWeights = (text: string): number[] => text.split(" ").map(Number);

const OKLAB_RGB = {
  blue: toWeights("-0.0041960863 -0.7034186147 1.707614701"),
  green: toWeights("-1.2684380046 2.6097574011 -0.3413193965"),
  red: toWeights("4.0767416621 -3.3077115913 0.2309699292"),
} as const;

const CUBE = 3;

const HEX_PATTERN = /^#(?<digits>[\da-f]{3,8})$/iu;
const FUNCTION_PATTERN = /^(?<name>rgba?|hsla?|oklch)\((?<body>[^)]*)\)$/iu;

const NAMED = new Map<string, Rgb>([
  ["black", { blue: 0, green: 0, red: 0 }],
  ["white", { blue: BYTE, green: BYTE, red: BYTE }],
]);

const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));

const hexStep = (length: number): number => {
  if (SHORT_LENGTHS.has(length)) {
    return 1;
  }

  return 2;
};

const hexChannel = (digits: string, index: number): number => {
  const step = hexStep(digits.length);
  const part = digits.slice(index * step, index * step + step);

  if (step === 1) {
    return Number.parseInt(`${part}${part}`, HEX_BASE);
  }

  return Number.parseInt(part, HEX_BASE);
};

const parseHex = (digits: string): Parsed | null => {
  if (!FULL_LENGTHS.has(digits.length)) {
    return null;
  }

  let alpha = 1;

  if (ALPHA_LENGTHS.has(digits.length)) {
    alpha = hexChannel(digits, ALPHA_INDEX) / BYTE;
  }

  return {
    alpha,
    rgb: {
      blue: hexChannel(digits, 2),
      green: hexChannel(digits, 1),
      red: hexChannel(digits, 0),
    },
  };
};

const splitArguments = (body: string): string[] => {
  const [main = "", alpha = ""] = body.split("/");

  const parts = main
    .split(/[\s,]+/u)
    .map((part) => part.trim())
    .filter((part) => part !== "");

  if (alpha.trim() !== "") {
    parts.push(alpha.trim());
  }

  return parts;
};

const numberOf = (text: string, scale: number): number => {
  if (text.endsWith("%")) {
    return (Number(text.slice(0, -1)) / PERCENT) * scale;
  }

  return Number(text.replace("deg", ""));
};

const alphaOf = (text: string): number => {
  if (text === "") {
    return 1;
  }

  return clamp(numberOf(text, 1), 0, 1);
};

const parseRgbFunction = (parts: readonly string[]): Parsed | null => {
  const [red = "", green = "", blue = "", alpha = ""] = parts;

  if (blue === "") {
    return null;
  }

  return {
    alpha: alphaOf(alpha),
    rgb: {
      blue: clamp(numberOf(blue, BYTE), 0, BYTE),
      green: clamp(numberOf(green, BYTE), 0, BYTE),
      red: clamp(numberOf(red, BYTE), 0, BYTE),
    },
  };
};

const hslChannel = (
  hue: number,
  saturation: number,
  lightness: number,
  offset: number
): number => {
  const place = (offset + hue / HSL_STEP) % HSL_CYCLE;
  const spread = saturation * Math.min(lightness, 1 - lightness);

  const bend = Math.max(
    -1,
    Math.min(place - HSL_PEAKS.low, HSL_PEAKS.high - place, 1)
  );

  return lightness - spread * bend;
};

const unitScale = (text: string): number => {
  if (text.endsWith("%")) {
    return 1;
  }

  return PERCENT;
};

const unitOf = (text: string): number => numberOf(text, 1) / unitScale(text);

const parseHslFunction = (parts: readonly string[]): Parsed | null => {
  const [hue = "", saturation = "", lightness = "", alpha = ""] = parts;

  if (lightness === "") {
    return null;
  }

  const angle = ((numberOf(hue, 1) % HUE_FULL) + HUE_FULL) % HUE_FULL;
  const sat = unitOf(saturation);
  const light = unitOf(lightness);

  return {
    alpha: alphaOf(alpha),
    rgb: {
      blue: hslChannel(angle, sat, light, HSL_OFFSETS.blue) * BYTE,
      green: hslChannel(angle, sat, light, HSL_OFFSETS.green) * BYTE,
      red: hslChannel(angle, sat, light, HSL_OFFSETS.red) * BYTE,
    },
  };
};

const encode = (linear: number): number => {
  const unit = clamp(linear, 0, 1);

  if (unit <= GAMMA.cutoff) {
    return unit * GAMMA.linear * BYTE;
  }

  return (GAMMA.scale * unit ** (1 / GAMMA.exponent) - GAMMA.offset) * BYTE;
};

const mixOf = (
  weights: readonly number[],
  cones: readonly number[]
): number => {
  const [first = 0, second = 0, third = 0] = weights;
  const [long = 0, medium = 0, short = 0] = cones;

  return encode(first * long + second * medium + third * short);
};

const parseOklchFunction = (parts: readonly string[]): Parsed | null => {
  const [lightness = "", chroma = "", hue = "", alpha = ""] = parts;

  if (hue === "") {
    return null;
  }

  const light = numberOf(lightness, 1);
  const radians = (numberOf(hue, 1) * Math.PI) / HALF_TURN;
  const first = numberOf(chroma, 1) * Math.cos(radians);
  const second = numberOf(chroma, 1) * Math.sin(radians);

  const cones: [number, number, number] = [
    (light + OKLAB.longA * first + OKLAB.longB * second) ** CUBE,
    (light - OKLAB.mediumA * first - OKLAB.mediumB * second) ** CUBE,
    (light - OKLAB.shortA * first - OKLAB.shortB * second) ** CUBE,
  ];

  return {
    alpha: alphaOf(alpha),
    rgb: {
      blue: mixOf(OKLAB_RGB.blue, cones),
      green: mixOf(OKLAB_RGB.green, cones),
      red: mixOf(OKLAB_RGB.red, cones),
    },
  };
};

const parseFunction = (name: string, body: string): Parsed | null => {
  const parts = splitArguments(body.trim());
  const lower = name.toLowerCase();

  if (lower.startsWith("rgb")) {
    return parseRgbFunction(parts);
  }

  if (lower.startsWith("hsl")) {
    return parseHslFunction(parts);
  }

  return parseOklchFunction(parts);
};

const parseColor = (value: string): Parsed | null => {
  const text = value.trim();
  const named = NAMED.get(text.toLowerCase());

  if (named) {
    return { alpha: 1, rgb: named };
  }

  const hex = HEX_PATTERN.exec(text);

  if (hex?.groups) {
    return parseHex(hex.groups["digits"] ?? "");
  }

  const fn = FUNCTION_PATTERN.exec(text);

  if (fn?.groups) {
    return parseFunction(fn.groups["name"] ?? "", fn.groups["body"] ?? "");
  }

  return null;
};

const decode = (channel: number): number => {
  const unit = channel / BYTE;

  if (unit <= GAMMA.decodeCutoff) {
    return unit / GAMMA.linear;
  }

  return ((unit + GAMMA.offset) / GAMMA.scale) ** GAMMA.exponent;
};

const labCurve = (value: number): number => {
  if (value > LAB.curveCutoff) {
    return Math.cbrt(value);
  }

  return LAB.curveLinear * value + LAB.curveOffset;
};

const toLab = (rgb: Rgb): readonly [number, number, number] => {
  const red = decode(rgb.red);
  const green = decode(rgb.green);
  const blue = decode(rgb.blue);
  const cieX = XYZ.xRed * red + XYZ.xGreen * green + XYZ.xBlue * blue;
  const cieY = XYZ.yRed * red + XYZ.yGreen * green + XYZ.yBlue * blue;
  const cieZ = XYZ.zRed * red + XYZ.zGreen * green + XYZ.zBlue * blue;
  const fx = labCurve(cieX / D65.white);
  const fy = labCurve(cieY);
  const fz = labCurve(cieZ / D65.zed);

  return [
    LAB.lightness * fy - LAB.lightnessOffset,
    LAB.redGreen * (fx - fy),
    LAB.yellowBlue * (fy - fz),
  ];
};

const deltaE = (first: Rgb, second: Rgb): number => {
  const [light1, a1, b1] = toLab(first);
  const [light2, a2, b2] = toLab(second);

  return Math.hypot(light1 - light2, a1 - a2, b1 - b2);
};

export { deltaE, parseColor };

export type { Parsed };
