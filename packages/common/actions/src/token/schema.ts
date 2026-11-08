import { Effect, Schema } from "effect";

import { DirectionIdSchema } from "../_core/ids.js";

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

const MAX_GROUPS = 100;

const TokenExportFormatSchema = Schema.Literals([
  "dtcg",
  "figma",
  "tailwind",
  "css",
]);

const TokenExportModesSchema = Schema.Literals(["light-dark", "light", "dark"]);

const TokenExportFields = {
  directionId: Schema.NullOr(DirectionIdSchema)
    .annotate({
      description: "Direction id. Pass null for the main direction.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  format: TokenExportFormatSchema.annotate({
    description:
      "dtcg for W3C DTCG JSON, figma for Figma Variables JSON, tailwind for a v4 theme block, css for custom properties.",
  }),
  groups: Schema.NullOr(
    Schema.Array(Schema.String).check(Schema.isMaxLength(MAX_GROUPS))
  )
    .annotate({
      description: "Token group names to export. Pass null for all groups.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  modes: TokenExportModesSchema.annotate({
    description: "light-dark (default), light or dark.",
  }).pipe(Schema.withDecodingDefaultKey(Effect.succeed("light-dark" as const))),
} as const;

const TokenSkippedSchema = Schema.Struct({
  name: Schema.String,
  reason: Schema.String,
});

const TokenExportedSchema = Schema.Struct({
  aliasCount: Schema.Int,
  fileName: Schema.String,
  format: TokenExportFormatSchema,
  skipped: Schema.Array(TokenSkippedSchema),
  text: Schema.String,
  tokenCount: Schema.Int,
});

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
  TokenExportFields,
  TokenExportFormatSchema,
  TokenExportModesSchema,
  TokenExportedSchema,
  TokenSkippedSchema,
  TokenAppliedSchema,
  TokenChangeSchema,
  TokenKindSchema,
  TokenLayerSchema,
  TokenLeftoverSchema,
};
