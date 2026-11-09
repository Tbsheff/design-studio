import { Effect, Schema } from "effect";

import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";

const NAME_MAX = 64;

const URL_MAX = 2000;

const ITEMS_MAX = 60;

const ComponentNameSchema = Schema.String.check(
  Schema.isPattern(/^[a-z0-9][a-z0-9-]{0,63}$/u)
);

const ComponentImportFields = {
  directionId: Schema.NullOr(DirectionIdSchema).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(null))
  ),
  name: ComponentNameSchema.annotate({
    description: `The registry item name in kebab-case, for example calendar. At most ${NAME_MAX} characters.`,
  }),
  projectId: ProjectIdSchema,
  registryUrl: Schema.NullOr(
    Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(URL_MAX))
  )
    .annotate({
      description:
        "A full URL of a registry item JSON. Leave out to use the shadcn registry with the style from components.json.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
} as const;

const ComponentImportedSchema = Schema.Struct({
  command: Schema.String,
  files: Schema.Array(Schema.String).check(Schema.isMaxLength(ITEMS_MAX)),
  missingDependencies: Schema.Array(Schema.String).check(
    Schema.isMaxLength(ITEMS_MAX)
  ),
  skipped: Schema.Array(Schema.String).check(Schema.isMaxLength(ITEMS_MAX)),
  versionId: Schema.String,
});

const ComponentUseSiteSchema = Schema.Struct({
  file: Schema.String,
  line: Schema.Int,
});

const ComponentUseCountSchema = Schema.Struct({
  file: Schema.String,
  importCount: Schema.Int,
  name: Schema.String,
  routeCount: Schema.Int,
  samples: Schema.Array(ComponentUseSiteSchema),
});

const ComponentUsageListFields = {
  directionId: Schema.NullOr(DirectionIdSchema)
    .annotate({
      description:
        "Direction id. Pass null for the main direction. Default null.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  isUnusedOnly: Schema.Boolean.annotate({
    description:
      "Default false. When true, list only components with 0 imports.",
  }).pipe(Schema.withDecodingDefaultKey(Effect.succeed(false))),
} as const;

const ComponentUsageTotalsFields = {
  componentCount: Schema.Int,
  unusedCount: Schema.Int,
} as const;

export {
  ComponentImportedSchema,
  ComponentImportFields,
  ComponentNameSchema,
  ComponentUsageListFields,
  ComponentUsageTotalsFields,
  ComponentUseCountSchema,
  ComponentUseSiteSchema,
};
