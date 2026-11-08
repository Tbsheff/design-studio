import { Effect, Schema } from "effect";

const MODEL_ROWS_DEFAULT = 5;

const MODEL_ROWS_MAX = 50;

const MODEL_FIELDS_DEFAULT = 500;

const DataModelKindSchema = Schema.Literals(["model", "enum"]);

const DataModelVariantSchema = Schema.Literals(["filled", "long", "sparse"]);

const DataModelRowsSchema = Schema.Int.check(
  Schema.isBetween({ maximum: MODEL_ROWS_MAX, minimum: 1 })
).pipe(Schema.withDecodingDefaultKey(Effect.succeed(MODEL_ROWS_DEFAULT)));

const DataModelFieldLimitSchema = Schema.Int.check(
  Schema.isBetween({ maximum: MODEL_FIELDS_DEFAULT, minimum: 1 })
).pipe(Schema.withDecodingDefaultKey(Effect.succeed(MODEL_FIELDS_DEFAULT)));

const DataModelSeedSchema = Schema.Int.pipe(
  Schema.withDecodingDefaultKey(Effect.succeed(1))
);

const DataModelVariantFieldSchema = DataModelVariantSchema.pipe(
  Schema.withDecodingDefaultKey(Effect.succeed("filled" as const))
);

const DataModelQuerySchema = Schema.NullOr(Schema.String).pipe(
  Schema.withDecodingDefaultKey(Effect.succeed(null))
);

const DataModelSummarySchema = Schema.Struct({
  fieldCount: Schema.Int,
  file: Schema.String,
  kind: DataModelKindSchema,
  line: Schema.Int,
  name: Schema.String,
  relationNames: Schema.Array(Schema.String),
});

const DataModelRelationSchema = Schema.Struct({
  fields: Schema.Array(Schema.String),
  model: Schema.String,
});

const DataModelFieldSchema = Schema.Struct({
  defaultText: Schema.NullOr(Schema.String),
  enumValues: Schema.Array(Schema.String),
  isId: Schema.Boolean,
  isList: Schema.Boolean,
  isOptional: Schema.Boolean,
  isUnique: Schema.Boolean,
  name: Schema.String,
  relation: Schema.NullOr(DataModelRelationSchema),
  type: Schema.String,
});

const DataModelCellSchema = Schema.Union([
  Schema.String,
  Schema.Number,
  Schema.Boolean,
  Schema.Null,
  Schema.Array(Schema.String),
]);

const DataModelRowSchema = Schema.Record(Schema.String, DataModelCellSchema);

const DataModelDetailSchema = Schema.Struct({
  fields: Schema.Array(DataModelFieldSchema),
  file: Schema.String,
  line: Schema.Int,
  name: Schema.String,
  rows: Schema.Array(DataModelRowSchema),
  tsText: Schema.String,
});

export {
  DataModelDetailSchema,
  DataModelFieldLimitSchema,
  DataModelFieldSchema,
  DataModelKindSchema,
  DataModelQuerySchema,
  DataModelRowSchema,
  DataModelRowsSchema,
  DataModelSeedSchema,
  DataModelSummarySchema,
  DataModelVariantFieldSchema,
  DataModelVariantSchema,
};
