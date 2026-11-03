import { Schema } from "effect";

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

const ContentResultSchema = Schema.Struct({
  files: Schema.Array(Schema.String),
  previousVersionId: Schema.String,
  replaced: Schema.Int,
  rows: Schema.Int,
  versionId: Schema.String,
});

export {
  ContentLayerSchema,
  ContentModeSchema,
  ContentPresetSchema,
  ContentRepeatSchema,
  ContentResultSchema,
};
