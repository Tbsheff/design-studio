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

type PageSource = typeof PageSourceSchema.Type;

type PageSourceChange = typeof PageSourceChangeSchema.Type;

type PageSourceImported = typeof PageSourceImportedSchema.Type;

export {
  PAGE_SOURCE_CHANGES_MAX,
  PageSourceChangeSchema,
  PageSourceFields,
  PageSourceImportedSchema,
  PageSourceSchema,
};

export type { PageSource, PageSourceChange, PageSourceImported };
