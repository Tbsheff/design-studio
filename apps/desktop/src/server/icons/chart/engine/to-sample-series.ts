import type { ChartKind, ChartRow, ChartSeries } from "./types.js";

const LCG_MULTIPLIER = 1_664_525;

const LCG_INCREMENT = 1_013_904_223;

const LCG_MODULUS = 4_294_967_296;

const HASH_PRIME = 31;

const FLOOR = 24;

const CEILING = 220;

const START_BASE = 70;

const START_SPREAD = 60;

const STEP_SPREAD = 44;

const STEP_BIAS = 0.42;

const PIE_BASE = 120;

const PIE_DECAY = 0.62;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const PIE_LABELS = ["Chrome", "Safari", "Firefox", "Edge", "Other"] as const;

const BAR_COUNT = 8;

const SPARK_COUNT = 14;

const toSeed = (key: string): number =>
  [...key].reduce(
    (hash, char) =>
      (hash * HASH_PRIME + (char.codePointAt(0) ?? 0)) % LCG_MODULUS,
    LCG_INCREMENT
  );

const toNextState = (state: number): number =>
  (state * LCG_MULTIPLIER + LCG_INCREMENT) % LCG_MODULUS;

const toClamped = (value: number): number =>
  Math.round(Math.min(CEILING, Math.max(FLOOR, value)));

const toWalk = (key: string, count: number): number[] => {
  const values: number[] = [];
  let state = toSeed(key);
  let current = START_BASE + (state % START_SPREAD);

  for (let index = 0; index < count; index += 1) {
    state = toNextState(state);
    current = toClamped(
      current + (state / LCG_MODULUS - STEP_BIAS) * STEP_SPREAD
    );
    values.push(current);
  }

  return values;
};

const toLabels = (kind: ChartKind): string[] => {
  if (kind === "bar") {
    return Array.from(
      { length: BAR_COUNT },
      (_unused, index) => `Week ${index + 1}`
    );
  }

  if (kind === "sparkline") {
    return Array.from(
      { length: SPARK_COUNT },
      (_unused, index) => `${index + 1}`
    );
  }

  return [...MONTHS];
};

const toPieRows = (series: readonly ChartSeries[]): ChartRow[] => {
  const [first] = series;
  const walk = toWalk(first?.key ?? "value", PIE_LABELS.length);

  return PIE_LABELS.map((label, index) => ({
    label,
    values: [
      Math.round((walk[index] ?? PIE_BASE) * PIE_DECAY ** (index * PIE_DECAY)),
    ],
  }));
};

const toSampleRows = (
  kind: ChartKind,
  series: readonly ChartSeries[]
): ChartRow[] => {
  if (kind === "pie") {
    return toPieRows(series);
  }

  const labels = toLabels(kind);
  const walks = series.map((item) => toWalk(item.key, labels.length));

  return labels.map((label, index) => ({
    label,
    values: walks.map((walk) => walk[index] ?? FLOOR),
  }));
};

export { toSampleRows };
