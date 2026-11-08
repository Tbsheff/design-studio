import { Schema } from "effect";

const IMAGE_MAX = 14_000_000;

const BOX_MAX = 12;

const LABEL_MAX = 80;

const MarkupImageSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(IMAGE_MAX)
).annotate({
  description:
    "The PNG of the frame with the strokes, as base64 with no data: prefix.",
});

const MarkupLabelSchema = Schema.String.check(
  Schema.isMaxLength(LABEL_MAX)
).annotate({
  description:
    "A short label for the box, such as the text of the note. Empty for a stroke with no text.",
});

const MarkupBoxSchema = Schema.Struct({
  height: Schema.Number,
  label: MarkupLabelSchema,
  width: Schema.Number,
  x: Schema.Number,
  y: Schema.Number,
}).annotate({
  description:
    "One marked area in frame pixels: x and y from the top left of the frame.",
});

const MarkupBoxesSchema = Schema.Array(MarkupBoxSchema)
  .check(Schema.isMaxLength(BOX_MAX))
  .annotate({
    description: "The marked areas of the picture, 12 at most.",
  });

const MarkupLayerSchema = Schema.Struct({
  component: Schema.NullOr(Schema.String),
  id: Schema.String,
  label: Schema.String,
  source: Schema.NullOr(Schema.String),
  tag: Schema.String,
  text: Schema.String,
});

const MarkupSchema = Schema.Struct({
  attachment: Schema.Struct({
    id: Schema.String,
    mime: Schema.String,
    name: Schema.String,
    path: Schema.String,
  }),
  layers: Schema.Array(MarkupLayerSchema),
});

export {
  MarkupBoxesSchema,
  MarkupImageSchema,
  MarkupLayerSchema,
  MarkupSchema,
};
