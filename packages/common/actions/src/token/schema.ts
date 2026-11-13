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

const TOKEN_NAME_MIN = 3;

const TOKEN_NAME_MAX = 120;

const TOKEN_VALUE_MAX = 400;

const TokenThemeSchema = Schema.Literals(["light", "dark"]);

const TokenSetFields = {
  name: Schema.Trim.check(
    Schema.isMinLength(TOKEN_NAME_MIN),
    Schema.isMaxLength(TOKEN_NAME_MAX)
  ).annotate({
    description:
      'Token CSS variable from get_tokens, for example "--primary", or its path, for example "color.primary".',
  }),
  theme: TokenThemeSchema.annotate({
    description:
      "light changes the main declaration. dark changes (or adds) the dark declaration. Default light.",
  }).pipe(Schema.withDecodingDefaultKey(Effect.succeed("light" as const))),
  value: Schema.Trim.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(TOKEN_VALUE_MAX)
  ).annotate({
    description:
      'New value, for example "#015A5D" or "var(--color-brand-teal-500)".',
  }),
} as const;

const TokenSetSchema = Schema.Struct({
  changedFiles: Schema.Array(Schema.String),
  file: Schema.String,
  line: Schema.NullOr(Schema.Int),
  resolved: Schema.NullOr(Schema.String),
  theme: TokenThemeSchema,
  token: Schema.String,
  value: Schema.NullOr(Schema.String),
  versionId: Schema.String,
});

const TokenUsageSiteSchema = Schema.Struct({
  file: Schema.String,
  line: Schema.Int,
});

const TokenUsageSchema = Schema.Struct({
  fileCount: Schema.Int,
  name: Schema.String,
  samples: Schema.Array(TokenUsageSiteSchema),
  useCount: Schema.Int,
  value: Schema.String,
});

const TokenUsageListFields = {
  isUnusedOnly: Schema.Boolean.annotate({
    description: "Default false. When true, list only tokens with 0 uses.",
  }).pipe(Schema.withDecodingDefaultKey(Effect.succeed(false))),
} as const;

const TokenUsageTotalsFields = {
  tokenCount: Schema.Int,
  unusedCount: Schema.Int,
} as const;

const TokenClassSchema = Schema.Struct({
  className: Schema.String,
  tokenName: Schema.String,
  useCount: Schema.Int,
  value: Schema.String,
});

const TokenClassListFields = {
  query: Schema.String.annotate({
    description:
      "Class prefix, for example bg- or rounded. Default empty, which lists every class.",
  }).pipe(Schema.withDecodingDefaultKey(Effect.succeed(""))),
} as const;

const TokenRenameFields = {
  name: Schema.Trim.check(
    Schema.isMinLength(TOKEN_NAME_MIN),
    Schema.isMaxLength(TOKEN_NAME_MAX)
  ).annotate({
    description:
      'Current CSS variable of the token from get_tokens, for example "--color-brand".',
  }),
  newName: Schema.Trim.check(
    Schema.isMinLength(TOKEN_NAME_MIN),
    Schema.isMaxLength(TOKEN_NAME_MAX)
  ).annotate({
    description:
      'New CSS variable, for example "--color-accent". A Tailwind theme key must keep its prefix, for example --color-.',
  }),
} as const;

const TokenRenamedSchema = Schema.Struct({
  changedFiles: Schema.Array(Schema.String),
  newName: Schema.String,
  replacedCount: Schema.Int,
  token: Schema.String,
  versionId: Schema.String,
});

const TokenDeleteFields = {
  name: Schema.Trim.check(
    Schema.isMinLength(TOKEN_NAME_MIN),
    Schema.isMaxLength(TOKEN_NAME_MAX)
  ).annotate({
    description:
      'CSS variable of the unused token from list_usage_token, for example "--color-old".',
  }),
} as const;

const TokenDeletedSchema = Schema.Struct({
  changedFiles: Schema.Array(Schema.String),
  token: Schema.String,
  versionId: Schema.String,
});

const TokenImportedSchema = Schema.Struct({
  added: Schema.Int,
  changed: Schema.Int,
  file: Schema.String,
  removed: Schema.Int,
  sourceFile: Schema.String,
  tokens: Schema.Int,
  versionId: Schema.NullOr(Schema.String),
});

export {
  TokenImportedSchema,
  TokenClassListFields,
  TokenDeleteFields,
  TokenDeletedSchema,
  TokenRenameFields,
  TokenRenamedSchema,
  TokenClassSchema,
  TokenUsageListFields,
  TokenUsageSchema,
  TokenUsageSiteSchema,
  TokenUsageTotalsFields,
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
  TokenSetFields,
  TokenSetSchema,
  TokenThemeSchema,
};
