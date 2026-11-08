import {
  CITIES,
  FIRST_NAMES,
  LAST_NAMES,
  LONG_FIRST_NAMES,
  LONG_LAST_NAMES,
  LONG_TEXT,
  STATES,
  WORDS,
} from "./sample-words.js";
import type { Random } from "./to-random.js";
import type { SampleVariant } from "./types.js";

interface TextContext {
  readonly index: number;
  readonly isUnique: boolean;
  readonly name: string;
  readonly random: Random;
  readonly variant: SampleVariant;
}

interface TextRule {
  readonly make: (context: TextContext) => string;
  readonly test: RegExp;
}

const PHONE_MIN = 100;

const PHONE_TAIL = -2;

const ID_PAD = 4;

const PHONE_MAX = 199;

const ZIP_MIN = 10_000;

const ZIP_MAX = 99_999;

const LAST4_MIN = 1000;

const LAST4_MAX = 9999;

const STREET_MAX = 9999;

const toFirstName = (context: TextContext): string => {
  if (context.variant === "long") {
    return context.random.pick(LONG_FIRST_NAMES) ?? "";
  }

  return context.random.pick(FIRST_NAMES) ?? "";
};

const toLastName = (context: TextContext): string => {
  if (context.variant === "long") {
    return context.random.pick(LONG_LAST_NAMES) ?? "";
  }

  return context.random.pick(LAST_NAMES) ?? "";
};

const toUniqueSuffix = (context: TextContext): string => {
  if (context.isUnique) {
    return String(context.index + 1);
  }

  return "";
};

const toEmail = (context: TextContext): string => {
  const first = toFirstName(context).toLowerCase();
  const last = toLastName(context).toLowerCase();

  return `${first}.${last}${String(context.index + 1)}@example.test`;
};

const toPhone = (context: TextContext): string => {
  const line = context.random.toInt(PHONE_MIN, PHONE_MAX);

  return `555-01${String(line).slice(PHONE_TAIL)}-${String(context.index + 1).padStart(ID_PAD, "0")}`;
};

const toSentence = (context: TextContext): string => {
  if (context.variant === "long") {
    return LONG_TEXT;
  }

  const first = context.random.pick(WORDS) ?? "";
  const second = context.random.pick(WORDS) ?? "";

  return `Sample ${first} and ${second} note ${String(context.index + 1)}`;
};

const toFullName = (context: TextContext): string =>
  `${toFirstName(context)} ${toLastName(context)}`;

const toAddress = (context: TextContext): string =>
  `${String(context.random.toInt(1, STREET_MAX))} ${toLastName(context)} Street`;

const toUrl = (context: TextContext): string =>
  `https://example.test/${context.name.toLowerCase()}/${String(context.index + 1)}`;

const TEXT_RULES: readonly TextRule[] = [
  { make: toFirstName, test: /^(?:first|given|preferred)name$/u },
  { make: toLastName, test: /^(?:last|family|sur)name$/u },
  {
    make: (context) => toFirstName(context).charAt(0),
    test: /^middle(?:name|initial)$/u,
  },
  { make: () => "Jr.", test: /^suffix$/u },
  { make: toFullName, test: /^(?:full|display|patient|contact)?name$/u },
  { make: toEmail, test: /email/u },
  { make: toPhone, test: /(?:phone|mobile|fax|telephone)/u },
  {
    make: (context) =>
      `900-00-${String(context.random.toInt(LAST4_MIN, LAST4_MAX))}`,
    test: /^ssn$/u,
  },
  {
    make: (context) => String(context.random.toInt(LAST4_MIN, LAST4_MAX)),
    test: /last4$/u,
  },
  {
    make: (context) => context.random.pick(CITIES) ?? "",
    test: /^city$/u,
  },
  {
    make: (context) => context.random.pick(STATES) ?? "",
    test: /^state(?:code)?$/u,
  },
  {
    make: (context) => String(context.random.toInt(ZIP_MIN, ZIP_MAX)),
    test: /(?:zip|postal)/u,
  },
  { make: () => "US", test: /^country(?:code)?$/u },
  { make: toAddress, test: /^(?:address|street)\d?$/u },
  { make: toUrl, test: /(?:url|website|link)$/u },
  {
    make: toSentence,
    test: /(?:description|notes?|comment|body|summary|text|reason|message)$/u,
  },
  {
    make: (context) =>
      `${context.random.pick(WORDS) ?? ""} ${String(context.index + 1)}`,
    test: /^(?:title|label|subject)$/u,
  },
];

const toHumanName = (name: string): string =>
  name
    .replaceAll(/(?<lower>[a-z0-9])(?<upper>[A-Z])/gu, "$<lower> $<upper>")
    .replaceAll("_", " ")
    .toLowerCase();

const toSampleText = (context: TextContext): string => {
  const key = context.name.replaceAll("_", "").toLowerCase();
  const rule = TEXT_RULES.find((candidate) => candidate.test.test(key)) ?? null;

  if (rule !== null) {
    return rule.make(context);
  }

  if (context.variant === "long") {
    return `${LONG_TEXT} (${toHumanName(context.name)})`;
  }

  return `Sample ${toHumanName(context.name)} ${String(context.index + 1)}${toUniqueSuffix(context)}`;
};

export { toSampleText };

export type { TextContext };
