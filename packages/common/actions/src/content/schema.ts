import { Effect, Schema } from "effect";

const ContentModeSchema = Schema.Literals([
  "sample",
  "long",
  "short",
  "empty",
  "pseudo",
]);

const ContentPresetSchema = Schema.Literals([
  "generic",
  "healthcare",
  "finance",
  "commerce",
  "social",
]);

const ContentRepeatSchema = Schema.Int.check(
  Schema.isBetween({ maximum: 50, minimum: 1 })
);

const ContentLayerSchema = Schema.Struct({
  col: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)).annotate({
    description: "Column of the layer start tag, from the element source.",
  }),
  file: Schema.String.annotate({
    description: "Source file of the layer, relative to the direction.",
  }),
  line: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)).annotate({
    description: "Line of the layer start tag, from the element source.",
  }),
});

const ContentInputFields = {
  mode: ContentModeSchema.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed("sample" as const))
  ),
  preset: ContentPresetSchema.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed("generic" as const))
  ),
  repeat: ContentRepeatSchema.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(1))
  ),
  seed: Schema.Int.pipe(Schema.withDecodingDefaultKey(Effect.succeed(1))),
} as const;

const MAX_IMPORT_TEXT = 100_000;

const MAX_IMPORT_COLUMNS = 200;

const ImportTextSchema = Schema.String.check(
  Schema.isMaxLength(MAX_IMPORT_TEXT)
).annotate({
  description:
    "CSV, TSV or a JSON array of objects or arrays. Max 200 rows and 100 KB.",
});

const ImportSlotSchema = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));

const ImportSlotsSchema = Schema.Array(ImportSlotSchema).check(
  Schema.isMaxLength(MAX_IMPORT_COLUMNS)
);

const ImportColumnsSchema = Schema.NullOr(ImportSlotsSchema)
  .annotate({
    description:
      "For each data column, the text slot index in the row (from 0). Null maps column to slot in order.",
  })
  .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null)));

const ContentResultSchema = Schema.Struct({
  files: Schema.Array(Schema.String),
  previousVersionId: Schema.String,
  replaced: Schema.Int,
  rows: Schema.Int,
  versionId: Schema.String,
});

export {
  ContentInputFields,
  ContentLayerSchema,
  ContentModeSchema,
  ContentPresetSchema,
  ContentRepeatSchema,
  ContentResultSchema,
  ImportColumnsSchema,
  ImportTextSchema,
};
