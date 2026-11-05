import { Schema } from "effect";

const FILE_MAX = 1000;

const SELECTOR_MAX = 2000;

const TAG_MAX = 100;

const LocationNumberSchema = Schema.Int.check(Schema.isGreaterThanOrEqualTo(1));

const FileSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(FILE_MAX)
);

const SelectorSchema = Schema.String.check(Schema.isMaxLength(SELECTOR_MAX));

const TagSchema = Schema.String.check(Schema.isMaxLength(TAG_MAX));

const ElementSourceFields = {
  col: LocationNumberSchema,
  file: FileSchema,
  line: LocationNumberSchema,
} as const;

const ElementSourceSchema = Schema.Struct(ElementSourceFields);

const OptionalSelectorSchema = Schema.optionalKey(
  Schema.NullOr(SelectorSchema)
);

const OptionalTagSchema = Schema.optionalKey(Schema.NullOr(TagSchema));

const ElementTargetSchema = Schema.Struct({
  selector: OptionalSelectorSchema,
  source: ElementSourceSchema,
  tag: OptionalTagSchema,
});

export { ElementSourceFields, ElementSourceSchema, ElementTargetSchema };
