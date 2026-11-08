import { Effect, Schema } from "effect";

import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";

const ROUTE_MAX = 300;

const ITEMS_MAX = 200;

const FixtureIdSchema = Schema.String.check(
  Schema.isPattern(/^[a-z0-9][a-z0-9-]{0,39}$/u)
);

const FixtureShellSchema = Schema.Literals(["inherit", "root"]);

const FixtureRouteSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(ROUTE_MAX)
);

const FixtureTextMapSchema = Schema.Record(Schema.String, Schema.String);

const FixtureNameListSchema = Schema.Array(Schema.String).check(
  Schema.isMaxLength(ITEMS_MAX)
);

const FixtureSchema = Schema.Struct({
  createdAt: Schema.String,
  file: Schema.String,
  frameId: Schema.String,
  id: FixtureIdSchema,
  route: Schema.String,
  sourceRoute: Schema.String,
});

const FixtureCreatedSchema = Schema.Struct({
  file: Schema.String,
  fixtureId: FixtureIdSchema,
  frameId: Schema.String,
  removed: FixtureNameListSchema,
  route: Schema.String,
  unresolved: FixtureNameListSchema,
  versionId: Schema.NullOr(Schema.String),
});

const FixtureDeletedSchema = Schema.Struct({
  file: Schema.String,
  fixtureId: FixtureIdSchema,
  frameId: Schema.String,
});

const FixtureCreateFields = {
  directionId: Schema.NullOr(DirectionIdSchema)
    .annotate({
      description:
        "The direction to write in. Leave null for the main direction.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  params: FixtureTextMapSchema.annotate({
    description:
      "A value for each route param, for example { slug: 'acme' } for /orgs/[slug]/patients.",
  }).pipe(Schema.withDecodingDefaultKey(Effect.succeed({}))),
  route: FixtureRouteSchema.annotate({
    description:
      "The app route of the server-data page, for example /organizations/[slug]/patients.",
  }),
  searchParams: FixtureTextMapSchema.annotate({
    description: "Query string values that the page reads. Default none.",
  }).pipe(Schema.withDecodingDefaultKey(Effect.succeed({}))),
  shell: FixtureShellSchema.annotate({
    description:
      "inherit puts the fixture in the layout group of the source route. root puts it under the root layout only. Default inherit.",
  }).pipe(Schema.withDecodingDefaultKey(Effect.succeed("inherit" as const))),
} as const;

const FixtureIdFields = { fixtureId: FixtureIdSchema } as const;

const FixtureProjectFields = { projectId: ProjectIdSchema } as const;

export {
  FixtureCreateFields,
  FixtureCreatedSchema,
  FixtureDeletedSchema,
  FixtureIdFields,
  FixtureIdSchema,
  FixtureNameListSchema,
  FixtureProjectFields,
  FixtureRouteSchema,
  FixtureSchema,
  FixtureShellSchema,
  FixtureTextMapSchema,
};
