import {
  VARIANT_CLASSES,
  VARIANT_KEY,
  VARIANT_VALUE,
} from "@design-studio/contracts/component-variant";
import { Effect, Schema } from "effect";

import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";

const FILE_MAX = 1000;

const NAME = /^[A-Z][A-Za-z0-9_$]{0,63}$/u;

const CVA_NAME = /^[A-Za-z_$][\w$]{0,63}$/u;

const ComponentVariantScopeFields = {
  directionId: DirectionIdSchema,
  projectId: ProjectIdSchema,
} as const;

const ComponentNameSchema = Schema.String.check(Schema.isPattern(NAME));

const ComponentFileSchema = Schema.String.check(Schema.isMaxLength(FILE_MAX));

const CvaNameSchema = Schema.String.check(Schema.isPattern(CVA_NAME));

const VariantKeySchema = Schema.String.check(
  Schema.isPattern(VARIANT_KEY)
).annotate({
  description:
    'Variant key of the cva() variants map, for example "variant" or "size".',
});

const VariantValueSchema = Schema.String.check(
  Schema.isPattern(VARIANT_VALUE)
).annotate({
  description: 'Value name in that key, for example "danger" or "xl".',
});

const VariantClassesSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isPattern(VARIANT_CLASSES)
).annotate({
  description:
    'Tailwind classes of the value, for example "bg-red-600 text-white hover:bg-red-700".',
});

const SetDefaultSchema = Schema.Boolean.annotate({
  description: "Also make this value the default in defaultVariants.",
}).pipe(Schema.withDecodingDefaultKey(Effect.succeed(false)));

const CvaFieldSchema = CvaNameSchema.annotate({
  description:
    "Name of the cva() const, for example buttonVariants, when the file has more than one.",
});

const FileFieldSchema = ComponentFileSchema.annotate({
  description:
    "File of the component, relative to the project, when two components have the same name. Pass name or file.",
});

const NameFieldSchema = ComponentNameSchema.annotate({
  description:
    'Component name from list_components, for example "Button". Pass name or file.',
});

const ComponentVariantTargetFields = {
  cva: Schema.optionalKey(Schema.NullOr(CvaFieldSchema)),
  file: Schema.optionalKey(Schema.NullOr(FileFieldSchema)),
  name: Schema.optionalKey(Schema.NullOr(NameFieldSchema)),
} as const;

const CopyFromSchema = VariantValueSchema.annotate({
  description:
    "Existing value in the same key to copy. Its classes come first; classes then replace the ones of the same utility.",
});

const NewClassesSchema = VariantClassesSchema.annotate({
  description: "New classes for the value. They replace all of its classes.",
});

const RenameSchema = VariantValueSchema.annotate({
  description:
    "New name for the value. defaultVariants and compoundVariants follow it.",
});

const PreviewClassNameSchema = Schema.String.check(
  Schema.isPattern(VARIANT_CLASSES)
).annotate({ description: "Tailwind classes to preview for the value." });

const ComponentVariantCreateFields = {
  classes: Schema.optionalKey(Schema.NullOr(VariantClassesSchema)),
  copyFrom: Schema.optionalKey(Schema.NullOr(CopyFromSchema)),
  key: VariantKeySchema,
  newKey: Schema.Boolean.annotate({
    description:
      "Add the key when the variants map does not have it. The new value becomes its default.",
  }).pipe(Schema.withDecodingDefaultKey(Effect.succeed(false))),
  setDefault: SetDefaultSchema,
  value: VariantValueSchema,
} as const;

const ComponentVariantUpdateFields = {
  classes: Schema.optionalKey(Schema.NullOr(NewClassesSchema)),
  key: VariantKeySchema,
  rename: Schema.optionalKey(Schema.NullOr(RenameSchema)),
  setDefault: SetDefaultSchema,
  value: VariantValueSchema,
} as const;

const ComponentVariantPreviewFields = {
  className: Schema.optionalKey(Schema.NullOr(PreviewClassNameSchema)),
  file: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(FILE_MAX)
  ),
  key: VariantKeySchema,
  name: ComponentNameSchema,
  value: VariantValueSchema,
} as const;

const ComponentVariantValueSchema = Schema.Struct({
  classes: Schema.String,
  value: Schema.String,
});

const ComponentVariantComponentSchema = Schema.Struct({
  file: Schema.String,
  name: Schema.NullOr(Schema.String),
});

const ComponentVariantWrittenSchema = Schema.Struct({
  component: ComponentVariantComponentSchema,
  cva: Schema.String,
  default: Schema.NullOr(Schema.String),
  files: Schema.Array(Schema.String),
  key: Schema.String,
  note: Schema.NullOr(Schema.String),
  png: Schema.NullOr(Schema.String),
  title: Schema.String,
  value: Schema.String,
  values: Schema.Array(ComponentVariantValueSchema),
  versionId: Schema.NullOr(Schema.String),
});

const ComponentVariantPreviewSchema = Schema.Struct({
  hash: Schema.NullOr(Schema.String),
  png: Schema.NullOr(Schema.String),
  reason: Schema.NullOr(Schema.String),
});

export {
  ComponentVariantCreateFields,
  ComponentVariantPreviewFields,
  ComponentVariantPreviewSchema,
  ComponentVariantScopeFields,
  ComponentVariantTargetFields,
  ComponentVariantUpdateFields,
  ComponentVariantWrittenSchema,
};
