import { Effect, Schema } from "effect";

const MAX_SELECT = 2000;

const TokenKindSchema = Schema.Literals(["color", "spacing", "radius", "font"]);

const TokenLayerSchema = Schema.Struct({
  col: Schema.Int,
  file: Schema.String,
  line: Schema.Int,
});

const TokenApplyFields = {
  dryRun: Schema.Boolean.annotate({
    description:
      "Default true. When true, list the changes and write nothing. Pass false to write.",
  }).pipe(Schema.withDecodingDefaultKey(Effect.succeed(true))),
  kinds: Schema.Array(TokenKindSchema).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed([]))
  ),
  layer: Schema.NullOr(TokenLayerSchema).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(null))
  ),
  page: Schema.NullOr(Schema.String)
    .annotate({
      description:
        "Source file of one page, relative to the project. Leave out to sweep every source file.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  select: Schema.NullOr(
    Schema.Array(Schema.String).check(Schema.isMaxLength(MAX_SELECT))
  ).pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
} as const;

const TokenChangeSchema = Schema.Struct({
  after: Schema.String,
  before: Schema.String,
  distance: Schema.Number,
  exact: Schema.Boolean,
  file: Schema.String,
  id: Schema.String,
  kind: TokenKindSchema,
  line: Schema.Int,
  token: Schema.String,
});

const TokenLeftoverSchema = Schema.Struct({
  file: Schema.String,
  kind: TokenKindSchema,
  line: Schema.Int,
  nearest: Schema.NullOr(Schema.String),
  value: Schema.String,
});

const TokenAppliedSchema = Schema.Struct({
  applied: Schema.Int,
  changes: Schema.Array(TokenChangeSchema),
  dryRun: Schema.Boolean,
  files: Schema.Array(Schema.String),
  unmatched: Schema.Array(TokenLeftoverSchema),
  versionId: Schema.NullOr(Schema.String),
});

export {
  TokenApplyFields,
  TokenAppliedSchema,
  TokenChangeSchema,
  TokenKindSchema,
  TokenLayerSchema,
  TokenLeftoverSchema,
};
