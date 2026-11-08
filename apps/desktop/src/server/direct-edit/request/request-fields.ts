import { OWNERS_MAX, OWNER_STACK_MAX } from "@design-studio/contracts/props";
import { Schema } from "effect";

const FILE_MAX = 1000;
const OWNER_NAME_MAX = 64;
const SELECTOR_MAX = 2000;
const TAG_MAX = 100;

const toText = (min: number, max: number): Schema.String =>
  Schema.String.check(Schema.isMinLength(min), Schema.isMaxLength(max));

const toTrimmed = (min: number, max: number): Schema.Trim =>
  Schema.Trim.check(Schema.isMinLength(min), Schema.isMaxLength(max));

const PositiveInt = Schema.Int.check(Schema.isGreaterThanOrEqualTo(1));

const LocSchema = Schema.Struct({
  col: PositiveInt,
  file: toText(1, FILE_MAX),
  line: PositiveInt,
});

const OwnerSchema = Schema.Struct({
  name: toText(0, OWNER_NAME_MAX),
  stack: toText(0, OWNER_STACK_MAX),
});

const OwnersSchema = Schema.Array(OwnerSchema).check(
  Schema.isMaxLength(OWNERS_MAX)
);

const TargetSchema = Schema.Struct({
  owners: Schema.optional(OwnersSchema),
  selector: Schema.optional(toText(0, SELECTOR_MAX)),
  source: Schema.NullOr(LocSchema),
  tag: Schema.optional(toText(0, TAG_MAX)),
});

interface FailedDecode {
  readonly failure: { readonly message: string };
}

const AT_PREFIX = "at ";

const isPathLine = (line: string): boolean => line.trim().startsWith(AT_PREFIX);

const toPathText = (line: string): string =>
  line
    .trim()
    .slice(AT_PREFIX.length)
    .replaceAll("][", ".")
    .replaceAll("[", "")
    .replaceAll("]", "")
    .replaceAll('"', "");

const toIssueLines = (lines: readonly string[]): string[] =>
  lines.flatMap((line, index) => {
    if (isPathLine(line)) {
      return [];
    }

    const next = lines[index + 1] ?? "";

    if (!isPathLine(next)) {
      return [line];
    }

    return [`${toPathText(next)}: ${line}`];
  });

const toIssueText = (failure: FailedDecode, fallback: string): string => {
  const text = toIssueLines(String(failure.failure.message).split("\n"))
    .filter((line) => line !== "")
    .join("; ");

  if (text === "") {
    return fallback;
  }

  return text;
};

export {
  LocSchema,
  OwnerSchema,
  OwnersSchema,
  PositiveInt,
  TargetSchema,
  toIssueText,
  toText,
  toTrimmed,
};

export type { FailedDecode };
