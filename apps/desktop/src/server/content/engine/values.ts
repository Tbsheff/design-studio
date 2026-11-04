import { hashOf, intBetween, makeRandom, pickFrom } from "./random.js";
import { MONTHS, PRESETS } from "./samples.js";
import type { Kind, Preset } from "./samples.js";

interface ValueContext {
  readonly preset: Preset;
  readonly seed: number;
}

const nameOf = (context: ValueContext, rowIndex: number): string => {
  const { names } = PRESETS[context.preset];
  const random = makeRandom(hashOf(context.seed, rowIndex, 1));
  const start = Math.floor(random() * names.length);

  return names[(start + rowIndex) % names.length] as string;
};

const initialsOf = (name: string): string => {
  const parts = name.split(/[\s._-]+/u).filter((part) => part.length > 0);
  const letters = parts.slice(0, 2).map((part) => part.charAt(0));

  return letters.join("").toUpperCase();
};

const SOCIAL_COUNT = { high: 9800, low: 12 };

const THOUSAND = 1000;

const MONEY_LOW = 8;

const CENT_MAX = 99;

const DAY_MAX = 28;

const MONEY_HIGH = { finance: 48_000, other: 640 };

const socialAmount = (random: () => number): string => {
  const count = intBetween(SOCIAL_COUNT.low, SOCIAL_COUNT.high, random);

  if (count >= THOUSAND) {
    return `${(count / THOUSAND).toFixed(1)}k`;
  }

  return String(count);
};

const moneyCeiling = (preset: Preset): number => {
  if (preset === "finance") {
    return MONEY_HIGH.finance;
  }

  return MONEY_HIGH.other;
};

const amountOf = (context: ValueContext, random: () => number): string => {
  if (context.preset === "social") {
    return socialAmount(random);
  }

  const whole = intBetween(MONEY_LOW, moneyCeiling(context.preset), random);
  const cents = intBetween(0, CENT_MAX, random);
  const grouped = whole.toLocaleString("en-US");
  const { currency } = PRESETS[context.preset];

  return `${currency}${grouped}.${String(cents).padStart(2, "0")}`;
};

const dateOf = (random: () => number): string => {
  const month = pickFrom(MONTHS, random);
  const day = intBetween(1, DAY_MAX, random);

  return `${month} ${day}, 2025`;
};

const emailOf = (name: string): string => {
  const handle = name.toLowerCase().replaceAll(/[^a-z]+/gu, ".");

  return `${handle}@example.com`;
};

type Maker = (
  context: ValueContext,
  random: () => number,
  name: string
) => string;

const MAKERS: Readonly<Record<Kind, Maker>> = {
  amount: (context, random) => amountOf(context, random),
  date: (_context, random) => dateOf(random),
  email: (_context, _random, name) => emailOf(name),
  initials: (_context, _random, name) => initialsOf(name),
  name: (_context, _random, name) => name,
  sentence: (context, random) =>
    pickFrom(PRESETS[context.preset].sentences, random),
  status: (context, random) =>
    pickFrom(PRESETS[context.preset].statuses, random),
  title: (context, random) => pickFrom(PRESETS[context.preset].titles, random),
};

const contentValue = (
  context: ValueContext,
  kind: Kind,
  rowIndex: number,
  columnIndex: number
): string => {
  const random = makeRandom(hashOf(context.seed, rowIndex, columnIndex, 2));

  return MAKERS[kind](context, random, nameOf(context, rowIndex));
};

export { initialsOf, contentValue };

export type { ValueContext };
