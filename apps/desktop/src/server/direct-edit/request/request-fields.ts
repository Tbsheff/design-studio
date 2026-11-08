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

const toIssueText = (failure: FailedDecode, fallback: string): string => {
  const text = String(failure.failure.message).replaceAll("\n", "; ");

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
