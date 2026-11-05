import {
  PAGE_IMPORT_NAME_MAX,
  PAGE_IMPORT_SELECTOR_MAX,
  PAGE_IMPORT_URL_MAX,
  PAGE_IMPORT_WIDTH_DEFAULT,
  PAGE_IMPORT_WIDTH_MAX,
  PAGE_IMPORT_WIDTH_MIN,
} from "@design-studio/contracts/page-import";
import { Effect, Schema } from "effect";

import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";

const PageImportTargetFields = {
  directionId: DirectionIdSchema,
  projectId: ProjectIdSchema,
} as const;

const PageImportNameSchema = Schema.NullOr(
  Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(PAGE_IMPORT_NAME_MAX)
  )
)
  .annotate({
    description:
      "Name of the new page; it becomes the file name <slug>.html. Leave out to use the page title.",
  })
  .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null)));

const PageImportSelectorSchema = Schema.NullOr(
  Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(PAGE_IMPORT_SELECTOR_MAX)
  )
)
  .annotate({
    description:
      'CSS selector of one region to copy, for example "header" or "main > section:nth-of-type(2)". Leave out for the whole page.',
  })
  .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null)));

const PageImportUrlSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(PAGE_IMPORT_URL_MAX)
).annotate({
  description:
    "The page to copy: an https URL, or http://localhost:<port>/... for the dev server of an attached app.",
});

const PageImportWidthSchema = Schema.Int.check(
  Schema.isBetween({
    maximum: PAGE_IMPORT_WIDTH_MAX,
    minimum: PAGE_IMPORT_WIDTH_MIN,
  })
)
  .annotate({
    description: `Viewport width in px (${PAGE_IMPORT_WIDTH_MIN} to ${PAGE_IMPORT_WIDTH_MAX}). Default ${PAGE_IMPORT_WIDTH_DEFAULT}.`,
  })
  .pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(PAGE_IMPORT_WIDTH_DEFAULT))
  );

const PageImportFields = {
  name: PageImportNameSchema,
  selector: PageImportSelectorSchema,
  url: PageImportUrlSchema,
  width: PageImportWidthSchema,
} as const;

const PageImportedSchema = Schema.Struct({
  assets: Schema.Array(Schema.String),
  classes: Schema.Number,
  elements: Schema.Number,
  frameId: Schema.String,
  height: Schema.Number,
  note: Schema.String,
  page: Schema.String,
  removed: Schema.Array(Schema.String),
  skippedAssets: Schema.Array(Schema.String),
  sourceUrl: Schema.String,
  title: Schema.String,
  tokens: Schema.Number,
  truncated: Schema.Boolean,
  versionId: Schema.NullOr(Schema.String),
  width: Schema.Number,
});

export { PageImportedSchema, PageImportFields, PageImportTargetFields };
