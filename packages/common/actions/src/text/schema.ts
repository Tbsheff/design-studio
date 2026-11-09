import {
  TEXT_SEARCH_GLOB_MAX,
  TEXT_SEARCH_HITS_MAX,
  TEXT_SEARCH_IDS_MAX,
  TEXT_SEARCH_QUERY_MAX,
  TEXT_SEARCH_REPLACE_MAX,
} from "@design-studio/contracts/text-search";
import { Effect, Schema } from "effect";

import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";

const HIT_ID_MAX = 1200;

const TextHitKindSchema = Schema.Literals(["text", "attribute", "literal"]);

const TextQuerySchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(TEXT_SEARCH_QUERY_MAX)
);

const TextGlobSchema = Schema.NullOr(
  Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(TEXT_SEARCH_GLOB_MAX)
  )
).pipe(Schema.withDecodingDefaultKey(Effect.succeed(null)));

const TextFlagSchema = Schema.Boolean.pipe(
  Schema.withDecodingDefaultKey(Effect.succeed(false))
);

const TextLimitSchema = Schema.Int.check(
  Schema.isBetween({ maximum: TEXT_SEARCH_HITS_MAX, minimum: 1 })
).pipe(Schema.withDecodingDefaultKey(Effect.succeed(TEXT_SEARCH_HITS_MAX)));

const TextHitIdSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(HIT_ID_MAX)
);

const TextIdsSchema = Schema.NullOr(
  Schema.Array(TextHitIdSchema).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(TEXT_SEARCH_IDS_MAX)
  )
).pipe(Schema.withDecodingDefaultKey(Effect.succeed(null)));

const TextReplaceSchema = Schema.String.check(
  Schema.isMaxLength(TEXT_SEARCH_REPLACE_MAX)
);

const TextTargetFields = {
  directionId: DirectionIdSchema,
  projectId: ProjectIdSchema,
} as const;

const TextQueryFields = {
  caseSensitive: TextFlagSchema,
  glob: TextGlobSchema,
  query: TextQuerySchema,
  regex: TextFlagSchema,
  wholeWord: TextFlagSchema,
} as const;

const TextLayerSchema = Schema.Struct({
  col: Schema.Int,
  file: Schema.String,
  line: Schema.Int,
  tag: Schema.String,
});

const TextHitSchema = Schema.Struct({
  attribute: Schema.NullOr(Schema.String),
  col: Schema.Int,
  file: Schema.String,
  frame: Schema.NullOr(Schema.String),
  id: Schema.String,
  kind: TextHitKindSchema,
  layer: TextLayerSchema,
  line: Schema.Int,
  match: Schema.String,
  snippet: Schema.String,
});

const TextSkipSchema = Schema.Struct({
  file: Schema.String,
  reason: Schema.String,
});

const TextSearchResultSchema = Schema.Struct({
  files: Schema.Int,
  hits: Schema.Array(TextHitSchema),
  skipped: Schema.Array(TextSkipSchema),
  total: Schema.Int,
  truncated: Schema.Boolean,
});

const TextUpdateResultSchema = Schema.Struct({
  files: Schema.Array(Schema.String),
  skipped: Schema.Array(TextSkipSchema),
  stale: Schema.Array(Schema.String),
  updated: Schema.Int,
  versionId: Schema.NullOr(Schema.String),
});

const TEXT_REWRITE_MODES = [
  "shorten",
  "lengthen",
  "clarify",
  "voice",
  "fix",
  "translate",
] as const;

const TEXT_LANGUAGE_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3}$/u;

const TEXT_LANGUAGE_MAX = 35;

const TEXT_FILE_MAX = 500;

const TextRewriteModeSchema = Schema.Literals(TEXT_REWRITE_MODES).annotate({
  description:
    "shorten, lengthen, clarify, voice (match docs/voice.md), fix (spelling and grammar) or translate (needs language).",
});

const TextRewriteLanguageSchema = Schema.NullOr(
  Schema.String.check(
    Schema.isMaxLength(TEXT_LANGUAGE_MAX),
    Schema.isPattern(TEXT_LANGUAGE_PATTERN)
  )
)
  .annotate({
    description:
      "BCP 47 language tag such as es or fr-CA. Needed for translate, null for the other modes.",
  })
  .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null)));

const TextRewriteShouldApplySchema = Schema.Boolean.annotate({
  description: "True writes option 1 to the source as one version.",
}).pipe(Schema.withDecodingDefaultKey(Effect.succeed(false)));

const TextRewriteLayerSchema = Schema.Struct({
  column: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  file: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(TEXT_FILE_MAX)
  ),
  line: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
});

const TextRewriteResultSchema = Schema.Struct({
  isApplied: Schema.Boolean,
  layerText: Schema.String,
  mode: TextRewriteModeSchema,
  model: Schema.String,
  options: Schema.Array(Schema.String),
  versionId: Schema.NullOr(Schema.String),
});

export {
  TEXT_REWRITE_MODES,
  TextRewriteLanguageSchema,
  TextRewriteLayerSchema,
  TextRewriteModeSchema,
  TextRewriteResultSchema,
  TextRewriteShouldApplySchema,
  TextIdsSchema,
  TextLimitSchema,
  TextQueryFields,
  TextReplaceSchema,
  TextSearchResultSchema,
  TextTargetFields,
  TextUpdateResultSchema,
};
