import { Schema } from "effect";

const REFERENCE_SOURCES = ["file", "folder", "zip"] as const;

const ReferencePathFieldSchema = Schema.NullOr(Schema.String).annotate({
  description:
    "Absolute local path to a folder, zip, PDF, Markdown, CSV, JSON or text file. Null when data is set.",
});

const ReferenceDataFieldSchema = Schema.NullOr(Schema.String).annotate({
  description:
    "The file bytes as base64, for a zip or a single file. Null when path is set.",
});

const ReferenceFileNameFieldSchema = Schema.NullOr(Schema.String).annotate({
  description:
    "The file name with its extension, such as brand.zip. Needed with data. Null otherwise.",
});

const ReferenceNameFieldSchema = Schema.NullOr(Schema.String).annotate({
  description:
    "A short name for the folder under reference/. Null to use the source name.",
});

const ReferenceSchema = Schema.Struct({
  bytes: Schema.Number,
  documentCount: Schema.Int,
  fileCount: Schema.Int,
  imageCount: Schema.Int,
  indexPath: Schema.String,
  name: Schema.String,
  path: Schema.String,
  skippedCount: Schema.Int,
  source: Schema.Literals(REFERENCE_SOURCES),
  textCount: Schema.Int,
});

export {
  ReferenceDataFieldSchema,
  ReferenceFileNameFieldSchema,
  ReferenceNameFieldSchema,
  ReferencePathFieldSchema,
  ReferenceSchema,
};
