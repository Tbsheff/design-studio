import { Schema } from "effect";

const NOTE_TEXT_MAX = 2000;

const DEV_NOTE_KINDS = [
  "spec",
  "behavior",
  "content",
  "accessibility",
] as const;

const DevNoteKindSchema = Schema.Literals(DEV_NOTE_KINDS).annotate({
  description: "The note kind: spec, behavior, content or accessibility.",
});

const DevNoteTextSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(NOTE_TEXT_MAX)
).annotate({
  description: "The note text, 1 to 2000 chars.",
});

const DevNoteIdSchema = Schema.String.check(
  Schema.isPattern(/^[\w-]{1,64}$/u)
).annotate({
  description: "The dev note id from list_dev_note.",
});

const LayerFieldSchema = Schema.NullOr(Schema.String).annotate({
  description: "The layer id from get_layers, or null to note the whole frame.",
});

const TargetSourceFieldSchema = Schema.NullOr(Schema.String).annotate({
  description:
    "The layer source as file:line, or null to read it from the page.",
});

const MeasuredFieldSchema = Schema.Boolean.annotate({
  description:
    "True to capture the computed box, padding, gap, radius, font and colors of the layer, with token names.",
});

const FrameFilterFieldSchema = Schema.NullOr(Schema.String).annotate({
  description: "Return only the notes of this frame, or null for all frames.",
});

const MeasuredValueSchema = Schema.Struct({
  token: Schema.NullOr(Schema.String),
  value: Schema.String,
});

const MeasuredBoxSchema = Schema.Struct({
  height: Schema.Number,
  width: Schema.Number,
  x: Schema.Number,
  y: Schema.Number,
});

const MeasuredPaddingSchema = Schema.Struct({
  bottom: MeasuredValueSchema,
  left: MeasuredValueSchema,
  right: MeasuredValueSchema,
  top: MeasuredValueSchema,
});

const MeasuredFontSchema = Schema.Struct({
  family: Schema.String,
  lineHeight: Schema.String,
  size: MeasuredValueSchema,
  weight: Schema.String,
});

const MeasurementsSchema = Schema.Struct({
  background: MeasuredValueSchema,
  box: MeasuredBoxSchema,
  color: MeasuredValueSchema,
  font: MeasuredFontSchema,
  gap: MeasuredValueSchema,
  measuredAt: Schema.Number,
  padding: MeasuredPaddingSchema,
  radius: MeasuredValueSchema,
});

const DevNoteSchema = Schema.Struct({
  createdAt: Schema.Number,
  frameId: Schema.String,
  id: Schema.String,
  kind: DevNoteKindSchema,
  layerId: Schema.NullOr(Schema.String),
  measurements: Schema.NullOr(MeasurementsSchema),
  number: Schema.Number,
  source: Schema.NullOr(Schema.String),
  text: Schema.String,
  updatedAt: Schema.Number,
});

const DevNoteFileSchema = Schema.Struct({
  nextNumber: Schema.Number,
  notes: Schema.Array(DevNoteSchema),
});

const DevNoteRemovedSchema = Schema.Struct({
  id: Schema.String,
  text: Schema.String,
});

export {
  DEV_NOTE_KINDS,
  DevNoteFileSchema,
  DevNoteIdSchema,
  DevNoteKindSchema,
  DevNoteRemovedSchema,
  DevNoteSchema,
  DevNoteTextSchema,
  FrameFilterFieldSchema,
  LayerFieldSchema,
  MeasuredFieldSchema,
  MeasurementsSchema,
  TargetSourceFieldSchema,
};
