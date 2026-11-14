import type { KitComponent } from "./types.js";

type BadgeTone = "amber" | "blue" | "green" | "neutral" | "red";

interface ToneInput {
  readonly declarations: ReadonlyMap<string, string>;
  readonly hasBackground: boolean;
  readonly hasEdge: boolean;
  readonly tokens: readonly string[];
}

interface HueRange {
  readonly below: number;
  readonly tone: BadgeTone | null;
}

const VARIANT_PROP = "variant";
const DEFAULT_VARIANT = "default";
const OUTLINE_VARIANT = "outline";
const FULL_TURN = 360;
const HEX_SHORT = 3;
const HEX_LONG = 6;
const HEX_BASE = 16;
const CHANNEL_MAX = 255;
const HALF = 0.5;
const SECTOR = 60;
const GREEN_SECTOR = 2;
const BLUE_SECTOR = 4;
const SECTOR_COUNT = 6;
const GRAY_SATURATION = 0.15;
const GRAY_CHROMA = 0.03;
const PERCENT = 100;
const HEX_PAIR = 2;
const HEX_STARTS = [0, HEX_PAIR, HEX_PAIR + HEX_PAIR];

const TONE_VARIANTS: Readonly<Record<BadgeTone, string>> = {
  amber: "warning",
  blue: "info",
  green: "success",
  neutral: "secondary",
  red: "destructive",
};

const NAMED_TONES: ReadonlyMap<string, BadgeTone> = new Map([
  ["amber", "amber"],
  ["blue", "blue"],
  ["cyan", "blue"],
  ["danger", "red"],
  ["destructive", "red"],
  ["emerald", "green"],
  ["error", "red"],
  ["gray", "neutral"],
  ["green", "green"],
  ["grey", "neutral"],
  ["indigo", "blue"],
  ["info", "blue"],
  ["lime", "green"],
  ["muted", "neutral"],
  ["neutral", "neutral"],
  ["orange", "amber"],
  ["red", "red"],
  ["rose", "red"],
  ["secondary", "neutral"],
  ["sky", "blue"],
  ["slate", "neutral"],
  ["stone", "neutral"],
  ["success", "green"],
  ["teal", "green"],
  ["warning", "amber"],
  ["yellow", "amber"],
  ["zinc", "neutral"],
]);

const HSL_RANGES: readonly HueRange[] = [
  { below: 15, tone: "red" },
  { below: 65, tone: "amber" },
  { below: 170, tone: "green" },
  { below: 260, tone: "blue" },
  { below: 330, tone: null },
  { below: FULL_TURN, tone: "red" },
];

const OKLCH_RANGES: readonly HueRange[] = [
  { below: 40, tone: "red" },
  { below: 110, tone: "amber" },
  { below: 200, tone: "green" },
  { below: 290, tone: "blue" },
  { below: 345, tone: null },
  { below: FULL_TURN, tone: "red" },
];

const BACKGROUND_TOKEN = /^bg-(?<name>[a-z]+)(?:-\d+)?(?:\/\d+)?$/u;
const TEXT_TOKEN = /^text-(?<name>[a-z]+)(?:-\d+)?(?:\/\d+)?$/u;
const ARBITRARY_BACKGROUND = /^bg-\[(?<value>[^\]]+)\]$/u;

const ARBITRARY_TEXT =
  /^text-\[(?<value>#[^\]]+|rgba?\([^\]]+\)|hsla?\([^\]]+\)|oklch\([^\]]+\))\]$/u;

const HEX_VALUE = /#(?<hex>[\da-f]{3,8})\b/iu;

const RGB_VALUE =
  /rgba?\(\s*(?<red>[\d.]+)[\s,]+(?<green>[\d.]+)[\s,]+(?<blue>[\d.]+)/iu;

const HSL_VALUE =
  /hsla?\(\s*(?<hue>[\d.]+)(?:deg)?[\s,]+(?<saturation>[\d.]+)%/iu;

const OKLCH_VALUE = /oklch\(\s*[\d.]+%?\s+(?<chroma>[\d.]+)\s+(?<hue>[\d.]+)/iu;
const NAME_VALUE = /^[a-z]+$/u;

const toRangeTone = (
  ranges: readonly HueRange[],
  hue: number
): BadgeTone | null =>
  ranges.find((range) => hue % FULL_TURN < range.below)?.tone ?? null;

const toHexChannels = (hex: string): number[] => {
  let full = hex.slice(0, HEX_LONG);

  if (hex.length === HEX_SHORT) {
    full = [...hex].map((digit) => `${digit}${digit}`).join("");
  }

  return HEX_STARTS.map(
    (start) =>
      Number.parseInt(full.slice(start, start + HEX_PAIR), HEX_BASE) /
      CHANNEL_MAX
  );
};

const toSectorHue = (
  channels: readonly number[],
  max: number,
  spread: number
): number => {
  const [red = 0, green = 0, blue = 0] = channels;

  if (max === red) {
    return SECTOR * (((green - blue) / spread + SECTOR_COUNT) % SECTOR_COUNT);
  }

  if (max === green) {
    return SECTOR * ((blue - red) / spread + GREEN_SECTOR);
  }

  return SECTOR * ((red - green) / spread + BLUE_SECTOR);
};

const toChannelTone = (channels: readonly number[]): BadgeTone | null => {
  const max = Math.max(...channels);
  const min = Math.min(...channels);
  const spread = max - min;
  const light = (max + min) * HALF;
  const scale = 1 - Math.abs(2 * light - 1);

  if (spread === 0 || scale === 0 || spread / scale < GRAY_SATURATION) {
    return "neutral";
  }

  return toRangeTone(HSL_RANGES, toSectorHue(channels, max, spread));
};

const toHslTone = (hue: number, saturation: number): BadgeTone | null => {
  if (saturation / PERCENT < GRAY_SATURATION) {
    return "neutral";
  }

  return toRangeTone(HSL_RANGES, hue);
};

const toOklchTone = (chroma: number, hue: number): BadgeTone | null => {
  if (chroma < GRAY_CHROMA) {
    return "neutral";
  }

  return toRangeTone(OKLCH_RANGES, hue);
};

const toValueTone = (value: string): BadgeTone | null => {
  const hex = HEX_VALUE.exec(value)?.groups?.hex ?? null;
  const rgb = RGB_VALUE.exec(value)?.groups ?? null;
  const hsl = HSL_VALUE.exec(value)?.groups ?? null;
  const oklch = OKLCH_VALUE.exec(value)?.groups ?? null;
  const name = value.trim().toLowerCase();

  if (hex !== null && (hex.length === HEX_SHORT || hex.length >= HEX_LONG)) {
    return toChannelTone(toHexChannels(hex));
  }

  if (rgb !== null) {
    return toChannelTone(
      [rgb.red, rgb.green, rgb.blue].map((part) => Number(part) / CHANNEL_MAX)
    );
  }

  if (hsl !== null) {
    return toHslTone(Number(hsl.hue), Number(hsl.saturation));
  }

  if (oklch !== null) {
    return toOklchTone(Number(oklch.chroma), Number(oklch.hue));
  }

  if (NAME_VALUE.test(name)) {
    return NAMED_TONES.get(name) ?? null;
  }

  return null;
};

const toTokenTone = (
  tokens: readonly string[],
  named: RegExp,
  arbitrary: RegExp
): BadgeTone | null => {
  for (const token of tokens) {
    const name = named.exec(token)?.groups?.name ?? "";
    const value = arbitrary.exec(token)?.groups?.value ?? "";
    const tone = NAMED_TONES.get(name) ?? toValueTone(value);

    if (tone !== null) {
      return tone;
    }
  }

  return null;
};

const toDeclarationTone = (
  declarations: ReadonlyMap<string, string>,
  names: readonly string[]
): BadgeTone | null => {
  for (const name of names) {
    const tone = toValueTone(declarations.get(name) ?? "");

    if (tone !== null) {
      return tone;
    }
  }

  return null;
};

const toBadgeTone = (input: ToneInput): BadgeTone | null => {
  const tokens = input.tokens.filter((token) => !token.includes(":"));

  return (
    toTokenTone(tokens, BACKGROUND_TOKEN, ARBITRARY_BACKGROUND) ??
    toDeclarationTone(input.declarations, ["background-color", "background"]) ??
    toTokenTone(tokens, TEXT_TOKEN, ARBITRARY_TEXT) ??
    toDeclarationTone(input.declarations, ["color"])
  );
};

const toWantedVariant = (input: ToneInput): string => {
  const tone = toBadgeTone(input);

  if (tone !== null && tone !== "neutral") {
    return TONE_VARIANTS[tone];
  }

  if (!input.hasBackground && input.hasEdge) {
    return OUTLINE_VARIANT;
  }

  if (tone === "neutral") {
    return TONE_VARIANTS.neutral;
  }

  return DEFAULT_VARIANT;
};

const toBadgeVariant = (kit: KitComponent, input: ToneInput): string => {
  const group = kit.groups.find((entry) => entry.prop === VARIANT_PROP) ?? null;
  const wanted = toWantedVariant(input);

  if (group === null) {
    return DEFAULT_VARIANT;
  }

  if (group.options.some((option) => option.value === wanted)) {
    return wanted;
  }

  return group.default ?? DEFAULT_VARIANT;
};

export { toBadgeVariant };

export type { ToneInput };
