import type { Random } from "./to-random.js";
import { toSampleText } from "./to-sample-text.js";
import type { PrismaField, SampleCell, SampleVariant } from "./types.js";

interface ValueContext {
  readonly field: PrismaField;
  readonly foreignModel: string | null;
  readonly index: number;
  readonly random: Random;
  readonly variant: SampleVariant;
}

type ScalarCell = boolean | number | string;

type ScalarMaker = (context: ValueContext) => ScalarCell;

const BASE_YEAR = 2025;

const DAY_MS = 86_400_000;

const DAY_SPAN = 540;

const BIRTH_FIRST_YEAR = 1935;

const BIRTH_LAST_YEAR = 2005;

const LAST_DAY = 28;

const MONTHS = 12;

const COUNT_MAX = 40;

const AGE_MIN = 20;

const AGE_MAX = 95;

const AMOUNT_MAX = 100_000;

const CENTS = 100;

const FALSE_SHARE = 0.3;

const HEX_RADIX = 16;

const BASE36 = 36;

const CUID_LENGTH = 24;

const UUID_HEAD = 8;

const UUID_PART = 4;

const UUID_TAIL = 12;

const UUID_TRIPLE = 3;

const UUID_VERSION = "4";

const UUID_VARIANT = "8";

const OPTIONAL_NULL_NAMES =
  /(?:deleted|archived|cancelled|canceled|revoked)(?:at|date)$/u;

const DOB_NAMES = /(?:dob|birth)/u;

const COUNT_NAMES = /(?:count|total|number|qty|quantity)$/u;

const toHexRun = (random: Random, length: number): string =>
  Array.from({ length }, () =>
    random.toInt(0, HEX_RADIX - 1).toString(HEX_RADIX)
  ).join("");

const toUuid = (random: Random): string =>
  [
    toHexRun(random, UUID_HEAD),
    toHexRun(random, UUID_PART),
    `${UUID_VERSION}${toHexRun(random, UUID_TRIPLE)}`,
    `${UUID_VARIANT}${toHexRun(random, UUID_TRIPLE)}`,
    toHexRun(random, UUID_TAIL),
  ].join("-");

const toCuid = (random: Random): string => {
  const body = Array.from({ length: CUID_LENGTH }, () =>
    random.toInt(0, BASE36 - 1).toString(BASE36)
  ).join("");

  return `c${body}`;
};

const toBirthDate = (random: Random): string => {
  const year = random.toInt(BIRTH_FIRST_YEAR, BIRTH_LAST_YEAR);
  const month = random.toInt(1, MONTHS);
  const day = random.toInt(1, LAST_DAY);

  return new Date(Date.UTC(year, month - 1, day)).toISOString();
};

const toTimestamp = (random: Random): string => {
  const days = random.toInt(0, DAY_SPAN);
  const millis = random.toInt(0, DAY_MS - 1);
  const start = Date.UTC(BASE_YEAR, 0, 1);

  return new Date(start + days * DAY_MS + millis).toISOString();
};

const toIdValue = (context: ValueContext): SampleCell => {
  const { field, index, random } = context;

  if (field.type === "Int" || field.type === "BigInt") {
    return index + 1;
  }

  if ((field.defaultText ?? "").includes("cuid")) {
    return toCuid(random);
  }

  return toUuid(random);
};

const toStubValue = (field: PrismaField, model: string): SampleCell => {
  if (field.type === "Int" || field.type === "BigInt") {
    return 1;
  }

  return `stub-${model.toLowerCase()}-id`;
};

const toEnumCell = (context: ValueContext): SampleCell => {
  const { field, random } = context;
  const first = random.pick(field.enumValues);

  if (first === null) {
    return null;
  }

  if (field.isList) {
    return [first];
  }

  return first;
};

const toDecimalValue: ScalarMaker = ({ random }) =>
  random.toInt(1, AMOUNT_MAX) / CENTS;

const toIntegerValue: ScalarMaker = ({ field, random }) => {
  const key = field.name.toLowerCase();

  if (key.includes("age")) {
    return random.toInt(AGE_MIN, AGE_MAX);
  }

  if (COUNT_NAMES.test(key)) {
    return random.toInt(0, COUNT_MAX);
  }

  return random.toInt(1, CENTS);
};

const toDateValue: ScalarMaker = ({ field, random }) => {
  if (DOB_NAMES.test(field.name.toLowerCase())) {
    return toBirthDate(random);
  }

  return toTimestamp(random);
};

const toBooleanValue: ScalarMaker = ({ random }) => random.next() > FALSE_SHARE;

const toEmptyValue: ScalarMaker = () => "";

const toJsonValue: ScalarMaker = () => "{}";

const SCALAR_MAKERS = new Map<string, ScalarMaker>([
  ["BigInt", toIntegerValue],
  ["Boolean", toBooleanValue],
  ["Bytes", toEmptyValue],
  ["DateTime", toDateValue],
  ["Decimal", toDecimalValue],
  ["Float", toDecimalValue],
  ["Int", toIntegerValue],
  ["Json", toJsonValue],
]);

const toScalarCell: ScalarMaker = (context) => {
  const { field, index, random, variant } = context;
  const { isUnique, name } = field;
  const make = SCALAR_MAKERS.get(field.type) ?? null;

  if (make !== null) {
    return make(context);
  }

  return toSampleText({ index, isUnique, name, random, variant });
};

const toListCell = (context: ValueContext): readonly string[] => [
  String(toScalarCell(context)),
  String(toScalarCell(context)),
];

const isOptionalNull = (
  field: PrismaField,
  variant: SampleVariant
): boolean => {
  if (!field.isOptional) {
    return false;
  }

  return (
    variant === "sparse" || OPTIONAL_NULL_NAMES.test(field.name.toLowerCase())
  );
};

const toSampleCell = (context: ValueContext): SampleCell => {
  const { field, foreignModel, variant } = context;

  if (field.isId) {
    return toIdValue(context);
  }

  if (isOptionalNull(field, variant)) {
    return null;
  }

  if (foreignModel !== null) {
    return toStubValue(field, foreignModel);
  }

  if (field.enumValues.length > 0) {
    return toEnumCell(context);
  }

  if (field.isList) {
    return toListCell(context);
  }

  return toScalarCell(context);
};

export { toSampleCell };

export type { ValueContext };
