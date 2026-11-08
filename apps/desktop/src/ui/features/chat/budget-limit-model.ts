const MIN_LIMIT_USD = 0.01;
const MAX_LIMIT_USD = 50;
const CENTS = 100;
const HALF_DOLLAR = 0.5;
const FIVE_DOLLARS = 5;

const PRESETS: (number | null)[] = [null, HALF_DOLLAR, 1, 2, FIVE_DOLLARS];

const money = (value: number): string => {
  if (Number.isInteger(value)) {
    return `$${value}`;
  }

  return `$${value.toFixed(2)}`;
};

const limitLabel = (value: number | null): string => {
  if (value === null) {
    return "No limit";
  }

  return money(value);
};

const parseLimit = (raw: string): number | null | "bad" => {
  const text = raw.trim().replace(/^\$/u, "");

  if (text === "") {
    return null;
  }

  const value = Number(text);

  if (
    Number.isFinite(value) &&
    value >= MIN_LIMIT_USD &&
    value <= MAX_LIMIT_USD
  ) {
    return Math.round(value * CENTS) / CENTS;
  }

  return "bad";
};

export { PRESETS, limitLabel, money, parseLimit };
