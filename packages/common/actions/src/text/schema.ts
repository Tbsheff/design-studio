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

export {
  TextIdsSchema,
  TextLimitSchema,
  TextQueryFields,
  TextReplaceSchema,
  TextSearchResultSchema,
  TextTargetFields,
  TextUpdateResultSchema,
};
