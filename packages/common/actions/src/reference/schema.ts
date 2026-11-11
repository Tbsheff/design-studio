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

const ReferenceUrlFieldSchema = Schema.NullOr(Schema.String).annotate({
  description:
    "An http or https web page to attach as reference. The studio loads it at 1440 px and saves page.png, page.md and style.json. Null when path or data is set.",
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

const ReferencePinSchema = Schema.Struct({
  directionId: Schema.String,
  id: Schema.String.annotate({ description: "The pinned canvas frame id." }),
  name: Schema.String,
  path: Schema.NullOr(Schema.String).annotate({
    description: "The page path of the frame. Null for the entry page.",
  }),
  pinnedAt: Schema.String,
  screenshotPath: Schema.NullOr(Schema.String).annotate({
    description:
      "Absolute path of the PNG the studio saved at pin time. Null when the capture failed.",
  }),
  sourcePath: Schema.NullOr(Schema.String).annotate({
    description:
      "The main source file of the frame, relative to its direction. Null when the studio cannot tell.",
  }),
});

const ReferencePinFileSchema = Schema.Struct({
  pins: Schema.Array(ReferencePinSchema),
});

const ReferencePinSetSchema = Schema.Struct({
  isPinned: Schema.Boolean,
  pin: Schema.NullOr(ReferencePinSchema),
});

export {
  ReferenceDataFieldSchema,
  ReferenceFileNameFieldSchema,
  ReferenceNameFieldSchema,
  ReferencePathFieldSchema,
  ReferencePinFileSchema,
  ReferencePinSchema,
  ReferencePinSetSchema,
  ReferenceSchema,
  ReferenceUrlFieldSchema,
};
