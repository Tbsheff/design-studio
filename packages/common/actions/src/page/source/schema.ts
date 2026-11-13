import { Schema } from "effect";

const PAGE_SOURCE_FILE_MAX = 300;

const PAGE_SOURCE_CHANGES_MAX = 50;

const PageSourceFileSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(PAGE_SOURCE_FILE_MAX)
).annotate({
  description:
    'Path of the HTML page in the direction that copies an app route, for example "index.html".',
});

const PageSourceFields = {
  file: PageSourceFileSchema,
} as const;

const PageSourceChangeSchema = Schema.Struct({
  change: Schema.Literals(["changed", "deleted"]),
  file: Schema.String,
});

const PageSourceSchema = Schema.Struct({
  appProjectId: Schema.NullOr(Schema.String),
  changedFiles: Schema.Array(PageSourceChangeSchema).check(
    Schema.isMaxLength(PAGE_SOURCE_CHANGES_MAX)
  ),
  copiedAt: Schema.NullOr(Schema.Number),
  isChanged: Schema.Boolean,
  isRouteCopy: Schema.Boolean,
  routePath: Schema.NullOr(Schema.String),
});

const PageSourceImportedSchema = Schema.Struct({
  frameId: Schema.String,
  page: Schema.String,
  routePath: Schema.String,
  sourcePage: Schema.String,
  versionId: Schema.NullOr(Schema.String),
});

const PageSourceFileDiffSchema = Schema.Struct({
  change: Schema.Literals(["changed", "deleted", "added"]),
  diff: Schema.String.annotate({
    description:
      'Line diff from the copy to the app now. "@@ -a +b @@" starts a hunk, "+" is a new line, "-" is an old line. Empty when the page has no copy snapshot.',
  }),
  file: Schema.String,
  isCut: Schema.Boolean,
});

const PageSourceChangesSchema = Schema.Struct({
  appProjectId: Schema.NullOr(Schema.String),
  copiedAt: Schema.NullOr(Schema.Number),
  files: Schema.Array(PageSourceFileDiffSchema).check(
    Schema.isMaxLength(PAGE_SOURCE_CHANGES_MAX)
  ),
  hasSnapshot: Schema.Boolean,
  isRouteCopy: Schema.Boolean,
  routePath: Schema.NullOr(Schema.String),
});

const PageSourceSetSchema = Schema.Struct({
  fileCount: Schema.Int,
  hasSnapshot: Schema.Boolean,
  page: Schema.String,
  routePath: Schema.String,
});

type PageSource = typeof PageSourceSchema.Type;

type PageSourceChange = typeof PageSourceChangeSchema.Type;

type PageSourceImported = typeof PageSourceImportedSchema.Type;

type PageSourceChanges = typeof PageSourceChangesSchema.Type;

type PageSourceFileDiff = typeof PageSourceFileDiffSchema.Type;

export {
  PAGE_SOURCE_CHANGES_MAX,
  PageSourceChangeSchema,
  PageSourceChangesSchema,
  PageSourceFields,
  PageSourceFileDiffSchema,
  PageSourceImportedSchema,
  PageSourceSchema,
  PageSourceSetSchema,
};

export type {
  PageSource,
  PageSourceChange,
  PageSourceChanges,
  PageSourceFileDiff,
  PageSourceImported,
};
