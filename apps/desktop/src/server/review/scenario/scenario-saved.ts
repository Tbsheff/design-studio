import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { Effect, Schema } from "effect";

import { attemptKnown } from "../../platform/attempt/index.js";
import { toJsonFileReader } from "../../platform/local-file/index.js";
import type { Structure } from "./engine/index.js";

const TransformerSchema = Schema.Literals(["none", "plain", "superjson"]);

const StringFormatSchema = Schema.Literals([
  "date",
  "datetime",
  "email",
  "id",
  "plain",
  "url",
  "uuid",
]);

const StructureSchema: Schema.Codec<Structure> = Schema.suspend(() => {
  const FieldSchema = Schema.Struct({
    key: Schema.String,
    structure: StructureSchema,
  });

  const ArraySchema = Schema.Struct({
    element: Schema.NullOr(StructureSchema),
    kind: Schema.Literal("array"),
    length: Schema.Int,
  });

  const ObjectSchema = Schema.Struct({
    fields: Schema.Array(FieldSchema),
    kind: Schema.Literal("object"),
  });

  const StringSchema = Schema.Struct({
    format: StringFormatSchema,
    kind: Schema.Literal("string"),
  });

  const ScalarSchema = Schema.Struct({
    kind: Schema.Literals(["boolean", "integer", "null", "number"]),
  });

  const RecordSchema = Schema.Struct({
    kind: Schema.Literal("record"),
    value: Schema.NullOr(StructureSchema),
  });

  return Schema.Union([
    ArraySchema,
    ObjectSchema,
    StringSchema,
    ScalarSchema,
    RecordSchema,
  ]);
});

const SavedCallSchema = Schema.Struct({
  method: Schema.String,
  path: Schema.String,
  procedure: Schema.NullOr(Schema.String),
  status: Schema.Int,
  structure: Schema.NullOr(StructureSchema),
  transformer: TransformerSchema,
});

const SavedScenariosSchema = Schema.Struct({
  calls: Schema.Array(SavedCallSchema),
  frameId: Schema.String,
  isTruncated: Schema.Boolean,
  opaqueCount: Schema.Int,
  route: Schema.String,
  seenCalls: Schema.Int,
});

type SavedScenarios = typeof SavedScenariosSchema.Type;

interface SavedKey {
  readonly directionId: string;
  readonly frameId: string;
  readonly projectId: string;
}

const toSavedPath = (dataDir: string, key: SavedKey): string =>
  path.join(
    dataDir,
    "scenarios",
    key.projectId,
    key.directionId,
    `${key.frameId}.json`
  );

const toSheetPath = (dataDir: string, key: SavedKey): string =>
  path.join(
    dataDir,
    "scenarios",
    key.projectId,
    key.directionId,
    `${key.frameId}-contact-sheet.png`
  );

const readSavedScenarios = toJsonFileReader(SavedScenariosSchema);

const createSavedScenarios = Effect.fn("createSavedScenarios")(function* run(
  file: string,
  saved: SavedScenarios
) {
  yield* attemptKnown(() => mkdir(path.dirname(file), { recursive: true }));

  const pending = `${file}.${process.pid}.tmp`;
  const text = `${JSON.stringify(saved, null, 2)}\n`;

  yield* attemptKnown(() => writeFile(pending, text));
  yield* attemptKnown(() => rename(pending, file));
});

export {
  createSavedScenarios,
  readSavedScenarios,
  SavedScenariosSchema,
  toSavedPath,
  toSheetPath,
};

export type { SavedKey, SavedScenarios };
