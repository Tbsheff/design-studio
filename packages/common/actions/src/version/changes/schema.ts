import { Schema } from "effect";

const CHANGE_ITEM_MAX = 200;

const ChangeKindSchema = Schema.Literals(["added", "text", "style", "removed"]);

const ChangedLayerSchema = Schema.Struct({
  file: Schema.String,
  hunk: Schema.Int,
  kind: ChangeKindSchema,
  layerId: Schema.String,
  line: Schema.Int,
  tag: Schema.String,
});

const ChangedLayersSchema = Schema.Struct({
  from: Schema.String,
  isTruncated: Schema.Boolean,
  items: Schema.Array(ChangedLayerSchema).check(
    Schema.isMaxLength(CHANGE_ITEM_MAX)
  ),
  to: Schema.String,
});

const RestoredChangeSchema = Schema.Struct({
  file: Schema.String,
  kind: ChangeKindSchema,
  versionId: Schema.String,
});

type ChangeKind = typeof ChangeKindSchema.Type;

type ChangedLayer = typeof ChangedLayerSchema.Type;

type ChangedLayers = typeof ChangedLayersSchema.Type;

type RestoredChange = typeof RestoredChangeSchema.Type;

export {
  CHANGE_ITEM_MAX,
  ChangeKindSchema,
  ChangedLayerSchema,
  ChangedLayersSchema,
  RestoredChangeSchema,
};

export type { ChangeKind, ChangedLayer, ChangedLayers, RestoredChange };
