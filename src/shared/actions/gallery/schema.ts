import { Effect, Schema } from "effect";

const MAX_OVERRIDES = 40;

const GalleryStateSchema = Schema.Literals([
  "default",
  "hover",
  "focus",
  "disabled",
]);

const GallerySchemeSchema = Schema.Literals(["light", "dark"]);

const GallerySchemeChoiceSchema = Schema.Literals(["light", "dark", "both"]);

const GalleryPropValueSchema = Schema.Union([
  Schema.String,
  Schema.Number,
  Schema.Boolean,
]);

const GalleryPropsSchema = Schema.Record(
  Schema.String,
  GalleryPropValueSchema
).check(Schema.isMaxProperties(MAX_OVERRIDES));

const GalleryFields = {
  component: Schema.String.annotate({
    description:
      "Name of the component, from the kit or the repo inventory. List the components to see the names.",
  }),
  file: Schema.optionalKey(
    Schema.String.annotate({
      description:
        "Source file of the component. Pass it when two components share a name.",
    })
  ),
  props: Schema.optionalKey(
    GalleryPropsSchema.annotate({
      description:
        "Prop overrides applied to every cell, for example children text.",
    })
  ),
  schemes: GallerySchemeChoiceSchema.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed("both" as const))
  ),
  states: Schema.optionalKey(Schema.Array(GalleryStateSchema)),
} as const;

const GalleryInspectFields = {
  component: GalleryFields.component,
  file: GalleryFields.file,
} as const;

const GalleryCellSchema = Schema.Struct({
  column: Schema.Int,
  id: Schema.String,
  label: Schema.String,
  props: GalleryPropsSchema,
  row: Schema.Int,
  size: Schema.NullOr(Schema.String),
  state: GalleryStateSchema,
  variant: Schema.NullOr(Schema.String),
});

const GalleryFrameSchema = Schema.Struct({
  frameId: Schema.String,
  height: Schema.Int,
  label: Schema.String,
  left: Schema.Int,
  scheme: GallerySchemeSchema,
  top: Schema.Int,
  width: Schema.Int,
});

const GalleryCreatedSchema = Schema.Struct({
  cells: Schema.Array(GalleryCellSchema),
  component: Schema.String,
  frames: Schema.Array(GalleryFrameSchema),
  page: Schema.String,
});

const GalleryCellReportSchema = Schema.Struct({
  cell: GalleryCellSchema,
  contrast: Schema.NullOr(Schema.Number),
  contrastFailure: Schema.Boolean,
  error: Schema.NullOr(Schema.String),
  scheme: GallerySchemeSchema,
});

const GalleryInspectedSchema = Schema.Struct({
  cells: Schema.Array(GalleryCellReportSchema),
  component: Schema.String,
  failures: Schema.Int,
  page: Schema.String,
});

export {
  GalleryCellReportSchema,
  GalleryCellSchema,
  GalleryCreatedSchema,
  GalleryFields,
  GalleryFrameSchema,
  GalleryInspectedSchema,
  GalleryInspectFields,
  GalleryPropsSchema,
  GalleryPropValueSchema,
  GallerySchemeChoiceSchema,
  GallerySchemeSchema,
  GalleryStateSchema,
};
