import { Effect, Schema } from "effect";

const LAYER_RENAME_MAX = 50;

const LAYER_NAME_MAX = 80;

const LayerNameSchema = Schema.String.check(Schema.isMaxLength(LAYER_NAME_MAX));

const LayerRenameEntrySchema = Schema.Struct({
  name: Schema.NullOr(LayerNameSchema).annotate({
    description:
      'New layer name, written as data-name. null or "" removes the name. 80 chars max.',
  }),
  selector: Schema.String.check(Schema.isMinLength(1)).annotate({
    description:
      "Layer id from get_layers, a CSS selector of one element, or a source location file:line:col.",
  }),
});

const LayerRenameFields = {
  layers: Schema.Array(LayerRenameEntrySchema)
    .check(Schema.isMinLength(1), Schema.isMaxLength(LAYER_RENAME_MAX))
    .annotate({
      description:
        "1 to 50 layers to rename, each with its new name. All names are saved as one version.",
    }),
  path: Schema.String.annotate({
    description:
      "Page path relative to the project root. Leave out for the entry page.",
  }).pipe(Schema.withDecodingDefaultKey(Effect.succeed(""))),
} as const;

const LayerRenameSkipSchema = Schema.Struct({
  reason: Schema.String,
  selector: Schema.String,
});

const LayerRenameResultSchema = Schema.Struct({
  renamed: Schema.Int,
  skipped: Schema.Array(LayerRenameSkipSchema),
  versionId: Schema.NullOr(Schema.String),
});

type LayerRenameEntry = typeof LayerRenameEntrySchema.Type;

type LayerRenameSkip = typeof LayerRenameSkipSchema.Type;

type LayerRenameResult = typeof LayerRenameResultSchema.Type;

export {
  LAYER_NAME_MAX,
  LAYER_RENAME_MAX,
  LayerRenameEntrySchema,
  LayerRenameFields,
  LayerRenameResultSchema,
  LayerRenameSkipSchema,
};

export type { LayerRenameEntry, LayerRenameResult, LayerRenameSkip };
