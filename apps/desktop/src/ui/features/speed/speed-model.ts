import { copy } from "./copy.js";
import type { RouteOutput, speedRoutes } from "./deps.js";

type SpeedView = RouteOutput<typeof speedRoutes.getSpeed>;

type SpeedNumberView = SpeedView["numbers"][number];

type SpeedImageView = SpeedView["images"][number];

type SpeedTone = "better" | "same" | "worse";

const KILOBYTE = 1024;

const MEGABYTE = KILOBYTE * KILOBYTE;

const SPEED_RUNS = 3;

const LABELS = {
  cls: copy.clsLabel,
  fonts: copy.fontsLabel,
  lcp: copy.lcpLabel,
  tbt: copy.tbtLabel,
  transfer: copy.transferLabel,
} as const;

const toBytesText = (bytes: number): string => {
  const size = Math.abs(bytes);

  if (size >= MEGABYTE) {
    return `${(bytes / MEGABYTE).toFixed(1)} MB`;
  }

  if (size >= KILOBYTE) {
    return `${Math.round(bytes / KILOBYTE)} KB`;
  }

  return `${bytes} ${copy.bytesUnit}`;
};

const toAmountText = (key: SpeedNumberView["key"], amount: number): string => {
  if (key === "transfer") {
    return toBytesText(amount);
  }

  if (key === "lcp" || key === "tbt") {
    return `${amount} ms`;
  }

  return String(amount);
};

const toLabel = (row: SpeedNumberView): string => LABELS[row.key];

const toValueText = (row: SpeedNumberView): string => {
  if (row.value === null) {
    return "—";
  }

  return toAmountText(row.key, row.value);
};

const toChangeText = (row: SpeedNumberView): string => {
  if (row.change === null) {
    return "";
  }

  if (row.change === 0) {
    return copy.noChange;
  }

  let sign = "";

  if (row.change > 0) {
    sign = "+";
  }

  return `${sign}${toAmountText(row.key, row.change)}`;
};

const toTone = (row: SpeedNumberView): SpeedTone => {
  if (row.change === null || row.change === 0) {
    return "same";
  }

  if (row.change > 0) {
    return "worse";
  }

  return "better";
};

const toImageName = (image: SpeedImageView): string => {
  const parts = image.url.split("/");

  return decodeURIComponent(parts.at(-1)?.split("?")[0] ?? image.url);
};

export {
  SPEED_RUNS,
  toBytesText,
  toChangeText,
  toImageName,
  toLabel,
  toTone,
  toValueText,
};

export type { SpeedImageView, SpeedNumberView, SpeedTone, SpeedView };
