import type { Structure } from "./structure.js";

type SynthMode = "empty" | "filled" | "long";

type JsonValue =
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue }
  | null;

interface SynthContext {
  readonly mode: SynthMode;
  readonly next: () => number;
  readonly scale: number;
}

const FILLED_ITEMS = 6;
const LONG_TOP_ITEMS = 40;
const LONG_NESTED_ITEMS = 10;
const RECORD_FILLED = 3;
const RECORD_LONG = 10;

const HASH_START = 7;
const HASH_MULTIPLIER = 31;
const RNG_MODULUS = 4_294_967_296;
const RNG_MULTIPLIER = 1_664_525;
const RNG_INCREMENT = 1_013_904_223;

const SHORT_LONG = 90;
const WIDE_LONG = 360;
const TOKEN_LENGTH = 70;
const LONG_SHARE = 3;
const HEX_BASE = 16;
const DAYS_IN_MONTH = 28;
const PAD_WIDTH = 2;
const UUID_A = 8;
const UUID_B = 4;
const UUID_C = 3;
const UUID_E = 12;
const UUID_PARTS = [UUID_A, UUID_B, UUID_C, UUID_C, UUID_E] as const;
const ID_LENGTH = 16;
const EMAIL_LENGTH = 4;
const URL_LENGTH = 6;

const LONG_INTEGER = 1_234_567_890;
const LONG_FLOAT = 123_456_789.99;
const MONEY_BASE = 10;
const MONEY_SPAN = 9990;
const COUNT_SPAN = 99;
const PLAIN_SPAN = 1000;
const FLOAT_SPAN = 100_000;
const CENTS = 100;
const HALF = 0.5;

const NAMES = [
  "Avery Stone",
  "Jordan Lee",
  "Riley Martin",
  "Casey Nguyen",
  "Morgan Patel",
  "Taylor Brooks",
] as const;

const TITLES = [
  "Quarterly review",
  "Weekly summary",
  "Onboarding checklist",
  "Team update",
  "Release notes",
  "Planning session",
] as const;

const SENTENCES = [
  "This is sample text that stands in for a real entry.",
  "A short note with a few words to show the layout.",
  "Another entry that reads like normal content.",
  "Sample content for this screen, written for preview.",
] as const;

const STATUSES = ["active", "pending", "done", "archived"] as const;

const WORDS = ["Sample", "Preview", "Example", "Demo", "Placeholder"] as const;

const NAME_KEY = /name|owner|author|user|person|client/iu;
const TITLE_KEY = /title|subject|label|heading|headline/iu;
const BODY_KEY = /desc|body|summary|note|text|message|comment|content|detail/iu;
const STATUS_KEY = /status|state|stage|type|kind|role/iu;
const COUNT_KEY = /count|total|qty|quantity|num|size|rank|index/iu;
const MONEY_KEY = /price|amount|cost|balance|fee|revenue/iu;

const toHash = (text: string): number => {
  let hash = HASH_START;

  for (const char of text) {
    hash = (hash * HASH_MULTIPLIER + (char.codePointAt(0) ?? 0)) % RNG_MODULUS;
  }

  return hash;
};

const createRng = (seed: string): (() => number) => {
  let state = toHash(seed);

  return () => {
    state = (state * RNG_MULTIPLIER + RNG_INCREMENT) % RNG_MODULUS;

    return state / RNG_MODULUS;
  };
};

const toPick = <Choice>(
  choices: readonly [Choice, ...Choice[]],
  context: SynthContext
): Choice => {
  const at = Math.floor(context.next() * choices.length);

  return choices[at] ?? choices[0];
};

const toPad = (value: number): string => String(value).padStart(PAD_WIDTH, "0");

const toHex = (context: SynthContext, length: number): string => {
  let text = "";

  while (text.length < length) {
    text += Math.floor(context.next() * HEX_BASE).toString(HEX_BASE);
  }

  return text;
};

const toLongText = (words: string, size: number): string => {
  let text = words;

  while (text.length < size) {
    text += ` ${words.toLowerCase()}`;
  }

  return text.slice(0, size);
};

const toPlainText = (key: string, context: SynthContext): string => {
  if (NAME_KEY.test(key)) {
    return toPick(NAMES, context);
  }

  if (TITLE_KEY.test(key)) {
    return toPick(TITLES, context);
  }

  if (STATUS_KEY.test(key)) {
    return toPick(STATUSES, context);
  }

  if (BODY_KEY.test(key)) {
    return toPick(SENTENCES, context);
  }

  return `${toPick(WORDS, context)} ${toPick(TITLES, context).toLowerCase()}`;
};

const toLongPlain = (key: string, context: SynthContext): string => {
  const base = toPlainText(key, context);

  if (context.next() < 1 / LONG_SHARE) {
    return `unbroken${toHex(context, TOKEN_LENGTH)}`;
  }

  if (BODY_KEY.test(key)) {
    return toLongText(base, WIDE_LONG);
  }

  return toLongText(base, SHORT_LONG);
};

const toUuid = (context: SynthContext): string =>
  UUID_PARTS.map((length) => toHex(context, length)).join("-");

const toFormatted = (format: string, context: SynthContext): string | null => {
  const day = toPad(1 + Math.floor(context.next() * DAYS_IN_MONTH));

  if (format === "uuid") {
    return toUuid(context);
  }

  if (format === "datetime") {
    return `2026-01-${day}T09:30:00.000Z`;
  }

  if (format === "date") {
    return `2026-01-${day}`;
  }

  if (format === "email") {
    return `person${toHex(context, EMAIL_LENGTH)}@example.com`;
  }

  if (format === "url") {
    return `https://example.com/item/${toHex(context, URL_LENGTH)}`;
  }

  if (format === "id") {
    return `id-${toHex(context, ID_LENGTH)}`;
  }

  return null;
};

const toLongFormatted = (
  format: string,
  context: SynthContext
): string | null => {
  if (format === "email") {
    const name = toLongText("very.long.mailbox", SHORT_LONG);

    return `${name.replaceAll(" ", ".")}@example.com`;
  }

  if (format === "url") {
    const path = toLongText("long-path-segment", WIDE_LONG);

    return `https://example.com/${path.replaceAll(" ", "-")}`;
  }

  return toFormatted(format, context);
};

const toStringValue = (
  key: string,
  format: string,
  context: SynthContext
): string => {
  if (context.mode === "long") {
    return toLongFormatted(format, context) ?? toLongPlain(key, context);
  }

  return toFormatted(format, context) ?? toPlainText(key, context);
};

const toIntegerValue = (key: string, context: SynthContext): number => {
  if (context.mode === "empty") {
    return 0;
  }

  if (context.mode === "long") {
    return LONG_INTEGER;
  }

  if (MONEY_KEY.test(key)) {
    return MONEY_BASE + Math.floor(context.next() * MONEY_SPAN);
  }

  if (COUNT_KEY.test(key)) {
    return 1 + Math.floor(context.next() * COUNT_SPAN);
  }

  return 1 + Math.floor(context.next() * PLAIN_SPAN);
};

const toFloatValue = (context: SynthContext): number => {
  if (context.mode === "empty") {
    return 0;
  }

  if (context.mode === "long") {
    return LONG_FLOAT;
  }

  return Math.round(context.next() * FLOAT_SPAN) / CENTS;
};

const toLongCount = (arrayDepth: number): number => {
  if (arrayDepth === 0) {
    return LONG_TOP_ITEMS;
  }

  return LONG_NESTED_ITEMS;
};

const toRecordCount = (context: SynthContext): number => {
  if (context.mode === "long") {
    return RECORD_LONG;
  }

  return RECORD_FILLED;
};

const toItemCount = (
  length: number,
  arrayDepth: number,
  context: SynthContext
): number => {
  if (context.mode === "empty") {
    return 0;
  }

  if (context.mode === "long") {
    const wanted = toLongCount(arrayDepth);

    return Math.max(1, Math.floor(wanted * context.scale));
  }

  return Math.min(Math.max(length, 1), FILLED_ITEMS);
};

const toValue = (
  structure: Structure,
  key: string,
  arrayDepth: number,
  context: SynthContext
): JsonValue => {
  switch (structure.kind) {
    case "array": {
      const { element } = structure;

      if (element === null || structure.length === 0) {
        return [];
      }

      const count = toItemCount(structure.length, arrayDepth, context);

      return Array.from({ length: count }, () =>
        toValue(element, key, arrayDepth + 1, context)
      );
    }

    case "boolean": {
      return context.mode !== "empty" && context.next() > HALF;
    }

    case "integer": {
      return toIntegerValue(key, context);
    }

    case "number": {
      return toFloatValue(context);
    }

    case "object": {
      return Object.fromEntries(
        structure.fields.map((field) => [
          field.key,
          toValue(field.structure, field.key, arrayDepth, context),
        ])
      );
    }

    case "record": {
      const { value } = structure;

      if (value === null || context.mode === "empty") {
        return {};
      }

      const count = toRecordCount(context);

      return Object.fromEntries(
        Array.from({ length: count }, (_unused, at) => [
          `entry-${at + 1}`,
          toValue(value, key, arrayDepth, context),
        ])
      );
    }

    case "string": {
      return toStringValue(key, structure.format, context);
    }

    default: {
      return null;
    }
  }
};

export { createRng, toValue };

export type { JsonValue, SynthContext, SynthMode };
