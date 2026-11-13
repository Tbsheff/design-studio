import { Effect, Schema } from "effect";

import { VersionIdSchema } from "../../_core/ids.js";

const PAGE_MATCH_MAX = 50;

const PAGE_MATCH_SELECTOR_MAX = 500;

const PAGE_MATCH_FILE_MAX = 300;

const PageMatchFileSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(PAGE_MATCH_FILE_MAX)
).annotate({
  description:
    'Path of the HTML page in the direction, for example "index.html" or "about.html".',
});

const PageMatchSelectorSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(PAGE_MATCH_SELECTOR_MAX)
).annotate({
  description:
    'CSS selector of the element in the page, as the studio writes it, for example "body > nav" or "body > footer:nth-of-type(2)".',
});

const PageMatchSourceFields = {
  file: PageMatchFileSchema,
  selector: PageMatchSelectorSchema,
} as const;

const PageMatchVersionSchema = Schema.NullOr(
  VersionIdSchema.annotate({
    description:
      "Match against the element as it was in this version. Leave out for the head.",
  })
).pipe(Schema.withDecodingDefaultKey(Effect.succeed(null)));

const PageMatchHashSchema = Schema.NullOr(
  Schema.String.annotate({
    description:
      "The markupHash that inspect_matches_page gave for this page. The page is left out when its element changed since. Leave out to skip the check.",
  })
).pipe(Schema.withDecodingDefaultKey(Effect.succeed(null)));

const PageMatchTargetSchema = Schema.Struct({
  ...PageMatchSourceFields,
  markupHash: PageMatchHashSchema,
});

const PageMatchTargetsSchema = Schema.Array(PageMatchTargetSchema)
  .check(Schema.isMinLength(1), Schema.isMaxLength(PAGE_MATCH_MAX))
  .annotate({
    description:
      "The pages to change, each with the element to replace. Use the items of inspect_matches_page where isSame is true.",
  });

const PageMatchSchema = Schema.Struct({
  file: Schema.String,
  frameId: Schema.NullOr(Schema.String),
  isSame: Schema.Boolean,
  markupHash: Schema.String,
  selector: Schema.String,
});

const PageMatchesSchema = Schema.Struct({
  items: Schema.Array(PageMatchSchema).check(
    Schema.isMaxLength(PAGE_MATCH_MAX)
  ),
});

const PageMatchSkipSchema = Schema.Struct({
  file: Schema.String,
  reason: Schema.Literals(["changed", "missing"]),
});

const PageMatchesUpdatedSchema = Schema.Struct({
  files: Schema.Array(Schema.String),
  skipped: Schema.Array(PageMatchSkipSchema),
  versionId: Schema.String,
});

type PageMatch = typeof PageMatchSchema.Type;

type PageMatches = typeof PageMatchesSchema.Type;

type PageMatchesUpdated = typeof PageMatchesUpdatedSchema.Type;

type PageMatchSkip = typeof PageMatchSkipSchema.Type;

type PageMatchTarget = typeof PageMatchTargetSchema.Type;

export {
  PAGE_MATCH_MAX,
  PageMatchesSchema,
  PageMatchesUpdatedSchema,
  PageMatchSchema,
  PageMatchSkipSchema,
  PageMatchSourceFields,
  PageMatchTargetSchema,
  PageMatchTargetsSchema,
  PageMatchVersionSchema,
};

export type {
  PageMatch,
  PageMatches,
  PageMatchesUpdated,
  PageMatchSkip,
  PageMatchTarget,
};
