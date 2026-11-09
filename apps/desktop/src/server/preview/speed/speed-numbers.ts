import { SPEED_IMAGES_MAX } from "@design-studio/actions/speed/schema";

import type {
  SpeedImage,
  SpeedKey,
  SpeedProbe,
  SpeedResult,
  SpeedSample,
  SpeedValues,
} from "./speed-types.js";

const KEYS: readonly SpeedKey[] = ["lcp", "cls", "tbt", "transfer", "fonts"];

const CLS_DIGITS = 10_000;

const toMedian = (list: readonly number[]): number | null => {
  if (list.length === 0) {
    return null;
  }

  const sorted = list.toSorted((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const high = sorted[middle] ?? 0;

  if (sorted.length % 2 === 1) {
    return high;
  }

  return ((sorted[middle - 1] ?? 0) + high) / 2;
};

const toRound = (key: SpeedKey, value: number | null): number | null => {
  if (value === null) {
    return null;
  }

  if (key === "cls") {
    return Math.round(value * CLS_DIGITS) / CLS_DIGITS;
  }

  return Math.round(value);
};

const toValue = (
  probes: readonly SpeedProbe[],
  key: SpeedKey
): number | null => {
  const list: number[] = [];

  for (const probe of probes) {
    const found = probe[key];

    if (found !== null) {
      list.push(found);
    }
  }

  return toRound(key, toMedian(list));
};

const toValues = (probes: readonly SpeedProbe[]): SpeedValues => ({
  cls: toValue(probes, "cls"),
  fonts: toValue(probes, "fonts"),
  lcp: toValue(probes, "lcp"),
  tbt: toValue(probes, "tbt"),
  transfer: toValue(probes, "transfer"),
});

const toMedianProbe = (probes: readonly SpeedProbe[]): SpeedProbe | null => {
  const sorted = probes.toSorted(
    (left, right) => left.transfer - right.transfer
  );

  return sorted[Math.floor(sorted.length / 2)] ?? null;
};

const toSample = (
  probes: readonly SpeedProbe[],
  route: string | null,
  isAppServer: boolean
): SpeedSample => {
  const images = toMedianProbe(probes)?.images ?? [];
  const values = toValues(probes);
  const runs = probes.length;
  const isDevBuild = isAppServer || probes.some((probe) => probe.isDevServer);

  return {
    images,
    isDevBuild,
    route,
    runs,
    values,
  };
};

const toChange = (
  key: SpeedKey,
  value: number | null,
  baseline: number | null
): number | null => {
  if (value === null || baseline === null) {
    return null;
  }

  return toRound(key, value - baseline);
};

const toNumbers = (
  sample: SpeedSample,
  baseline: SpeedSample | null
): SpeedResult["numbers"] =>
  KEYS.map((key) => {
    const value = sample.values[key];
    const before = baseline?.values[key] ?? null;

    const change = toChange(key, value, before);

    return { baseline: before, change, key, value };
  });

const toImages = (
  sample: SpeedSample,
  baseline: SpeedSample | null
): SpeedResult["images"] => {
  const known = new Set<string>();

  for (const image of baseline?.images ?? []) {
    known.add(image.url);
  }

  return sample.images.slice(0, SPEED_IMAGES_MAX).map((image: SpeedImage) => ({
    bytes: image.bytes,
    isNew: baseline !== null && !known.has(image.url),
    url: image.url,
  }));
};

export { toImages, toNumbers, toSample };
