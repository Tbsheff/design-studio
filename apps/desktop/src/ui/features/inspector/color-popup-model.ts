import type { StyleValueRow } from "@design-studio/contracts/style-search";

import { colorHex } from "../../../shared/token-match.js";

interface Rgba {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly alpha: number;
}

interface Hsva {
  readonly hue: number;
  readonly saturation: number;
  readonly value: number;
  readonly alpha: number;
}

interface PageColor {
  readonly value: string;
  readonly token: string | null;
}

const HUE_MAX = 360;
const BYTE_MAX = 255;
const PERCENT = 100;
const HEX_RADIX = 16;
const HEX_PAIR = 2;
const SHORT_HEX = 3;
const SHORT_HEX_ALPHA = 4;
const LONG_HEX = 6;
const LONG_HEX_ALPHA = 8;
const ALPHA_PAIR = 3;
const HUE_SECTOR = 60;
const SECTOR_COUNT = 6;
const GREEN_SECTOR = 2;
const BLUE_SECTOR = 4;
const ALPHA_DIGITS = 100;
const PAGE_COLORS_MAX = 16;
const STEP_SMALL = 1;
const STEP_LARGE = 10;
const BLACK: Hsva = { alpha: 1, hue: 0, saturation: 0, value: 0 };

const HEX_TEXT_RE = /^#?(?<body>[0-9a-f]{3,8})$/iu;

const RGB_RE =
  /^rgba?\(\s*(?<red>[\d.]+%?)[\s,]+(?<green>[\d.]+%?)[\s,]+(?<blue>[\d.]+%?)(?:\s*[,/]\s*(?<alpha>[\d.]+%?))?\s*\)$/iu;

const TRANSPARENT_RE = /^transparent$/iu;

const VAR_ALPHA_RE =
  /^var\(\s*(?<name>--[\w-]+)\s*\/\s*(?<alpha>\d+(?:\.\d+)?)\s*\)$/u;

const COLOR_PREFIX = "--color-";

const FN_ALPHA_RE = /^(?<body>[a-z]+\([^/)]*)\/\s*(?<alpha>[\d.]+%?)\s*\)$/iu;

const toClamped = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));

const toChannel = (raw: string, max: number): number => {
  if (raw.endsWith("%")) {
    return (Number(raw.slice(0, -1)) / PERCENT) * max;
  }

  return Number(raw);
};

const fromRgbText = (text: string): Rgba | null => {
  const groups = RGB_RE.exec(text)?.groups;

  if (!groups) {
    return null;
  }

  return {
    alpha: toClamped(toChannel(groups.alpha ?? "1", 1), 0, 1),
    blue: toClamped(toChannel(groups.blue ?? "0", BYTE_MAX), 0, BYTE_MAX),
    green: toClamped(toChannel(groups.green ?? "0", BYTE_MAX), 0, BYTE_MAX),
    red: toClamped(toChannel(groups.red ?? "0", BYTE_MAX), 0, BYTE_MAX),
  };
};

const toLongHex = (body: string): string | null => {
  if (body.length === SHORT_HEX || body.length === SHORT_HEX_ALPHA) {
    return [...body].map((digit) => digit + digit).join("");
  }

  if (body.length === LONG_HEX || body.length === LONG_HEX_ALPHA) {
    return body;
  }

  return null;
};

const toHexPair = (body: string, index: number): number =>
  Number.parseInt(
    body.slice(index * HEX_PAIR, (index + 1) * HEX_PAIR),
    HEX_RADIX
  );

const fromHexBody = (raw: string): Rgba | null => {
  const body = HEX_TEXT_RE.exec(raw)?.groups?.body;
  const long = toLongHex(body ?? "");

  if (!long) {
    return null;
  }

  let alpha = 1;

  if (long.length === LONG_HEX_ALPHA) {
    alpha = toHexPair(long, ALPHA_PAIR) / BYTE_MAX;
  }

  return {
    alpha,
    blue: toHexPair(long, 2),
    green: toHexPair(long, 1),
    red: toHexPair(long, 0),
  };
};

const toRgba = (raw: string): Rgba | null => {
  const text = raw.trim();

  if (TRANSPARENT_RE.test(text)) {
    return { alpha: 0, blue: 0, green: 0, red: 0 };
  }

  if (text.startsWith("#")) {
    return fromHexBody(text);
  }

  return fromRgbText(text);
};

const fromAnyColor = (raw: string): Rgba | null => {
  const direct = toRgba(raw);

  if (direct) {
    return direct;
  }

  const groups = FN_ALPHA_RE.exec(raw.trim())?.groups;
  let opaque = raw;

  if (groups?.body) {
    opaque = `${groups.body})`;
  }

  const base = fromHexBody(colorHex(opaque) ?? "");

  if (!base) {
    return null;
  }

  return {
    ...base,
    alpha: toClamped(toChannel(groups?.alpha ?? "1", 1), 0, 1),
  };
};

const toHue = (rgb: Rgba, high: number, delta: number): number => {
  if (delta === 0) {
    return 0;
  }

  const red = rgb.red / BYTE_MAX;
  const green = rgb.green / BYTE_MAX;
  const blue = rgb.blue / BYTE_MAX;
  let sector = (red - green) / delta + BLUE_SECTOR;

  if (high === green) {
    sector = (blue - red) / delta + GREEN_SECTOR;
  }

  if (high === red) {
    sector = ((green - blue) / delta + SECTOR_COUNT) % SECTOR_COUNT;
  }

  return sector * HUE_SECTOR;
};

const toHsvaParts = (
  alpha: number,
  hue: number,
  saturation: number,
  value: number
): Hsva => ({ alpha, hue, saturation, value });

const toHsva = (rgb: Rgba): Hsva => {
  const high = Math.max(rgb.red, rgb.green, rgb.blue) / BYTE_MAX;
  const low = Math.min(rgb.red, rgb.green, rgb.blue) / BYTE_MAX;
  const delta = high - low;
  let saturation = 0;

  if (high > 0) {
    saturation = delta / high;
  }

  return toHsvaParts(rgb.alpha, toHue(rgb, high, delta), saturation, high);
};

const toSectorChannel = (hsva: Hsva, offset: number): number => {
  const sector = (offset + hsva.hue / HUE_SECTOR) % SECTOR_COUNT;
  const weight = Math.max(0, Math.min(sector, BLUE_SECTOR - sector, 1));

  return Math.round(
    (hsva.value - hsva.value * hsva.saturation * weight) * BYTE_MAX
  );
};

const RED_OFFSET = 5;
const GREEN_OFFSET = 3;
const BLUE_OFFSET = 1;

const fromHsva = (hsva: Hsva): Rgba => ({
  alpha: hsva.alpha,
  blue: toSectorChannel(hsva, BLUE_OFFSET),
  green: toSectorChannel(hsva, GREEN_OFFSET),
  red: toSectorChannel(hsva, RED_OFFSET),
});

const toByteHex = (value: number): string =>
  Math.round(value).toString(HEX_RADIX).padStart(HEX_PAIR, "0");

const toAlphaRound = (alpha: number): number =>
  Math.round(alpha * ALPHA_DIGITS) / ALPHA_DIGITS;

const toHexText = (hsva: Hsva): string => {
  const rgb = fromHsva(hsva);
  const base = `#${toByteHex(rgb.red)}${toByteHex(rgb.green)}${toByteHex(rgb.blue)}`;
  const alpha = toAlphaRound(hsva.alpha);

  if (alpha >= 1) {
    return base;
  }

  return `${base}${toByteHex(alpha * BYTE_MAX)}`;
};

const toColorText = (hsva: Hsva): string => {
  const alpha = toAlphaRound(hsva.alpha);

  if (alpha >= 1) {
    return toHexText(hsva);
  }

  const rgb = fromHsva(hsva);

  return `rgb(${rgb.red} ${rgb.green} ${rgb.blue} / ${alpha})`;
};

const toHsvaOf = (raw: string): Hsva => {
  const rgb = fromAnyColor(raw);

  if (!rgb) {
    return BLACK;
  }

  return toHsva(rgb);
};

const fromHexText = (text: string, alpha: number): Hsva | null => {
  const rgb = fromHexBody(text.trim());

  if (!rgb) {
    return null;
  }

  const body = text.trim().replace("#", "");

  if (body.length === SHORT_HEX || body.length === LONG_HEX) {
    return toHsva({ ...rgb, alpha });
  }

  return toHsva(rgb);
};

const toVarAlphaColor = (
  raw: string,
  resolve: (value: string) => string
): string => {
  const groups = VAR_ALPHA_RE.exec(raw.trim())?.groups;

  if (!groups?.name) {
    return resolve(raw);
  }

  let base = resolve(`var(${groups.name})`);

  if (base.startsWith("var(") && groups.name.startsWith(COLOR_PREFIX)) {
    base = groups.name.slice(COLOR_PREFIX.length);
  }

  const rgb = fromAnyColor(base);

  if (!rgb) {
    return resolve(raw);
  }

  const alpha = toAlphaRound(Number(groups.alpha) / PERCENT);

  return `rgb(${rgb.red} ${rgb.green} ${rgb.blue} / ${alpha})`;
};

const toAlphaPercent = (hsva: Hsva): number => Math.round(hsva.alpha * PERCENT);

const fromAlphaText = (text: string): number | null => {
  const value = Number(text.trim().replace("%", ""));

  if (text.trim() === "" || !Number.isFinite(value)) {
    return null;
  }

  return toClamped(value, 0, PERCENT) / PERCENT;
};

const toStep = (isLarge: boolean): number => {
  if (isLarge) {
    return STEP_LARGE;
  }

  return STEP_SMALL;
};

const toPadStep = (hsva: Hsva, dx: number, dy: number): Hsva => ({
  ...hsva,
  saturation: toClamped(hsva.saturation + dx / PERCENT, 0, 1),
  value: toClamped(hsva.value + dy / PERCENT, 0, 1),
});

const toHueStep = (hsva: Hsva, delta: number): Hsva => ({
  ...hsva,
  hue: toClamped(hsva.hue + delta, 0, HUE_MAX),
});

const toAlphaStep = (hsva: Hsva, delta: number): Hsva => ({
  ...hsva,
  alpha: toClamped(hsva.alpha + delta / PERCENT, 0, 1),
});

const toRatio = (start: number, size: number, point: number): number => {
  if (size <= 0) {
    return 0;
  }

  return toClamped((point - start) / size, 0, 1);
};

const toKeyX = (key: string): number => {
  if (key === "ArrowLeft") {
    return -1;
  }

  if (key === "ArrowRight") {
    return 1;
  }

  return 0;
};

const toKeyY = (key: string): number => {
  if (key === "ArrowDown") {
    return -1;
  }

  if (key === "ArrowUp") {
    return 1;
  }

  return 0;
};

const toKeyDirection = (key: string): number => toKeyX(key) + toKeyY(key);

const toPadKey = (hsva: Hsva, key: string, isLarge: boolean): Hsva | null => {
  const step = toStep(isLarge);
  const dx = toKeyX(key);
  const dy = toKeyY(key);

  if (dx === 0 && dy === 0) {
    return null;
  }

  return toPadStep(hsva, dx * step, dy * step);
};

const toPadColor = (hsva: Hsva, rect: DOMRect, x: number, y: number): Hsva => ({
  ...hsva,
  saturation: toRatio(rect.left, rect.width, x),
  value: 1 - toRatio(rect.top, rect.height, y),
});

const toHueColor = (hue: number): string => `hsl(${Math.round(hue)} 100% 50%)`;

const toOpaqueColor = (hsva: Hsva): string => toHexText({ ...hsva, alpha: 1 });

const toAlphaTrack = (hsva: Hsva): string => {
  const rgb = fromHsva(hsva);

  return `linear-gradient(to right, rgb(${rgb.red} ${rgb.green} ${rgb.blue} / 0), rgb(${rgb.red} ${rgb.green} ${rgb.blue}))`;
};

const isPageColor = (row: StyleValueRow): boolean => {
  const rgb = fromAnyColor(row.value);

  return row.kind === "color" && rgb !== null && rgb.alpha > 0;
};

const toPageColors = (rows: readonly StyleValueRow[]): PageColor[] =>
  rows
    .filter((row) => isPageColor(row))
    .slice(0, PAGE_COLORS_MAX)
    .map((row) => ({ token: row.tokens[0] ?? null, value: row.value }));

const toPageValue = (color: PageColor): string => {
  if (color.token?.startsWith("--")) {
    return `var(${color.token})`;
  }

  return toColorText(toHsvaOf(color.value));
};

export {
  HUE_MAX,
  PERCENT,
  fromAlphaText,
  fromHexText,
  toKeyDirection,
  toPadColor,
  toPadKey,
  toAlphaPercent,
  toAlphaStep,
  toAlphaTrack,
  toColorText,
  toHexText,
  toHsvaOf,
  toHueColor,
  toHueStep,
  toOpaqueColor,
  toPadStep,
  toPageColors,
  toPageValue,
  toRgba,
  toStep,
  toVarAlphaColor,
};

export type { Hsva, PageColor };
