import { Schema } from "effect";

const MAX_SELECT = 2000;

const TokenKindSchema = Schema.Literals(["color", "spacing", "radius", "font"]);

const TokenLayerSchema = Schema.Struct({
  col: Schema.Int,
  file: Schema.String,
  line: Schema.Int,
});

const TokenApplyFields = {
  dryRun: Schema.optionalKey(
    Schema.Boolean.annotate({
      description:
        "Default true. When true, list the changes and write nothing. Pass false to write.",
    })
  ),
  kinds: Schema.optionalKey(Schema.Array(TokenKindSchema)),
  layer: Schema.optionalKey(TokenLayerSchema),
  page: Schema.optionalKey(
    Schema.String.annotate({
      description:
        "Source file of one page, relative to the project. Leave out to sweep every source file.",
    })
  ),
  select: Schema.optionalKey(
    Schema.Array(Schema.String).check(Schema.isMaxLength(MAX_SELECT))
  ),
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
