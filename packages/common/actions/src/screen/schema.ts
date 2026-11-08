import { Effect, Schema } from "effect";

import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";

const PATH_MAX = 300;

const ITEMS_MAX = 200;

const TITLE_MAX = 80;

const ScreenPathSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(PATH_MAX)
);

const ScreenLayoutSchema = Schema.Literals(["blank", "list", "detail", "form"]);

const ScreenNameListSchema = Schema.Array(Schema.String).check(
  Schema.isMaxLength(ITEMS_MAX)
);

const LayoutGroupSchema = Schema.Struct({
  isAuthRequired: Schema.Boolean,
  layoutFile: Schema.NullOr(Schema.String),
  name: Schema.String,
  sampleRoutes: ScreenNameListSchema,
  shellComponents: ScreenNameListSchema,
});

const ScreenCreatedSchema = Schema.Struct({
  filePath: Schema.String,
  frameId: Schema.String,
  route: Schema.String,
  versionId: Schema.NullOr(Schema.String),
});

const ScreenDuplicatedSchema = Schema.Struct({
  files: ScreenNameListSchema,
  frameId: Schema.String,
  route: Schema.String,
  versionId: Schema.NullOr(Schema.String),
});

const ScreenProjectFields = { projectId: ProjectIdSchema } as const;

const ScreenDirectionField = Schema.NullOr(DirectionIdSchema)
  .annotate({
    description:
      "The direction to write in. Leave null for the main direction.",
  })
  .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null)));

const ScreenCreateFields = {
  directionId: ScreenDirectionField,
  group: Schema.NullOr(Schema.String)
    .annotate({
      description:
        "The layout group name from inspect_screen, for example (main). Leave null to use the first group.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  layout: ScreenLayoutSchema.annotate({
    description: "The body skeleton: blank, list, detail or form.",
  }).pipe(Schema.withDecodingDefaultKey(Effect.succeed("blank" as const))),
  path: ScreenPathSchema.annotate({
    description: "The new route path, for example /patients/intake.",
  }),
  title: Schema.String.check(Schema.isMaxLength(TITLE_MAX))
    .annotate({
      description: "The page heading. Leave empty to derive it from the path.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(""))),
} as const;

const ScreenDuplicateFields = {
  directionId: ScreenDirectionField,
  from: ScreenPathSchema.annotate({
    description:
      "The existing route to copy, or the page file in an HTML project.",
  }),
  path: ScreenPathSchema.annotate({
    description: "The new route path, or the new page file in an HTML project.",
  }),
} as const;

export {
  LayoutGroupSchema,
  ScreenCreateFields,
  ScreenCreatedSchema,
  ScreenDuplicateFields,
  ScreenDuplicatedSchema,
  ScreenLayoutSchema,
  ScreenNameListSchema,
  ScreenPathSchema,
  ScreenProjectFields,
};
