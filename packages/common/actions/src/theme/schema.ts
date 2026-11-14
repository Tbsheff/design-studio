import { Effect, Schema } from "effect";

const BRIEF_MAX = 400;

const SEED_MAX = 2_147_483_646;

const COUNT_MAX = 8;

const COUNT_DEFAULT = 4;

const NAME_MAX = 80;

const ThemeIdSchema = Schema.String.check(
  Schema.isPattern(/^[a-z0-9][a-z0-9-]{0,63}$/u)
);

const ThemeRoleSchema = Schema.Literals([
  "accent",
  "accentFg",
  "bg",
  "border",
  "fg",
  "fgMuted",
  "primary",
  "primaryFg",
  "ring",
  "surface",
]);

const ThemeChangeRoleSchema = Schema.Literals([
  ...ThemeRoleSchema.literals,
  "body",
  "display",
  "radius",
]);

const ThemeChangeSchema = Schema.Struct({
  darkValue: Schema.NullOr(Schema.String),
  path: Schema.String,
  role: ThemeChangeRoleSchema,
  value: Schema.String,
});

const ThemeContrastSchema = Schema.Struct({
  minimum: Schema.Number,
  mode: Schema.Literals(["light", "dark"]),
  ratio: Schema.Number,
  surface: ThemeRoleSchema,
  text: ThemeRoleSchema,
});

const ThemeSourceSchema = Schema.Struct({
  kind: Schema.Literals(["image", "url"]),
  value: Schema.String,
});

const ThemeStoredSourceSchema = Schema.NullOr(ThemeSourceSchema)
  .annotate({
    description:
      "Site URL or image path the theme was read from. Null for themes built by theme.create.",
  })
  .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null)));

const ThemeBodySchema = Schema.Struct({
  changes: Schema.Array(ThemeChangeSchema),
  contrast: Schema.Array(ThemeContrastSchema),
  fontLink: Schema.NullOr(Schema.String).annotate({
    description:
      "Google Fonts stylesheet URL for the theme fonts. Null when the theme uses system fonts or fonts the project has.",
  }),
  id: ThemeIdSchema,
  name: Schema.String.check(Schema.isMaxLength(NAME_MAX)),
  seed: Schema.Int,
  source: ThemeStoredSourceSchema,
  tokenFile: Schema.String.annotate({
    description: "Token file that theme.apply writes for this project.",
  }),
});

const ThemeSchema = Schema.Struct({
  ...ThemeBodySchema.fields,
  isActive: Schema.Boolean,
});

const ThemeFileSchema = Schema.Struct({
  activeId: Schema.NullOr(ThemeIdSchema),
  candidates: Schema.Array(ThemeBodySchema),
});

const ThemeCreateFields = {
  brief: Schema.NullOr(
    Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(BRIEF_MAX))
  )
    .annotate({
      description:
        "Short text such as warm editorial or fresh green tech. Sets hue and type mood. Leave out to use the project tokens.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  count: Schema.Int.check(Schema.isBetween({ maximum: COUNT_MAX, minimum: 1 }))
    .annotate({ description: "How many candidates to build, 1 to 8." })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(COUNT_DEFAULT))),
  seed: Schema.NullOr(
    Schema.Int.check(Schema.isBetween({ maximum: SEED_MAX, minimum: 0 }))
  )
    .annotate({
      description:
        "Same seed, brief and tokens give the same candidates. Leave out for a new set each time.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
} as const;

const ThemeCreatedSchema = Schema.Struct({
  candidates: Schema.Array(ThemeSchema),
  seed: Schema.Int,
  tokenFile: Schema.String,
});

const ThemeImportFields = {
  imagePath: Schema.NullOr(Schema.String.check(Schema.isMinLength(1))).annotate(
    {
      description:
        "Absolute PNG path, or the path of a project attachment from create_attachment. Give this or url, not both.",
    }
  ),
  name: Schema.NullOr(
    Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(NAME_MAX))
  ).annotate({
    description:
      "Name for the candidate. Leave null to name it from the source.",
  }),
  url: Schema.NullOr(Schema.String.check(Schema.isMinLength(1))).annotate({
    description:
      "http or https page to read colors, fonts and radius from. Give this or imagePath, not both.",
  }),
} as const;

const ThemeSwatchSchema = Schema.Struct({
  hex: Schema.String,
  share: Schema.Number,
});

const ThemeExtractedSchema = Schema.Struct({
  colors: Schema.Array(ThemeSwatchSchema),
  fonts: Schema.Array(Schema.String),
  radius: Schema.NullOr(Schema.String),
});

const ThemeImportedSchema = Schema.Struct({
  candidates: Schema.Array(ThemeSchema),
  extracted: ThemeExtractedSchema,
  source: ThemeSourceSchema,
  tokenFile: Schema.String,
});

const ThemeSetResultSchema = Schema.Struct({
  activeThemeId: Schema.NullOr(ThemeIdSchema),
  changes: Schema.Array(ThemeChangeSchema),
  name: Schema.NullOr(Schema.String),
});

const ThemeAppliedSchema = Schema.Struct({
  applied: Schema.Int,
  name: Schema.String,
  themeId: ThemeIdSchema,
  title: Schema.String,
  tokenFile: Schema.String,
  versionId: Schema.String,
});

export {
  ThemeAppliedSchema,
  ThemeBodySchema,
  ThemeChangeRoleSchema,
  ThemeChangeSchema,
  ThemeContrastSchema,
  ThemeCreateFields,
  ThemeCreatedSchema,
  ThemeExtractedSchema,
  ThemeFileSchema,
  ThemeIdSchema,
  ThemeImportFields,
  ThemeImportedSchema,
  ThemeRoleSchema,
  ThemeSchema,
  ThemeSetResultSchema,
  ThemeSourceSchema,
  ThemeSwatchSchema,
};
