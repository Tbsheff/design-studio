import { DIRECT_STYLE_PROPERTIES } from "@design-studio/contracts";
import {
  PROP_NAME,
  PROP_TEXT_MAX,
  PROPS_MAX,
} from "@design-studio/contracts/props";
import { Schema } from "effect";

import { toDecoder } from "../../platform/decode/index.js";
import { DirectEditError } from "../engine/errors.js";

const RESERVED = new Set([
  "className",
  "class",
  "style",
  "children",
  "key",
  "ref",
  "dangerouslySetInnerHTML",
]);

const TAB_CODE = 9;

const LINE_FEED_CODE = 10;

const UNIT_SEPARATOR_CODE = 31;

const isControlCharacter = (character: string): boolean => {
  const code = character.codePointAt(0) ?? TAB_CODE;

  return (
    code <= UNIT_SEPARATOR_CODE && code !== TAB_CODE && code !== LINE_FEED_CODE
  );
};

const CVA_NAME = /^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/u;

const FILE_MAX = 1000;

const CLASS_NAME_MAX = 100;

const CLASS_LIST_MAX = 30;

const SHORT_MAX = 64;

const STYLE_VALUE_MAX = 200;

const toFileText = (): Schema.Trim =>
  Schema.Trim.check(Schema.isMinLength(1), Schema.isMaxLength(FILE_MAX));

const toShortText = (): Schema.String =>
  Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(SHORT_MAX));

const toPositive = (): Schema.Int =>
  Schema.Int.check(Schema.isGreaterThanOrEqualTo(1));

const hasNoControlCharacters = (value: string): boolean | string =>
  ![...value].some((character) => isControlCharacter(character)) ||
  "control characters are not allowed";

const isEditableProp = (name: string): boolean | string =>
  !RESERVED.has(name) || "this prop is not edited here";

const SourceSchema = Schema.Struct({
  col: toPositive(),
  file: toFileText(),
  line: toPositive(),
});

const PropTextSchema = Schema.String.check(
  Schema.isMaxLength(PROP_TEXT_MAX),
  Schema.makeFilter(hasNoControlCharacters)
);

const PropValueSchema = Schema.NullOr(
  Schema.Union([PropTextSchema, Schema.Finite, Schema.Boolean])
);

const PropNameSchema = Schema.String.check(
  Schema.isPattern(PROP_NAME),
  Schema.makeFilter(isEditableProp)
);

const PropsRecordSchema = Schema.Record(PropNameSchema, PropValueSchema).check(
  Schema.isMinProperties(1),
  Schema.isMaxProperties(PROPS_MAX)
);

const SetPropsSchema = Schema.Struct({
  props: PropsRecordSchema,
  source: SourceSchema,
});

const StyleValueSchema = Schema.NullOr(
  Schema.String.check(Schema.isMaxLength(STYLE_VALUE_MAX))
);

const ClassNameSchema = Schema.Trim.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(CLASS_NAME_MAX)
);

const ClassNamesSchema = Schema.Array(ClassNameSchema).check(
  Schema.isMaxLength(CLASS_LIST_MAX)
);

const toStyleEntry = (
  property: string
): [string, Schema.optionalKey<typeof StyleValueSchema>] => [
  property,
  Schema.optionalKey(StyleValueSchema),
];

const StyleFieldsSchema = Schema.Struct(
  Object.fromEntries(
    DIRECT_STYLE_PROPERTIES.map((property) => toStyleEntry(property))
  )
);

const ClassChangeSchema = Schema.Struct({
  add: Schema.optionalKey(ClassNamesSchema),
  remove: Schema.optionalKey(ClassNamesSchema),
});

const VariantClassSchema = Schema.Struct({
  classes: Schema.optionalKey(ClassChangeSchema),
  cva: Schema.String.check(Schema.isPattern(CVA_NAME)),
  file: toFileText(),
  prop: toShortText(),
  style: Schema.optionalKey(StyleFieldsSchema),
  value: toShortText(),
});

type SetProps = typeof SetPropsSchema.Type;

type VariantClassEdit = typeof VariantClassSchema.Type;

const decodeSetProps = toDecoder(SetPropsSchema, "error");

const decodeVariantClass = toDecoder(VariantClassSchema, "error");

const toInvalid = (error: Schema.SchemaError): DirectEditError => {
  const message = String(error.message).replaceAll("\n", "; ");

  return new DirectEditError(
    "invalid_request",
    message || "The request is not valid"
  );
};

const toSetProps = (raw: Schema.Json): SetProps => {
  const parsed = decodeSetProps(raw);

  if (parsed._tag === "Failure") {
    throw toInvalid(parsed.failure);
  }

  return parsed.success;
};

const toVariantClassEdit = (raw: Schema.Json): VariantClassEdit => {
  const parsed = decodeVariantClass(raw);

  if (parsed._tag === "Failure") {
    throw toInvalid(parsed.failure);
  }

  return parsed.success;
};

export { toSetProps, toVariantClassEdit };

export type { SetProps, VariantClassEdit };
